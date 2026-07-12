// ============================================================
// PULSO · Edge Function "chef" — proxy seguro hacia la API de Claude.
//
// La clave de la API vive aquí (secret ANTHROPIC_API_KEY), nunca en el
// navegador. Flujo por petición:
//   1. Valida el JWT de Supabase (solo usuarios con sesión).
//   2. Consume un uso de la cuota diaria vía consumir_uso_chef()
//      (el límite vive en la base de datos, no se puede saltar).
//   3. Llama a Claude (Haiku, el modelo económico) con streaming y
//      devuelve el SSE tal cual al navegador (proxy pasante).
//
// Despliegue:  supabase functions deploy chef
// Secret:      supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELO = "claude-haiku-4-5"; // el más barato: ~0,4 céntimos por consulta
const LIMITE_DIARIO = 10;
const MAX_TOKENS_RESPUESTA = 700;
const MAX_MENSAJES = 12; // solo se envía la cola reciente de la conversación
const MAX_CHARS_MENSAJE = 1200;
const MAX_CHARS_CONTEXTO = 9000;

// La seguridad real la da el JWT obligatorio; el CORS abierto permite
// desarrollar en localhost sin tocar la función.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });

// Persona y límites del asistente. Vive en el servidor: el cliente solo
// aporta su pregunta y su contexto (dieta, alergias, catálogo compacto).
const construirSystem = (contexto: string) => `Eres "Chef PULSO", el asistente de cocina de la app de nutrición PULSO. Respondes SIEMPRE en español.

Reglas:
- Solo hablas de cocina, recetas, ingredientes, técnicas culinarias, sustituciones y nutrición práctica del día a día. Si te preguntan por cualquier otro tema, redirige con simpatía a la cocina en una sola frase.
- Sé breve y útil: respuestas de unas 120 palabras como máximo, salvo cuando te pidan una receta paso a paso (entonces usa una lista numerada corta).
- No das consejo médico ni pautas clínicas. Ante dudas de salud, recomienda consultar a un profesional.
- Con alergias e intolerancias sé prudente: nunca garantices que un plato o producto es seguro; recuerda verificar etiquetas o preguntar en el restaurante.
- Cuando encaje, recomienda recetas del catálogo de PULSO por su nombre y adáptalas a las preferencias del usuario.
- Si el usuario tiene plan, respeta su dieta, alergias y objetivo al sugerir.

${contexto ? `Contexto del usuario y catálogo de PULSO:\n${contexto}` : "El usuario no ha compartido contexto."}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });

  const claveApi = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claveApi) return json(500, { error: "El chef no está configurado todavía (falta ANTHROPIC_API_KEY)." });

  // 1. Solo usuarios con sesión: el cliente de Supabase hereda el JWT de la
  //    petición, y consumir_uso_chef() usa ese mismo auth.uid().
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json(401, { error: "Inicia sesión para hablar con el chef." });

  // 2. Cuota diaria (atómica, en la base de datos).
  const { data: restantes, error: errorCuota } = await supabase.rpc("consumir_uso_chef", { limite: LIMITE_DIARIO });
  if (errorCuota) return json(500, { error: "No se ha podido comprobar tu cuota. Inténtalo de nuevo." });
  if (restantes < 0) return json(429, { error: `Has agotado tus ${LIMITE_DIARIO} consultas de hoy. Mañana el chef te espera de nuevo.` });

  // 3. Sanea la entrada: cola reciente, tamaños acotados, roles válidos.
  let cuerpo: { mensajes?: { rol?: string; texto?: string }[]; contexto?: string };
  try { cuerpo = await req.json(); } catch { return json(400, { error: "Petición inválida." }); }

  const mensajes = (cuerpo.mensajes ?? [])
    .filter((m) => (m.rol === "usuario" || m.rol === "chef") && typeof m.texto === "string" && m.texto.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({
      role: m.rol === "usuario" ? "user" : "assistant",
      content: m.texto!.slice(0, MAX_CHARS_MENSAJE),
    }));
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  if (!mensajes.length) return json(400, { error: "Escribe una pregunta para el chef." });

  const contexto = typeof cuerpo.contexto === "string" ? cuerpo.contexto.slice(0, MAX_CHARS_CONTEXTO) : "";

  // 4. Llama a Claude con streaming y devuelve el SSE tal cual (proxy
  //    pasante: no reconstruimos los eventos, solo los reenviamos).
  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claveApi,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: MAX_TOKENS_RESPUESTA,
      stream: true,
      system: construirSystem(contexto),
      messages: mensajes,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    console.error("Error de la API de Claude:", respuesta.status, detalle);
    return json(502, { error: "El chef está fuera de la cocina un momento. Inténtalo de nuevo en unos segundos." });
  }

  return new Response(respuesta.body, {
    headers: {
      ...CORS,
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-usos-restantes": String(restantes),
      "Access-Control-Expose-Headers": "x-usos-restantes",
    },
  });
});
