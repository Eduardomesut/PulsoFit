import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback, createContext, useContext } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "./auth";
import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

gsap.registerPlugin(ScrollTrigger);
// ¿El usuario pide menos movimiento? Entonces ni scroll suave ni animaciones.
const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Arranca el scroll con inercia (Lenis) y lo sincroniza con GSAP ScrollTrigger:
   el ticker de GSAP alimenta el rAF de Lenis y cada scroll refresca los
   triggers. Se salta por completo si el usuario prefiere menos movimiento. */
function useScrollSuave() {
  useEffect(() => {
    if (REDUCE) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(ticker); lenis.destroy(); };
  }, []);
}

/* Escucha el aviso de instalación de la PWA (Android/desktop; Safari/iOS no
   lo dispara nunca, ahí la instalación es manual vía "Compartir → Añadir a
   pantalla de inicio"). Guarda el evento para poder relanzarlo al pulsar el
   botón — el navegador solo lo entrega una vez y hay que quedárselo. */
function useInstalarPWA() {
  const aviso = useRef<any>(null);
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    const alDisponible = (e) => { e.preventDefault(); aviso.current = e; setDisponible(true); };
    const alInstalar = () => { aviso.current = null; setDisponible(false); };
    window.addEventListener("beforeinstallprompt", alDisponible);
    window.addEventListener("appinstalled", alInstalar);
    return () => { window.removeEventListener("beforeinstallprompt", alDisponible); window.removeEventListener("appinstalled", alInstalar); };
  }, []);
  const instalar = async () => {
    if (!aviso.current) return;
    aviso.current.prompt();
    await aviso.current.userChoice;
    aviso.current = null;
    setDisponible(false);
  };
  return { disponible, instalar };
}
import {
  U, youtubeUrl, normalizar, FOODIMG, TIPOS_DIETA, ALERGENOS, ALIMENTOS,
  RECETAS, RECETAS_CINE, RECETAS_ACTUALIDAD, REPARTO, buildDiet, calcularMetricas, OBJETIVOS, migrarDatos, indiceDiaHoy,
  INGREDIENTES_WEB, CATEGORIAS_RECETA, validarRecetaComunidad, puedeBorrarReceta,
  resumenCatalogo, resumenUsuario,
  normalizarUsuario, validarUsuario, MENSAJE_SOLICITUD, recetaSnapshot,
} from "./logica";

/* ============================================================
   PULSO — Web de nutrición personalizada, estilo editorial
   cinematográfico: banners a pantalla completa con foto real,
   tipografía grande, foto por objetivo y por receta, y cada
   plato con ingredientes y modo de elaboración paso a paso.
   Imágenes: Unsplash (fuente libre) vía URL directa.
   ============================================================ */

/* Paleta retro de food-truck (inspirada en pizza-amici.nl): crema de fondo,
   azul marino como tinta principal (texto Y bordes, siempre visibles),
   mostaza para las acciones, celeste para paneles destacados y rojo tomate
   como acento. Sombras duras desplazadas, nada de difuminados. */
const C = {
  bg: "#F2EDE9", panel: "#FFFFFF", panel2: "#C9DFF0",
  line: "#0F2C56", text: "#0F2C56", dim: "#54657E",
  hot1: "#D6453D", hot2: "#E8A21C",
  suave: "#E1D8CE", // pistas y barras de progreso vacías sobre crema
};
const grad = { backgroundImage: "none", background: C.hot2 };
const gradText = { color: C.hot1 };
const DF = { fontFamily: "'Anton', 'Arial Narrow', sans-serif", letterSpacing: "0.015em", textTransform: "uppercase" as const };
// Tipografías de apoyo: mono para el cuerpo, serif cursiva para acentos.
const MONO = "'Azeret Mono', ui-monospace, 'Courier New', monospace";
const SERIF = { fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" as const };
// Imagen de reserva (colores de marca) si alguna foto no carga: evita el icono de "imagen rota".
const FALLBACK_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='#F2EDE9'/><circle cx='200' cy='210' r='78' fill='#E8A21C' opacity='0.5'/><circle cx='200' cy='210' r='40' fill='#D6453D' opacity='0.55'/></svg>`)}`;
const onImgError = (e) => { const t = e.currentTarget; if (t.src !== FALLBACK_IMG) t.src = FALLBACK_IMG; };

/* Botones de acción principales, estilo pegatina retro: rectángulo con borde
   marino grueso y sombra dura desplazada. El primario es mostaza; el
   secundario, blanco. Al pasar el ratón se "levantan" (la sombra crece) y al
   pulsarlos se "aplastan" contra la página (clases .btn-cta y button:active). */
const btnBase = { border: `2px solid ${C.line}`, borderRadius: 12, fontWeight: 600, fontSize: 13, letterSpacing: "0.09em", textTransform: "uppercase" as const, fontFamily: MONO, padding: "13px 26px", minWidth: "min(220px, 100%)", boxShadow: `4px 4px 0 ${C.line}`, transition: "transform .16s ease, box-shadow .16s ease, background .16s ease" };
const btnPrimario = { ...btnBase, background: C.hot2, color: C.text };
const btnSecundario = { ...btnBase, background: "#FFFFFF", color: C.text };

const HERO_IMG = U("1504674900247-0877df9cc836");
const BANNER_DIETA = U("1490645935967-10de6ba17061");
const BANNER_CINE = U("1489599849927-2ee91cede3ba"); // butacas de cine; si falla, onImgError pone el degradado de marca
const BANNER_ACTUALIDAD = U("1495020689067-958852a7765e"); // periódicos, cabecera de la sección de actualidad
const BANNER_RECETARIO = U("1466637574441-749b8f19452f"); // mesa con ingredientes, cabecera del recetario
const BANNER_RESTAURANTES = U("1517248135467-4c7edcad34c4"); // interior de restaurante, cabecera de la sección de restaurantes
const BANNER_FAVORITOS = U("1490474418585-ba9bad8fd0ea"); // frutas en corazón, cabecera de la sección de favoritos
const BANNER_CHEF = U("1556910103-1c02745aae4d"); // manos cocinando, cabecera del Chef IA
const BANNER_AMIGOS = U("1543269865-cbf427effbad"); // amigos brindando, cabecera de la sección de amigos

/* Enlace "Mi rutina" del menú: App lo rellena cuando hay sesión iniciada y un
   plan que enseñar (el de la sesión actual o el guardado en Supabase); null lo
   oculta. Va por contexto para que la cabecera lo lea desde cualquier pantalla
   sin arrastrar la prop por todas. */
const RutinaCtx = createContext<null | (() => void)>(null);

/* Favoritos del usuario: ids de receta guardados en la tabla `favoritos`.
   App lo rellena solo con sesión iniciada; null (invitado o sin Supabase)
   oculta los corazones de las fichas y el enlace del menú. Va por contexto
   para que cualquier FichaReceta lo lea sin arrastrar props. */
const FavoritosCtx = createContext<null | { ids: string[]; alternar: (id: string) => void }>(null);

/* Estado social del usuario (amigos, solicitudes, chat). App lo rellena con
   useSocialProvider solo con sesión iniciada y Supabase configurado; null
   (invitado o sin Supabase) oculta la sección de amigos, el badge de
   notificaciones y el botón de compartir de las fichas. Va por contexto para
   que la cabecera y cualquier FichaReceta lo lean sin arrastrar props. */
type Amigo = { amistad_id: string; id: string; usuario: string; nombre: string; creado_en?: string };
type SocialValor = {
  usuario: string | null;
  amigos: Amigo[];
  recibidas: Amigo[];
  enviadas: Amigo[];
  noLeidos: Record<string, number>;
  novedades: number;
  refrescar: () => void;
  guardarUsuario: (u: string) => Promise<{ error: string | null }>;
  enviarSolicitud: (handle: string) => Promise<string>;
  responderSolicitud: (amistadId: string, aceptar: boolean) => Promise<void>;
  eliminarAmigo: (amistadId: string) => Promise<void>;
  enviarMensaje: (receptorId: string, contenido: { texto?: string; receta?: any }) => Promise<{ error: any; data: any }>;
  marcarLeidos: (amigoId: string) => Promise<void>;
};
const SocialCtx = createContext<null | SocialValor>(null);

/* Toda la lógica social vive aquí: carga el estado (RPC estado_social), el
   handle del usuario y los mensajes sin leer, y se mantiene al día con una
   suscripción realtime a `mensajes` y `amistades`. Devuelve null si no hay
   sesión o Supabase, para que el contexto quede desactivado. */
function useSocialProvider(user): SocialValor | null {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [recibidas, setRecibidas] = useState<Amigo[]>([]);
  const [enviadas, setEnviadas] = useState<Amigo[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});

  const cargarEstado = React.useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.rpc("estado_social");
    if (data) {
      setAmigos(data.amigos ?? []);
      setRecibidas(data.recibidas ?? []);
      setEnviadas(data.enviadas ?? []);
    }
  }, [user]);

  const cargarNoLeidos = React.useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("mensajes").select("emisor").eq("receptor", user.id).eq("leido", false);
    const conteo: Record<string, number> = {};
    for (const m of data ?? []) conteo[m.emisor] = (conteo[m.emisor] ?? 0) + 1;
    setNoLeidos(conteo);
  }, [user]);

  // Carga inicial: perfil (handle), estado social y mensajes sin leer.
  useEffect(() => {
    if (!supabase || !user) { setUsuario(null); setAmigos([]); setRecibidas([]); setEnviadas([]); setNoLeidos({}); return; }
    supabase.from("perfiles").select("usuario").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsuario(data?.usuario ?? null));
    cargarEstado();
    cargarNoLeidos();
  }, [user, cargarEstado, cargarNoLeidos]);

  // Realtime: cualquier mensaje o amistad que me afecte refresca lo pertinente.
  // La RLS del cliente ya limita los eventos a filas que puedo ver; el refetch
  // vuelve a leer con las políticas normales, así que es seguro en cualquier caso.
  useEffect(() => {
    if (!supabase || !user) return;
    const canal = supabase.channel(`social:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: `receptor=eq.${user.id}` }, () => cargarNoLeidos())
      .on("postgres_changes", { event: "*", schema: "public", table: "amistades" }, () => cargarEstado())
      .subscribe();
    return () => { supabase!.removeChannel(canal); };
  }, [user, cargarEstado, cargarNoLeidos]);

  if (!supabase || !user) return null;
  const uid = user.id;
  const novedades = recibidas.length + Object.values(noLeidos).reduce((a, b) => a + b, 0);

  return {
    usuario, amigos, recibidas, enviadas, noLeidos, novedades,
    refrescar: () => { cargarEstado(); cargarNoLeidos(); },
    guardarUsuario: async (u) => {
      const limpio = normalizarUsuario(u);
      const err = validarUsuario(limpio);
      if (err) return { error: err };
      const { error } = await supabase!.from("perfiles").update({ usuario: limpio }).eq("id", uid);
      if (error) {
        // 23505 = índice único: el handle ya está cogido por otra persona.
        if ((error as any).code === "23505") return { error: "Ese nombre de usuario ya está cogido. Prueba con otro." };
        return { error: "No se pudo guardar el usuario. Inténtalo de nuevo." };
      }
      setUsuario(limpio);
      return { error: null };
    },
    enviarSolicitud: async (handle) => {
      const { data, error } = await supabase!.rpc("enviar_solicitud", { destino: normalizarUsuario(handle) });
      if (error) return "error";
      await cargarEstado();
      return (data as string) ?? "error";
    },
    responderSolicitud: async (amistadId, aceptar) => {
      if (aceptar) await supabase!.from("amistades").update({ estado: "aceptada" }).eq("id", amistadId);
      else await supabase!.from("amistades").delete().eq("id", amistadId);
      await cargarEstado();
    },
    eliminarAmigo: async (amistadId) => {
      await supabase!.from("amistades").delete().eq("id", amistadId);
      await cargarEstado();
    },
    enviarMensaje: async (receptorId, contenido) => {
      const fila = { emisor: uid, receptor: receptorId, texto: contenido.texto ?? null, receta: contenido.receta ?? null };
      return await supabase!.from("mensajes").insert(fila).select().single();
    },
    marcarLeidos: async (amigoId) => {
      await supabase!.from("mensajes").update({ leido: true }).eq("receptor", uid).eq("emisor", amigoId).eq("leido", false);
      setNoLeidos((m) => { const n = { ...m }; delete n[amigoId]; return n; });
    },
  };
}

export default function App() {
  const [fase, setFase] = useState("hero");
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ objetivo: null, sexo: null, edad: 28, peso: 75, altura: 172, tipoDieta: "omnivora", alergias: [], noGusta: [], comidasDia: 5 });
  const [authAbierto, setAuthAbierto] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(null);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
  useScrollSuave();
  const { user } = useAuth();
  // Fase actual accesible dentro de callbacks asíncronos sin cerrar sobre un valor obsoleto.
  const faseRef = useRef(fase);
  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { window.scrollTo(0, 0); }, [fase, paso]);

  // Al iniciar sesión (o restaurar la sesión al recargar), recupera el último plan
  // guardado del usuario (migrándolo si es antiguo). Si ya tiene un plan y sigue en
  // la portada, lo lleva directo a él en vez de repetir el cuestionario; solo vuelve
  // a la portada cuando el usuario pulsa "Empezar de nuevo".
  useEffect(() => {
    if (!supabase || !user) { setPlanGuardado(null); return; }
    supabase.from("planes").select("datos").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const migrado = migrarDatos(data?.datos ?? null);
        const plan = migrado && migrado.objetivo ? migrado : null;
        setPlanGuardado(plan);
        if (plan && faseRef.current === "hero") { setDatos(plan); setFase("plan"); }
      });
  }, [user]);

  const retomarPlan = () => { if (planGuardado) { setDatos(planGuardado); setFase("plan"); } };

  // Favoritos del usuario (ids de receta). Se cargan al iniciar sesión y se
  // actualizan en optimista: la interfaz cambia al momento y, si Supabase
  // falla, se revierte. Sin sesión el contexto queda a null.
  const [favoritos, setFavoritos] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase || !user) { setFavoritos([]); return; }
    supabase.from("favoritos").select("receta_id").eq("user_id", user.id)
      .then(({ data }) => setFavoritos((data ?? []).map((f) => f.receta_id)));
  }, [user]);
  const ctxFavoritos = useMemo(() => {
    if (!supabase || !user) return null;
    const sb = supabase, uid = user.id;
    const alternar = (id) => {
      const quitar = favoritos.includes(id);
      setFavoritos((l) => (quitar ? l.filter((x) => x !== id) : [...l, id]));
      const op = quitar
        ? sb.from("favoritos").delete().eq("user_id", uid).eq("receta_id", id)
        : sb.from("favoritos").upsert({ user_id: uid, receta_id: id });
      op.then(({ error }) => { if (error) setFavoritos((l) => (quitar ? [...l, id] : l.filter((x) => x !== id))); });
    };
    return { ids: favoritos, alternar };
  }, [user, favoritos]);

  // "Mi rutina": con sesión iniciada y un plan disponible, el menú ofrece
  // volver a él desde cualquier pantalla. Prefiere el plan de la sesión en
  // curso; si no lo hay (p. ej. tras recargar en otra sección), el guardado.
  const irARutina = useMemo(() => {
    if (!user) return null;
    if (datos.objetivo && datos.sexo) return () => setFase("plan");
    if (planGuardado) return () => { setDatos(planGuardado); setFase("plan"); };
    return null;
  }, [user, datos.objetivo, datos.sexo, planGuardado]);

  // Secciones de catálogo (recetario y cine): recuerdan desde qué pantalla se
  // abrieron para volver a ella; saltar de una sección a otra no pisa ese origen.
  const [seccionDesde, setSeccionDesde] = useState("hero");
  const esSeccion = (f) => f === "cine" || f === "recetario" || f === "restaurantes" || f === "actualidad" || f === "favoritos" || f === "chef" || f === "amigos";
  const irSeccion = (s) => { if (!esSeccion(fase)) setSeccionDesde(fase); setFase(s); };

  // Estado social (amigos, chat, notificaciones): activo solo con sesión.
  const social = useSocialProvider(user);

  return (
    <RutinaCtx.Provider value={irARutina}>
    <FavoritosCtx.Provider value={ctxFavoritos}>
    <SocialCtx.Provider value={social}>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: MONO, fontSize: 14 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(26px);} to {opacity:1; transform:none;} }
        @keyframes kenburns { from { transform: scale(1);} to { transform: scale(1.12);} }
        @keyframes scanline { 0%{top:0%;} 100%{top:100%;} }
        @keyframes marquesina { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .fadeUp { animation: fadeUp .6s ease both; }
        /* Polaroids flotantes del hero: la capa exterior recibe el paralaje del
           ratón (variables --px/--py) y la interior levita en bucle. Al pasar
           el ratón por encima, la foto se endereza y crece un poco. */
        @keyframes flotar { 0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); } 50% { transform: translateY(-13px) rotate(calc(var(--rot, 0deg) + 1.6deg)); } }
        /* La posición (x/y) la controla GSAP (quickTo) sobre esta capa; el
           bucle de levitación vive en .polaroid-marco, un elemento distinto. */
        .polaroid { position: absolute; will-change: transform; z-index: 3; }
        .polaroid:hover { z-index: 6; }
        .polaroid-marco { animation: flotar var(--dur, 7s) ease-in-out infinite; background: #fff; border: 2px solid ${C.line}; border-radius: 10px; padding: 9px 9px 12px; box-shadow: 5px 6px 0 rgba(15,44,86,.85); transition: transform .3s cubic-bezier(.2,.8,.3,1.4); }
        .polaroid:hover .polaroid-marco { animation-play-state: paused; transform: rotate(0deg) scale(1.07); }
        @media (max-width: 1080px) { .polaroid { display: none; } }
        @keyframes popIn { from { opacity: 0; transform: translateY(26px) rotate(-1.5deg) scale(.97); } to { opacity: 1; transform: none; } }
        .popIn { animation: popIn .55s cubic-bezier(.2,.9,.3,1.15) both; }
        /* Microinteracciones retro: los botones-pegatina se "levantan" al pasar
           el ratón (la sombra dura crece) y se "aplastan" contra la página al
           pulsarlos (la sombra desaparece). Las tarjetas hacen lo mismo. */
        button { cursor:pointer; font-family:inherit; transition: background .16s ease, transform .16s ease, border-color .16s ease, box-shadow .16s ease, color .16s ease; }
        button:active { transform: scale(.97); }
        button:focus-visible { outline:2px solid ${C.hot1}; outline-offset:3px; }
        .btn-cta:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 ${C.line} !important; }
        .btn-cta:active { transform: translate(3px,3px); box-shadow: 0 0 0 ${C.line} !important; }
        .exwrap { transition: box-shadow .22s ease, border-color .16s ease, transform .22s ease; }
        .exwrap:hover { box-shadow: 6px 6px 0 ${C.line}; transform: translate(-2px,-2px); }
        input[type=email], input[type=password], input[type=text], input:not([type]) { transition: border-color .2s ease, box-shadow .2s ease; font-family: inherit; }
        input[type=email]:focus, input[type=password]:focus, input[type=text]:focus, input:not([type]):focus { outline: none; border-color: ${C.hot1} !important; box-shadow: 3px 3px 0 ${C.hot1}; }
        input[type=range]{ accent-color:${C.hot1}; }
        ::selection { background:${C.hot1}; color:#fff; }
        @media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms !important; transition-duration:.01ms !important; scroll-behavior:auto !important; } }
        .exwrap:hover .eximg { transform: scale(1.06); }
        /* Navegación retro: enlaces monoespaciados en mayúsculas dentro de la
           barra blanca; al pasar el ratón, pastilla celeste. El menú lateral
           (.sobre-claro) usa el mismo tratamiento. */
        .nav-item { background: transparent; border: none; color: ${C.text}; font-family: ${MONO}; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; padding: 8px 14px; border-radius: 8px; transition: background .2s ease; text-decoration: none; white-space: nowrap; }
        .nav-item:hover, .nav-item.activo { background: rgba(15,44,86,.08); }
        .nav-item.activo { background: ${C.panel2}; }
        .sobre-claro .nav-item:hover { background: rgba(15,44,86,.08); }
        /* Marquesina superior: tira marina con el texto en bucle infinito. */
        .marquesina { overflow: hidden; background: ${C.line}; color: ${C.bg}; }
        .marquesina > div { display: inline-flex; white-space: nowrap; animation: marquesina 26s linear infinite; will-change: transform; }
        .marquesina span { font-family: ${MONO}; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 7px 0; }
        @media (max-width: 900px) { .nav-escritorio { display: none !important; } }
        @media (min-width: 901px) { .nav-movil { display: none !important; } }
        @media (max-width: 600px) { .cta-fila { flex-direction: column; align-items: stretch; } }
      `}</style>
      {fase === "hero" && <Hero onStart={() => setFase("form")} onLogin={() => setAuthAbierto(true)} planGuardado={planGuardado} onRetomar={retomarPlan} onIrSeccion={irSeccion} />}
      {fase === "form" && <Formulario datos={datos} set={set} paso={paso} setPaso={setPaso} onFinish={() => setFase("scan")} onBack={() => setFase("hero")} />}
      {fase === "scan" && <Scan onDone={() => setFase("plan")} />}
      {fase === "plan" && <Plan datos={datos} onReset={() => { setPaso(0); setDatos((d) => ({ ...d, objetivo: null, sexo: null })); setFase("hero"); }} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "cine" && <Cine onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "actualidad" && <Actualidad onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "recetario" && <Recetario onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} onCrear={() => setFase("crear")} />}
      {fase === "crear" && <CrearReceta onVolver={() => setFase("recetario")} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "restaurantes" && <Restaurantes datos={datos} onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "favoritos" && <Favoritos onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "chef" && <Chef datos={datos} onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "amigos" && <Amigos onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {authAbierto && <AuthModal onClose={() => setAuthAbierto(false)} />}
    </div>
    </SocialCtx.Provider>
    </FavoritosCtx.Provider>
    </RutinaCtx.Provider>
  );
}

function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    setError(""); setAviso(""); setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await signIn(email, password);
        if (error) setError(traducirError(error.message)); else onClose();
      } else {
        const { error, needsConfirm } = await signUp(email, password);
        if (error) setError(traducirError(error.message));
        else if (needsConfirm) setAviso("Te hemos enviado un email para confirmar tu cuenta. Ábrelo y luego inicia sesión.");
        else onClose();
      }
    } finally { setCargando(false); }
  };

  const input = { width: "100%", padding: "14px 16px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15, marginTop: 10 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,44,86,.5)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: 26, border: `2px solid ${C.line}`, boxShadow: `8px 8px 0 ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...DF, fontWeight: 800, fontSize: 22 }}>{modo === "login" ? "Iniciar sesión" : "Crear cuenta"}</div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", color: C.dim, fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>Guarda tu plan y sigue tu progreso desde cualquier dispositivo.</p>
        <form onSubmit={enviar}>
          <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input style={input} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={modo === "login" ? "current-password" : "new-password"} />
          {error && <div style={{ color: C.hot1, fontSize: 13, marginTop: 12 }}>{error}</div>}
          {aviso && <div style={{ color: C.hot2, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{aviso}</div>}
          <button className="btn-cta" type="submit" disabled={cargando} style={{ ...btnPrimario, width: "100%", marginTop: 18, fontSize: 15, padding: 14, opacity: cargando ? 0.6 : 1 }}>
            {cargando ? "Un momento…" : modo === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.dim }}>
          {modo === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setModo(modo === "login" ? "registro" : "login"); setError(""); setAviso(""); }} style={{ background: "none", border: "none", ...gradText, fontWeight: 700, fontSize: 13 }}>
            {modo === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

function traducirError(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
  if (m.includes("already registered")) return "Ese email ya está registrado. Inicia sesión.";
  if (m.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email")) return "Revisa el email introducido.";
  return "No se ha podido completar. Inténtalo de nuevo.";
}

// Sesión como enlaces de texto planos, al estilo del resto de la navegación.
// `vertical` la adapta a la lista del menú lateral.
function CuentaChip({ onLogin, vertical = false }) {
  const { enabled, ready, user, signOut } = useAuth();
  if (!enabled || !ready) return null;
  const item = vertical ? { width: "100%", textAlign: "left" as const, fontSize: 15, padding: "12px 14px" } : {};
  if (!user) return <button className="nav-item" onClick={onLogin} style={item}>Cuenta</button>;
  const nombre = (user.email || "").split("@")[0];
  return (
    <>
      <span className="nav-item" style={{ ...item, color: C.dim, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</span>
      <button className="nav-item" onClick={() => signOut()} style={item}>Salir</button>
    </>
  );
}

// Tira de marquesina retro: texto en mayúsculas desplazándose en bucle.
// El contenido se duplica para que el salto del bucle (-50%) no se note.
function Marquesina({ texto }) {
  const tira = `${Array(4).fill(texto).join("  ✶  ")}  ✶  `;
  return (
    <div className="marquesina" aria-hidden="true">
      <div><span>{tira}</span><span>{tira}</span></div>
    </div>
  );
}

/* Enlace de menú con forma de cartel/pegatina que rebota con GSAP: al pasar el
   ratón da un bote elástico (escala + giro leve + la sombra dura crece) y al
   pulsarlo se aplasta y vuelve a botar. `variante` "chip" (barra de escritorio,
   compacto) o "bloque" (menú móvil, ancho completo). El activo va en mostaza.
   Con prefers-reduced-motion no anima, solo cambia la sombra. */
function BotonCartel({ children, onClick, activo = false, variante = "chip", className = "", style, ...resto }: any) {
  const ref = useRef<HTMLButtonElement>(null);
  const grande = variante === "bloque";
  const salta = () => {
    if (REDUCE || !ref.current) return;
    gsap.to(ref.current, { scale: grande ? 1.03 : 1.08, rotation: gsap.utils.random(-2.4, 2.4), y: -3, boxShadow: `6px 6px 0 ${C.line}`, duration: 0.55, ease: "elastic.out(1, 0.45)", overwrite: true });
  };
  const vuelve = () => {
    if (REDUCE || !ref.current) return;
    gsap.to(ref.current, { scale: 1, rotation: 0, y: 0, boxShadow: `3px 3px 0 ${C.line}`, duration: 0.3, ease: "power2.out", overwrite: true });
  };
  const aplasta = () => {
    if (REDUCE || !ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.88, y: 1 }, { scale: grande ? 1.03 : 1.08, y: -3, duration: 0.5, ease: "elastic.out(1, 0.4)", overwrite: true });
  };
  return (
    <button ref={ref} className={className} onClick={onClick} onMouseEnter={salta} onMouseLeave={vuelve} onPointerDown={aplasta} {...resto}
      style={{
        background: activo ? C.hot2 : "#fff", border: `2px solid ${C.line}`, borderRadius: 10, boxShadow: `3px 3px 0 ${C.line}`,
        color: C.text, fontFamily: MONO, fontWeight: 600, fontSize: grande ? 15 : 12, letterSpacing: "0.05em", textTransform: "uppercase",
        padding: grande ? "13px 16px" : "8px 14px", transition: "none", whiteSpace: "nowrap",
        ...(grande ? { width: "100%", textAlign: "left" as const } : {}), ...style,
      }}>
      {children}
    </button>
  );
}

/* Desplegable "Categorías" de la barra de escritorio: al pasar el ratón (o
   pulsar el cartel, para táctil y teclado) se abre un panel-pegatina del que
   caen los carteles escalonados con un bote elástico de GSAP; al salir, la
   timeline se reproduce en reversa acelerada. El panel es hijo del propio
   contenedor para que el ratón pueda bajar del cartel al panel sin cerrarlo.
   Con prefers-reduced-motion se muestra y oculta sin animación. */
function MenuCategorias({ actual, onIrSeccion, user }) {
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const enlaces = categoriasNav(user);
  const dentro = enlaces.some(([id]) => id === actual);

  useLayoutEffect(() => {
    if (REDUCE) return;
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({ paused: true })
        .fromTo(panel.current, { autoAlpha: 0, y: -10, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: "power3.out" })
        .fromTo(panel.current!.querySelectorAll(".cat-enlace"),
          { y: -16, autoAlpha: 0, rotation: (i) => (i % 2 ? 3 : -3) },
          { y: 0, autoAlpha: 1, rotation: 0, stagger: 0.06, duration: 0.55, ease: "elastic.out(1, 0.5)" }, "-=0.08");
    });
    return () => ctx.revert();
  }, [user]); // con o sin sesión cambia la lista de carteles

  useEffect(() => {
    if (REDUCE || !tl.current) return;
    if (abierto) tl.current.timeScale(1).play();
    else tl.current.timeScale(2).reverse();
  }, [abierto]);

  return (
    <div onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)} style={{ position: "relative" }}>
      <BotonCartel activo={dentro} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-haspopup="true">Categorías ▾</BotonCartel>
      {/* paddingTop hace de puente para que el ratón no "caiga" entre cartel y panel */}
      <div ref={panel} style={{ position: "absolute", top: "100%", left: "50%", marginLeft: -95, paddingTop: 10, zIndex: 30, ...(REDUCE ? { visibility: abierto ? "visible" as const : "hidden" as const, opacity: abierto ? 1 : 0 } : { visibility: "hidden" as const, opacity: 0 }) }}>
        <div style={{ display: "grid", gap: 7, background: "#fff", border: `2px solid ${C.line}`, borderRadius: 12, boxShadow: `4px 4px 0 ${C.line}`, padding: 8, width: 190 }}>
          {enlaces.map(([id, t]) => (
            <BotonCartel key={id} className="cat-enlace" variante="bloque" activo={actual === id} onClick={() => { setAbierto(false); onIrSeccion(id); }} style={{ fontSize: 12.5, padding: "11px 14px" }}>{t}</BotonCartel>
          ))}
        </div>
      </div>
    </div>
  );
}

// Cabecera compartida por todas las pantallas, estilo food-truck retro:
// marquesina marina arriba y barra blanca tipo pegatina con el logo a la
// izquierda, enlaces monoespaciados centrados (escritorio), acciones
// contextuales a la derecha y un botón "Menú" en pantallas estrechas.
// `onInicio` hace clicable el logo; `actual` resalta la sección activa.
/* La barra lleva pocos carteles para no cargarse: Recetario, Restaurantes y
   Chef IA sueltos, y el resto de secciones agrupadas bajo el desplegable
   "Categorías" (cine, actualidad y, con sesión iniciada, favoritos). */
const CATEGORIAS_NAV = [["cine", "Cine y series"], ["actualidad", "Actualidad"]];
const categoriasNav = (user) => (user ? [...CATEGORIAS_NAV, ["favoritos", "♥ Favoritos"]] : CATEGORIAS_NAV);
// Lista plana para el menú lateral móvil, donde no hay desplegable.
const enlacesNav = (user) => [["recetario", "Recetario"], ...categoriasNav(user), ["restaurantes", "Restaurantes"], ["chef", "Chef IA"]];

// Enlace "Amigos" con badge de novedades (solicitudes + mensajes sin leer).
// Lee el contexto social para el número; solo aparece con sesión iniciada.
function EnlaceAmigos({ actual, onClick, variante = "chip" }: any) {
  const social = useContext(SocialCtx);
  const n = social ? social.novedades : 0;
  const badge = n > 0 && (
    <span aria-hidden="true" style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px", boxSizing: "border-box", background: C.hot1, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, lineHeight: "15px", textAlign: "center", border: "1.5px solid #fff" }}>{n > 9 ? "9+" : n}</span>
  );
  return (
    <span style={{ position: "relative", display: variante === "bloque" ? "block" : "inline-block" }}>
      <BotonCartel variante={variante} activo={actual === "amigos"} onClick={onClick} style={variante === "bloque" ? { width: "100%" } : undefined}>
        Amigos{variante === "bloque" && n > 0 ? ` · ${n > 9 ? "9+" : n}` : ""}
      </BotonCartel>
      {variante === "chip" && badge}
    </span>
  );
}

function Cabecera({ onIrSeccion, onLogin, onInicio, actual, acciones }: any) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const irARutina = useContext(RutinaCtx);
  const { user } = useAuth();
  const logo = <span style={{ ...DF, fontSize: 19, letterSpacing: "0.14em" }}>PULSO<span style={{ color: C.hot1 }}>.</span></span>;
  return (
    <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }}>
      <Marquesina texto={`${RECETAS.length}+ recetas con foto · Tu semana de comidas en segundos · PDF gratis · Recetas de la comunidad`} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, margin: "12px 14px 0", padding: "8px 14px", background: "#fff", border: `2px solid ${C.line}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.line}`, color: C.text }}>
        {onInicio
          ? <button className="nav-item" onClick={onInicio} aria-label="Ir al inicio" style={{ padding: "4px 10px" }}>{logo}</button>
          : <div style={{ padding: "4px 10px" }}>{logo}</div>}
        <nav className="nav-escritorio" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {irARutina && <BotonCartel activo={actual === "rutina"} onClick={irARutina}>Mi rutina</BotonCartel>}
          <BotonCartel activo={actual === "recetario"} onClick={() => onIrSeccion("recetario")}>Recetario</BotonCartel>
          <MenuCategorias actual={actual} onIrSeccion={onIrSeccion} user={user} />
          <BotonCartel activo={actual === "restaurantes"} onClick={() => onIrSeccion("restaurantes")}>Restaurantes</BotonCartel>
          <BotonCartel activo={actual === "chef"} onClick={() => onIrSeccion("chef")}>Chef IA</BotonCartel>
          {user && <EnlaceAmigos actual={actual} onClick={() => onIrSeccion("amigos")} />}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {acciones}
          <span className="nav-escritorio" style={{ display: "flex", alignItems: "center", gap: 4 }}><CuentaChip onLogin={onLogin} /></span>
          <button className="nav-item nav-movil" onClick={() => setMenuAbierto(true)}>Menú</button>
        </div>
        {menuAbierto && (
          <MenuLateral onCerrar={() => setMenuAbierto(false)} onIrSeccion={onIrSeccion} onLogin={onLogin} onInicio={onInicio} actual={actual} />
        )}
      </div>
    </header>
  );
}

// Panel lateral deslizante (menú móvil). La entrada y la salida las orquesta
// una timeline de GSAP: el velo aparece, el panel entra desde la derecha y los
// enlaces se revelan escalonados. Al cerrar se reproduce la timeline en
// reversa y solo entonces se desmonta (por eso el cierre pasa por `cerrar`).
function MenuLateral({ onCerrar, onIrSeccion, onLogin, onInicio, actual }) {
  const irARutina = useContext(RutinaCtx);
  const { user } = useAuth();
  const velo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (REDUCE) return; // sin animación: el panel se muestra tal cual
    const ctx = gsap.context(() => {
      const enlaces = panel.current!.querySelectorAll(".menu-enlace");
      tl.current = gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(velo.current, { autoAlpha: 0, duration: 0.25 })
        .from(panel.current, { xPercent: 100, duration: 0.4 }, "<")
        .from(enlaces, { x: 24, autoAlpha: 0, stagger: 0.05, duration: 0.35 }, "-=0.15");
    });
    return () => ctx.revert();
  }, []);

  // Cierra con la animación en reversa; si no hay animación, cierra directo.
  const cerrar = () => {
    if (REDUCE || !tl.current) { onCerrar(); return; }
    tl.current.eventCallback("onReverseComplete", onCerrar).timeScale(1.6).reverse();
  };
  const ir = (fn) => () => { fn(); cerrar(); };
  return (
    <div ref={velo} onClick={cerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,44,86,.45)", zIndex: 90 }}>
      <div ref={panel} className="sobre-claro" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 85vw)", background: "rgba(255,255,255,.98)", borderLeft: `2px solid ${C.line}`, color: C.text, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        <button className="nav-item menu-enlace" onClick={cerrar} aria-label="Cerrar menú" style={{ alignSelf: "flex-end", fontSize: 20, lineHeight: 1, padding: "8px 12px" }}>×</button>
        {onInicio && <BotonCartel className="menu-enlace" variante="bloque" onClick={ir(onInicio)}>Inicio</BotonCartel>}
        {irARutina && <BotonCartel className="menu-enlace" variante="bloque" activo={actual === "rutina"} onClick={ir(irARutina)}>Mi rutina</BotonCartel>}
        {enlacesNav(user).map(([id, t]) => (
          <BotonCartel key={id} className="menu-enlace" variante="bloque" activo={actual === id} onClick={ir(() => onIrSeccion(id))}>{t}</BotonCartel>
        ))}
        {user && <span className="menu-enlace"><EnlaceAmigos variante="bloque" actual={actual} onClick={ir(() => onIrSeccion("amigos"))} /></span>}
        <div className="menu-enlace" style={{ height: 1, background: C.line, margin: "10px 4px" }} />
        <span className="menu-enlace"><CuentaChip onLogin={ir(onLogin)} vertical /></span>
      </div>
    </div>
  );
}

/* Aparece: revela su contenido con GSAP ScrollTrigger cuando entra en el
   viewport, con un salto y giro tipo pegatina. Sincronizado con el scroll
   suave de Lenis. Si el usuario pide menos movimiento, se muestra sin más. */
function Aparece({ children, delay = 0, rot = 0 }: any) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || REDUCE) return;
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0, y: 34, rotation: rot, scale: 0.97, duration: 0.6, ease: "back.out(1.5)", delay: delay / 1000,
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return <div ref={ref}>{children}</div>;
}

/* Fotos flotantes del hero: polaroids giradas que levitan en bucle (CSS) y se
   apartan del ratón cuando pasa cerca (paralaje + repulsión de cercanía),
   como las fotos sueltas de pizza-amici. El seguimiento del ratón lo suaviza
   gsap.quickTo (interpolación amortiguada). Solo escritorio (>1080px). */
const POLAROIDS = [
  { img: "ensalada", texto: "sin remordimientos", pos: { top: "23%", left: "5%" }, rot: -7, deriva: 30, dur: 7.2 },
  { img: "batido", texto: "listo en 10 min", pos: { top: "56%", left: "10%" }, rot: 5, deriva: 55, dur: 8.4 },
  { img: "carne", texto: "alto en proteína", pos: { top: "21%", right: "6%" }, rot: 6, deriva: 42, dur: 7.8 },
  { img: "fruta", texto: "tu semana, resuelta", pos: { top: "58%", right: "11%" }, rot: -5, deriva: 68, dur: 9 },
];
function FotosFlotantes() {
  const capa = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = capa.current;
    if (!el || REDUCE) return;
    const ctx = gsap.context(() => {
      const fotos = Array.from(el.querySelectorAll<HTMLElement>(".polaroid"));
      // Una interpolación amortiguada por eje y foto: el destino salta, la
      // posición real lo persigue con suavidad (sin recolocar en cada frame).
      const setX = fotos.map((f) => gsap.quickTo(f, "x", { duration: 0.6, ease: "power3.out" }));
      const setY = fotos.map((f) => gsap.quickTo(f, "y", { duration: 0.6, ease: "power3.out" }));
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        fotos.forEach((foto, i) => {
          const fr = foto.getBoundingClientRect();
          const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
          // Paralaje de profundidad: cada foto sigue al ratón a su propio ritmo…
          const deriva = POLAROIDS[i]?.deriva ?? 40;
          let px = (e.clientX - (r.left + r.width / 2)) / deriva;
          let py = (e.clientY - (r.top + r.height / 2)) / deriva;
          // …y repulsión de cercanía: si el ratón se acerca, la foto se aparta.
          const dx = cx - e.clientX, dy = cy - e.clientY;
          const dist = Math.hypot(dx, dy);
          const fuerza = Math.max(0, 1 - dist / 300) * 46;
          if (dist > 1) { px += (dx / dist) * fuerza; py += (dy / dist) * fuerza; }
          setX[i](px); setY[i](py);
        });
      };
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={capa} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      {POLAROIDS.map((p) => (
        <div key={p.img} className="polaroid" style={{ ...p.pos, pointerEvents: "auto", ["--rot" as any]: `${p.rot}deg`, ["--dur" as any]: `${p.dur}s` }}>
          <div className="polaroid-marco">
            <img src={U(FOODIMG[p.img], 400)} alt="" onError={onImgError} style={{ width: 148, height: 148, objectFit: "cover", display: "block", borderRadius: 5 }} />
            <div style={{ ...SERIF, fontSize: 16, color: C.text, textAlign: "center", marginTop: 7 }}>{p.texto}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ onStart, onLogin, planGuardado, onRetomar, onIrSeccion }) {
  const { disponible: pwaDisponible, instalar: instalarPWA } = useInstalarPWA();
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenburns 18s ease-out both" }} />
        {/* Velo marino sobre la foto que se funde en crema hacia la zona de
            CTAs y cifras, donde el texto vuelve a ser tinta sobre papel. */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(15,44,86,.42) 0%, rgba(15,44,86,.22) 46%, rgba(242,237,233,.9) 82%, ${C.bg} 100%)` }} />
      </div>
      <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} />
      <FotosFlotantes />
      <main className="fadeUp" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "17vh 24px 0" }}>
        {/* Insignia tipo ticket: tarjeta blanca con doble borde marino,
            ligeramente girada, como las pegatinas del food-truck. */}
        <div style={{ background: "#fff", border: `3px solid ${C.line}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.line}`, padding: "34px 40px 36px", maxWidth: 620, textAlign: "center", transform: "rotate(-1.4deg)", outline: `2px solid #fff`, outlineOffset: -9 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.3em", color: C.hot1, textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>✶ Tu plan · Tu mesa · Tus reglas ✶</div>
          <h1 style={{ ...DF, fontSize: "clamp(40px, 7vw, 82px)", lineHeight: 0.98, margin: 0 }}>Come con <span style={gradText}>intención</span></h1>
          <p style={{ color: C.text, fontSize: 13.5, maxWidth: 460, lineHeight: 1.7, margin: "18px auto 0" }}>Dinos tu objetivo, tus gustos y tus alergias. En segundos generamos tu semana de comidas completa, con cada receta ilustrada paso a paso.</p>
        </div>
      </main>
      <div className="fadeUp" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30, padding: "44px 24px 6vh" }}>
        <div className="cta-fila" style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%", maxWidth: 600 }}>
          <button className="btn-cta" onClick={onStart} style={{ ...btnPrimario, transform: "rotate(-1deg)" }}>Crear mi plan</button>
          {planGuardado
            ? <button className="btn-cta" onClick={onRetomar} style={{ ...btnSecundario, transform: "rotate(1deg)" }}>Continuar con mi plan</button>
            : <button className="btn-cta" onClick={() => onIrSeccion("recetario")} style={{ ...btnSecundario, transform: "rotate(1deg)" }}>Explorar el recetario</button>}
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {[["4", "objetivos"], ["7 días", "de dieta"], [`${RECETAS.length}+`, "recetas con foto"]].map(([n, t]) => (
            <div key={t} style={{ textAlign: "center" }}><div style={{ ...DF, fontSize: 26, color: C.hot1 }}>{n}</div><div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3, fontWeight: 600 }}>{t}</div></div>
          ))}
        </div>
        {pwaDisponible && (
          <button onClick={instalarPWA} style={{ background: "none", border: `1.5px dashed ${C.line}`, color: C.text, borderRadius: 999, padding: "8px 18px", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>⬇ Instalar PULSO en el móvil</button>
        )}
      </div>
    </div>
  );
}

function Formulario({ datos, set, paso, setPaso, onFinish, onBack }) {
  const pasos = ["Objetivo", "Sobre ti", "Tipo de dieta", "Preferencias", "Comidas al día"];
  const ultimo = pasos.length - 1;
  const puedeSeguir = paso === 0 ? !!datos.objetivo : paso === 1 ? !!datos.sexo : true;
  const next = () => (paso < ultimo ? setPaso(paso + 1) : onFinish());
  // Alterna un valor dentro de un campo multi-select (alergias, noGusta).
  const toggle = (k, v) => set(k, datos[k].includes(v) ? datos[k].filter((x) => x !== v) : [...datos[k], v]);
  const chip = (activo) => ({
    padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14,
    border: `1.5px solid ${activo ? C.hot1 : C.line}`, color: activo ? "#0F2C56" : C.dim,
    ...(activo ? grad : { background: C.panel }),
  });
  return (
    <div style={{ minHeight: "100vh", maxWidth: 860, margin: "0 auto", padding: "26px 18px 40px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
        <button onClick={() => (paso === 0 ? onBack() : setPaso(paso - 1))} style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, borderRadius: 9, width: 42, height: 42, fontSize: 18 }} aria-label="Volver">←</button>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          {pasos.map((p, i) => (
            <div key={p} style={{ flex: 1 }}>
              <div style={{ height: 6, borderRadius: 4, border: `1px solid ${C.line}`, background: i <= paso ? C.hot2 : C.suave }} />
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: i === paso ? C.text : C.dim, marginTop: 8 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fadeUp" key={paso} style={{ flex: 1 }}>
        {paso === 0 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>¿Cuál es tu objetivo?</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Todo el plan de comidas se diseñará alrededor de esto.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {OBJETIVOS.map((o) => {
                const activo = datos.objetivo === o.id;
                return (
                  <button key={o.id} onClick={() => set("objetivo", o.id)} style={{ position: "relative", height: 200, borderRadius: 16, overflow: "hidden", border: `2px solid ${activo ? C.hot1 : C.line}`, padding: 0, textAlign: "left", boxShadow: activo ? `6px 6px 0 ${C.line}` : "none", transform: activo ? "translate(-2px,-2px)" : "none", transition: "border-color .15s, box-shadow .2s, transform .2s" }}>
                    <img src={o.img} alt="" onError={onImgError} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: activo ? "linear-gradient(180deg, rgba(214,69,61,.3), rgba(15,44,86,.94))" : "linear-gradient(180deg, rgba(15,44,86,.15), rgba(15,44,86,.9))" }} />
                    <div style={{ position: "absolute", left: 20, right: 20, bottom: 18 }}>
                      <div style={{ ...DF, fontWeight: 800, fontSize: 24, color: "#fff" }}>{o.titulo}</div>
                      <div style={{ color: "#D7DADF", fontSize: 13, marginTop: 4 }}>{o.desc}</div>
                    </div>
                    {activo && <div style={{ position: "absolute", top: 14, right: 14, ...grad, color: "#0F2C56", fontWeight: 800, borderRadius: 9, width: 30, height: 30, display: "grid", placeItems: "center", fontSize: 16 }}>✓</div>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {paso === 1 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>Cuéntanos sobre ti</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Con esto calculamos tus calorías y macros exactos.</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 26 }}>
              {["hombre", "mujer"].map((s) => (
                <button key={s} onClick={() => set("sexo", s)} style={{ flex: 1, padding: 16, borderRadius: 14, textTransform: "capitalize", fontWeight: 700, fontSize: 16, color: C.text, background: datos.sexo === s ? "#C9DFF0" : C.panel, border: `1.5px solid ${datos.sexo === s ? C.hot1 : C.line}` }}>{s === "hombre" ? "♂ Hombre" : "♀ Mujer"}</button>
              ))}
            </div>
            {[["edad", "Edad", 14, 80, "años"], ["peso", "Peso", 40, 160, "kg"], ["altura", "Altura", 140, 210, "cm"]].map(([k, label, min, max, u]) => (
              <div key={k} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: C.dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                  <span style={{ ...DF, fontSize: 28, fontWeight: 800 }}>{datos[k]} <span style={{ fontSize: 14, color: C.dim, fontWeight: 400 }}>{u}</span></span>
                </div>
                <input type="range" min={min} max={max} value={datos[k]} onChange={(e) => set(k, +e.target.value)} style={{ width: "100%", marginTop: 12 }} aria-label={String(label)} />
              </div>
            ))}
          </>
        )}
        {paso === 2 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>¿Qué tipo de dieta sigues?</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Todas las recetas de tu plan la respetarán.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {TIPOS_DIETA.map((t) => (
                <button key={t.id} onClick={() => set("tipoDieta", t.id)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.tipoDieta === t.id ? "#C9DFF0" : C.panel, border: `1.5px solid ${datos.tipoDieta === t.id ? C.hot1 : C.line}` }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 17 }}>{t.titulo}</div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}
        {paso === 3 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>Tus preferencias</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Marca lo que no quieres ver en tu plan. Puedes dejarlo todo sin marcar.</p>
            <div style={{ fontSize: 13, color: C.dim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Alimentos que no te gustan</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 30 }}>
              {ALIMENTOS.map((a) => (
                <button key={a.id} onClick={() => toggle("noGusta", a.id)} style={chip(datos.noGusta.includes(a.id))}>{a.nombre}</button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: C.dim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Alergias e intolerancias</div>
            <p style={{ color: C.dim, fontSize: 13, margin: "0 0 12px" }}>Se excluirán siempre de tu plan, sin excepción.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {ALERGENOS.map((a) => (
                <button key={a.id} onClick={() => toggle("alergias", a.id)} style={chip(datos.alergias.includes(a.id))}>⚠ {a.nombre}</button>
              ))}
            </div>
          </>
        )}
        {paso === 4 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>¿Cuántas comidas al día?</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Repartiremos tus calorías entre ellas.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {[3, 4, 5].map((n) => (
                <button key={n} onClick={() => set("comidasDia", n)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.comidasDia === n ? "#C9DFF0" : C.panel, border: `1.5px solid ${datos.comidasDia === n ? C.hot1 : C.line}` }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 22 }}>{n} <span style={{ fontSize: 13, fontWeight: 400, color: C.dim }}>comidas</span></div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>{REPARTO[n].map((f) => f.nombre).join(" · ")}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button className="btn-cta" onClick={next} disabled={!puedeSeguir} style={{ ...btnPrimario, ...(puedeSeguir ? {} : { background: C.suave, color: C.dim, boxShadow: "none" }), marginTop: 34, width: "100%", padding: 15, fontSize: 14, opacity: puedeSeguir ? 1 : 0.7, cursor: puedeSeguir ? "pointer" : "not-allowed" }}>{paso < ultimo ? "Continuar" : "Generar mi plan"}</button>
    </div>
  );
}

function Scan({ onDone }) {
  const frases = ["Analizando tu metabolismo…", "Calculando calorías y macros…", "Filtrando recetas según tus preferencias…", "Diseñando tu semana de comidas…", "Ajustando cantidades a tu objetivo…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 720); return () => clearInterval(t); }, []);
  useEffect(() => { if (i >= frases.length) onDone(); }, [i, onDone]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "relative", width: 200, height: 260, borderRadius: 24, overflow: "hidden", border: `1px solid ${C.line}`, marginBottom: 40 }}>
        <img src={U("1504674900247-0877df9cc836", 600)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(.4) brightness(.7)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, ...grad, boxShadow: `0 0 24px ${C.hot1}`, animation: "scanline 1.4s linear infinite" }} />
      </div>
      <div className="fadeUp" key={i} style={{ ...DF, fontSize: 22, fontWeight: 700 }}>{frases[Math.min(i, frases.length - 1)]}</div>
      <div style={{ width: 260, height: 6, background: C.suave, border: `1px solid ${C.line}`, borderRadius: 4, marginTop: 22, overflow: "hidden" }}>
        <div style={{ height: "100%", ...grad, width: `${Math.min(100, ((i + 1) / frases.length) * 100)}%`, transition: "width .7s ease" }} />
      </div>
    </div>
  );
}

function Plan({ datos, onReset, onLogin, onIrSeccion }) {
  // El calendario decide qué día se ve al entrar: hoy, no siempre lunes.
  const hoyIdx = useMemo(() => indiceDiaHoy(), []);
  const [diaDieta, setDiaDieta] = useState(hoyIdx);
  const [recetaAbierta, setRecetaAbierta] = useState<string | null>(null);
  const [ingredientesAbiertos, setIngredientesAbiertos] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [guardado, setGuardado] = useState(false);
  const { user, enabled } = useAuth();
  const m = useMemo(() => calcularMetricas(datos), [datos]);
  const dieta = useMemo(() => buildDiet(datos, m.kcal), [datos, m.kcal]);
  const obj = OBJETIVOS.find((o) => o.id === datos.objetivo);
  const tipoDieta = TIPOS_DIETA.find((t) => t.id === datos.tipoDieta);
  const alergiasNombres = ALERGENOS.filter((a) => datos.alergias.includes(a.id)).map((a) => a.nombre);
  const marcarIngrediente = (clave) => setMarcados((s) => {
    const n = new Set(s);
    n.has(clave) ? n.delete(clave) : n.add(clave);
    return n;
  });
  // Ingredientes de todas las comidas de hoy, agrupados por nombre (varias
  // recetas pueden compartir un ingrediente): cada cantidad se lista tal
  // cual viene de la receta, sin sumar unidades distintas entre sí.
  const ingredientesHoy = useMemo(() => {
    const mapa = new Map<string, { nombre: string; cantidades: string[] }>();
    dieta[hoyIdx].comidas.forEach((c) => {
      c.receta.ingredientes.forEach((ing) => {
        const clave = normalizar(ing.nombre);
        if (!mapa.has(clave)) mapa.set(clave, { nombre: ing.nombre, cantidades: [] });
        mapa.get(clave)!.cantidades.push(ing.cantidad);
      });
    });
    return [...mapa.entries()].map(([clave, v]) => ({ clave, ...v })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [dieta, hoyIdx]);
  const fechaHoy = useMemo(() => {
    const s = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  // Si el usuario ha iniciado sesión, guarda su plan en la nube (uno por usuario).
  useEffect(() => {
    if (!supabase || !user || !datos.objetivo) return;
    let vivo = true;
    supabase.from("planes").upsert({ user_id: user.id, datos, actualizado_en: new Date().toISOString() }, { onConflict: "user_id" })
      .then(({ error }) => { if (vivo && !error) { setGuardado(true); setTimeout(() => vivo && setGuardado(false), 2500); } });
    return () => { vivo = false; };
  }, [user, datos]);

  const descargarPDF = async () => {
    // Carga diferida: jsPDF solo se descarga cuando el usuario pide el PDF.
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 42;
    const maxW = pageW - margin * 2;
    let y = margin;
    // jsPDF con fuentes estándar no dibuja algunos glifos (guion largo, ×, ·):
    // los sustituimos por equivalentes ASCII para que el PDF salga limpio.
    const san = (s) => String(s).replace(/[–—]/g, "-").replace(/×/g, "x").replace(/·/g, "-").replace(/≥/g, ">=");
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
    const ensure = (h) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
    const line = (str, o: any = {}) => {
      const { size = 11, style = "normal", color = [34, 34, 34], gap = 5, indent = 0 } = o;
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.splitTextToSize(san(str), maxW - indent).forEach((ln) => {
        ensure(size + gap);
        doc.text(ln, margin + indent, y);
        y += size + gap;
      });
    };
    const space = (h = 8) => { y += h; };
    const rule = () => { ensure(16); doc.setDrawColor(224); doc.line(margin, y, pageW - margin, y); y += 16; };

    line("PULSO", { size: 24, style: "bold", color: [214, 69, 61], gap: 3 });
    line("Tu plan de alimentación personalizado", { size: 15, style: "bold" });
    space(4);
    line(`Objetivo: ${obj?.titulo}   |   Dieta: ${tipoDieta?.titulo}   |   ${datos.comidasDia} comidas/día`, { size: 10, color: [110, 110, 110], gap: 3 });
    line(`${cap(datos.sexo)} · ${datos.edad} años · ${datos.peso} kg · ${datos.altura} cm`, { size: 10, color: [110, 110, 110], gap: 3 });
    if (alergiasNombres.length) line(`Sin: ${alergiasNombres.join(", ")}`, { size: 10, color: [110, 110, 110] });
    space(8);

    line("OBJETIVO NUTRICIONAL DIARIO", { size: 12, style: "bold" });
    space(2);
    line(`Calorías: ${m.kcal} kcal      Proteína: ${m.prot} g      Carbohidratos: ${m.carbs} g      Grasas: ${m.grasa} g`, { size: 11 });
    space(6);
    rule();

    line("DIETA SEMANAL", { size: 15, style: "bold", color: [214, 69, 61] });
    space(4);
    dieta.forEach((d) => {
      ensure(50);
      line(d.dia, { size: 12.5, style: "bold" });
      space(1);
      d.comidas.forEach((c) => {
        ensure(26);
        line(`${c.hora}  ·  ${c.nombre}   (~${c.kcal} kcal)`, { size: 9.5, style: "bold", color: [90, 90, 90], indent: 6, gap: 2 });
        line(c.receta.nombre, { size: 10, indent: 16, gap: 3 });
      });
      space(7);
    });
    rule();

    // Recetario: cada receta usada en la semana, una sola vez, con
    // ingredientes y modo de elaboración completos.
    const recetario: any[] = [];
    const vistos = new Set();
    dieta.forEach((d) => d.comidas.forEach((c) => { if (!vistos.has(c.receta.id)) { vistos.add(c.receta.id); recetario.push(c.receta); } }));

    // Precarga de las fotos a dataURL (JPEG) para incrustarlas con addImage.
    // Se recorta un cuadrado centrado (efecto "cover"). Unsplash admite CORS;
    // si una imagen falla o el canvas queda "tainted", se resuelve a null y la
    // receta sale sin foto (nunca rompe el PDF).
    const TH = 54; // lado de la miniatura en pt
    const cargarThumb = (url) => new Promise<string | null>((resolve) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        try {
          const px = 140, cv = document.createElement("canvas");
          cv.width = px; cv.height = px;
          const ctx = cv.getContext("2d")!;
          const lado = Math.min(im.width, im.height);
          ctx.drawImage(im, (im.width - lado) / 2, (im.height - lado) / 2, lado, lado, 0, 0, px, px);
          resolve(cv.toDataURL("image/jpeg", 0.7));
        } catch { resolve(null); }
      };
      im.onerror = () => resolve(null);
      im.src = url;
    });
    const thumbs: Record<string, string | null> = {};
    await Promise.all(recetario.map(async (r) => { thumbs[r.id] = await cargarThumb(U(FOODIMG[r.img] || FOODIMG.otro, 200)); }));

    line("RECETARIO", { size: 15, style: "bold", color: [214, 69, 61] });
    space(4);
    recetario.forEach((r) => {
      ensure(TH + 10);
      const thumb = thumbs[r.id];
      const yTop = y;
      // alias `rec-<id>` evita reincrustar la misma imagen si se repitiera; FAST comprime el JPEG.
      if (thumb) { try { doc.addImage(thumb, "JPEG", margin, yTop, TH, TH, `rec-${r.id}`, "FAST"); } catch {} }
      const tInd = thumb ? TH + 10 : 0;
      line(r.nombre, { size: 11.5, style: "bold", indent: tInd });
      line(`${cap(r.categoria)} · ~${r.kcalAprox} kcal por ración`, { size: 9, color: [125, 125, 125], gap: 3, indent: tInd });
      // El texto se dibuja desde su línea base hacia arriba: dejamos margen bajo
      // la miniatura para que "Ingredientes:" no se solape con la foto.
      if (thumb) y = Math.max(y, yTop + TH + 10);
      space(2);
      line("Ingredientes:", { size: 9.5, style: "bold", color: [90, 90, 90], indent: 6, gap: 3 });
      r.ingredientes.forEach((ing) => line(`•  ${ing.cantidad} — ${ing.nombre}`, { size: 9.5, indent: 16, gap: 2 }));
      space(2);
      line("Elaboración:", { size: 9.5, style: "bold", color: [90, 90, 90], indent: 6, gap: 3 });
      r.pasos.forEach((p, i) => line(`${i + 1}. ${p}`, { size: 9, color: [115, 115, 115], indent: 16, gap: 2 }));
      space(8);
    });
    space(4);
    line("Plan orientativo con fines informativos. No sustituye el consejo de un médico o dietista.", { size: 8, color: [150, 150, 150] });

    doc.save(`dieta-pulso-${datos.objetivo}.pdf`);
  };

  return (
    <div>
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        <img src={obj?.img} alt="" onError={onImgError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,44,86,.4) 0%, rgba(242,237,233,.82) 62%, #F2EDE9 100%)" }} />
        <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} onInicio={onReset} actual="rutina" acciones={
          <>
            {enabled && user && guardado && <span style={{ fontSize: 12, color: C.hot2, fontWeight: 700, padding: "0 8px" }}>✓ Guardado</span>}
            <button className="nav-item nav-escritorio" onClick={onReset}>Empezar de nuevo</button>
            <button className="btn-cta" onClick={descargarPDF} style={{ ...btnPrimario, minWidth: 0, padding: "9px 20px", fontSize: 13 }}>Descargar PDF</button>
          </>
        } />
        <div className="fadeUp" style={{ position: "absolute", left: 0, right: 0, bottom: 26, maxWidth: 980, margin: "0 auto", padding: "0 18px", color: C.text }}>
          <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: C.hot1, fontWeight: 700 }}>Tu plan · {obj?.titulo}{datos.tipoDieta !== "omnivora" ? ` · ${tipoDieta?.titulo}` : ""}</div>
          <h1 style={{ ...DF, fontSize: "clamp(30px,6vw,54px)", fontWeight: 800, margin: "8px 0 0" }}>{datos.comidasDia} comidas/día · <span style={gradText}>{m.kcal} kcal</span></h1>
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px 80px" }}>
        <section className="fadeUp" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: -30, position: "relative", zIndex: 2 }}>
          {[["Calorías", `${m.kcal}`, "kcal / día"], ["Proteína", `${m.prot} g`, "prioridad nº1"], ["Carbohidratos", `${m.carbs} g`, "tu energía"], ["Grasas", `${m.grasa} g`, "salud hormonal"]].map(([t, v, s]) => (
            <div key={t} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>{t}</div>
              <div style={{ ...DF, fontSize: 26, fontWeight: 800, marginTop: 6 }}>{v}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </section>
        {/* "Hoy": el calendario decide qué día es, sin que el usuario tenga
            que ir buscándolo entre las pestañas de la semana. */}
        <div className="fadeUp" style={{ marginTop: 20, background: C.panel, border: `2px solid ${C.hot1}`, borderRadius: 20, padding: "20px 22px", boxShadow: `4px 4px 0 ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: C.hot1, fontWeight: 800 }}>📅 Hoy</div>
              <div style={{ ...DF, fontSize: 22, fontWeight: 800, marginTop: 4 }}>{fechaHoy}</div>
              <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>Te toca: {dieta[hoyIdx].comidas.map((c) => c.receta.nombre).join(" · ")}</div>
            </div>
            {diaDieta !== hoyIdx && (
              <button onClick={() => setDiaDieta(hoyIdx)} style={{ flexShrink: 0, background: "none", border: `1.5px solid ${C.line}`, color: C.text, borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}>Ir a hoy</button>
            )}
          </div>
          <button onClick={() => setIngredientesAbiertos((a) => !a)} style={{ ...btnSecundario, marginTop: 14, minWidth: 0, padding: "10px 20px", fontSize: 13 }}>
            {ingredientesAbiertos ? "Ocultar ingredientes de hoy" : `Ver ingredientes de hoy (${ingredientesHoy.length})`}
          </button>
          {ingredientesAbiertos && (
            <ul className="fadeUp" style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
              {ingredientesHoy.map((ing) => {
                const marcado = marcados.has(ing.clave);
                return (
                  <li key={ing.clave}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, lineHeight: 1.4, color: marcado ? C.dim : C.text, textDecoration: marcado ? "line-through" : "none", cursor: "pointer" }}>
                      <input type="checkbox" checked={marcado} onChange={() => marcarIngrediente(ing.clave)} style={{ accentColor: C.hot1, width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                      {/* Ancho fijo (no minWidth): si el mismo ingrediente sale en varias
                          recetas del día, sus cantidades se unen con "+" y pueden ser
                          largas — con minWidth el texto empujaría el nombre fuera de la
                          tarjeta; con width fijo, hace wrap dentro de la columna. */}
                      <span style={{ ...DF, fontWeight: 800, fontSize: 13, width: 92, flexShrink: 0 }}>{ing.cantidades.join(" + ")}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{ing.nombre}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="fadeUp" style={{ marginTop: 26 }}>
          <div style={{ position: "relative", height: 150, borderRadius: 20, overflow: "hidden", marginBottom: 14 }}>
            <img src={BANNER_DIETA} alt="" onError={onImgError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(15,44,86,.85), rgba(15,44,86,.25))", display: "flex", alignItems: "center", padding: "0 26px" }}>
              <div style={{ color: "#fff" }}>
                <div style={{ ...DF, fontSize: 24, fontWeight: 800 }}>Tu semana de comidas</div>
                <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13, marginTop: 4 }}>~{m.kcal} kcal · {m.prot} g proteína al día</div>
              </div>
            </div>
          </div>
          {(datos.tipoDieta !== "omnivora" || alergiasNombres.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {datos.tipoDieta !== "omnivora" && (
                <span style={{ fontSize: 12, fontWeight: 700, color: C.hot2, border: `1px solid ${C.line}`, background: C.panel, borderRadius: 9, padding: "6px 14px" }}>🥗 {tipoDieta?.titulo}</span>
              )}
              {alergiasNombres.map((n) => (
                <span key={n} style={{ fontSize: 12, fontWeight: 700, color: C.hot2, border: `1px solid ${C.line}`, background: C.panel, borderRadius: 9, padding: "6px 14px" }}>🚫 Sin {n.toLowerCase()}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
            {dieta.map((d, i) => (
              <button key={d.dia} onClick={() => setDiaDieta(i)} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1.5px solid ${diaDieta === i ? C.hot1 : C.line}`, color: diaDieta === i ? "#0F2C56" : C.dim, ...(diaDieta === i ? grad : { background: C.panel }) }}>{d.dia}{i === hoyIdx ? " · Hoy" : ""}</button>
            ))}
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {dieta[diaDieta].comidas.map((c, i) => {
              const id = `${diaDieta}-${i}`;
              const abierto = recetaAbierta === id;
              const img = U(FOODIMG[c.receta.img], 600);
              return (
                <div key={id} className="exwrap fadeUp" style={{ animationDelay: `${i * 55}ms`, background: C.panel, border: `1px solid ${abierto ? C.hot1 : C.line}`, borderRadius: 18, overflow: "hidden", transition: "border-color .15s" }}>
                  <button onClick={() => setRecetaAbierta(abierto ? null : id)} style={{ display: "flex", alignItems: "stretch", gap: 0, width: "100%", background: "none", border: "none", color: C.text, padding: 0, textAlign: "left" }}>
                    <div style={{ width: 108, flexShrink: 0, overflow: "hidden", position: "relative" }}>
                      <img className="eximg" src={img} alt={c.receta.nombre} loading="lazy" onError={onImgError} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", minWidth: 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.hora} · {c.nombre}</div>
                        <div style={{ ...DF, fontWeight: 800, fontSize: 17, marginTop: 4, lineHeight: 1.3 }}>{c.receta.nombre}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 17 }}>~{c.kcal}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>kcal</div>
                      </div>
                      <div style={{ color: C.dim, fontSize: 18 }}>{abierto ? "−" : "+"}</div>
                    </div>
                  </button>
                  {abierto && (
                    <div className="fadeUp" style={{ padding: "0 16px 18px", display: "grid", gridTemplateColumns: "minmax(140px,200px) 1fr", gap: 18, alignItems: "start" }}>
                      <img src={img} alt={c.receta.nombre} onError={onImgError} style={{ width: "100%", borderRadius: 14, aspectRatio: "1/1", objectFit: "cover", border: `1px solid ${C.line}` }} />
                      <DetalleReceta ingredientes={c.receta.ingredientes} pasos={c.receta.pasos} youtube={youtubeUrl(c.receta.nombre)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>💧 Bebe 2–2,5 L de agua al día. Las cantidades son orientativas: ajústalas a tu hambre y progreso. Plan informativo, no sustituye a un médico o dietista.</div>
        </div>
      </div>
    </div>
  );
}

// Bloque de ingredientes + modo de elaboración + enlace a YouTube, común a las
// fichas del plan, del recetario y de la sección de cine.
function DetalleReceta({ ingredientes, pasos, youtube }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Ingredientes</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
        {ingredientes.map((ing) => (
          <li key={ing.nombre} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "#3A4A66" }}>
            <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 13, flexShrink: 0, minWidth: 74 }}>{ing.cantidad}</span>{ing.nombre}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "18px 0 10px" }}>Modo de elaboración</div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {pasos.map((p, pi) => (
          <li key={pi} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.55, color: "#3A4A66" }}>
            <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{pi + 1}</span>{p}
          </li>
        ))}
      </ol>
      <a href={youtube} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 18, textDecoration: "none", background: "rgba(15,44,86,.08)", borderRadius: 10, padding: "11px 20px", fontWeight: 600, fontSize: 14, color: C.text }}>
        <span style={{ ...grad, color: "#0F2C56", borderRadius: 9, width: 26, height: 26, display: "grid", placeItems: "center", fontSize: 12, flexShrink: 0 }}>▶</span>
        Ver vídeo de la receta en YouTube
      </a>
    </div>
  );
}

// Cabecera con banner que comparten las secciones de catálogo (recetario y cine).
function CabeceraSeccion({ banner, kicker, titulo, onBack, onLogin, onIrSeccion, actual }) {
  return (
    <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
      <img src={banner} alt="" onError={onImgError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,44,86,.4) 0%, rgba(242,237,233,.82) 62%, #F2EDE9 100%)" }} />
      <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} actual={actual} acciones={
        <button className="nav-item" onClick={onBack}>« Volver</button>
      } />
      <div className="popIn" style={{ position: "absolute", left: 0, right: 0, bottom: 26, maxWidth: 980, margin: "0 auto", padding: "0 18px", color: C.text }}>
        <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: C.hot1, fontWeight: 700 }}>{kicker}</div>
        <h1 style={{ ...DF, fontSize: "clamp(30px,6vw,54px)", fontWeight: 800, margin: "8px 0 0" }}>{titulo}</h1>
      </div>
    </div>
  );
}

// Ficha expandible de receta, compartida por el recetario y la sección de cine.
// `r` es un modelo unificado: etiqueta pequeña, nombre, kcal y fotos opcionales
// (escena de la obra y plato real) más el detalle (ingredientes, pasos, youtube).
function FichaReceta({ r, abierto, onToggle, onBorrar }: any) {
  const generica = U(FOODIMG[r.img] || FOODIMG.otro, 600);
  const thumb = r.fotoEscena || r.fotoPlato || generica;
  const plato = r.fotoPlato || generica;
  // Las fotos externas pueden caerse: se prueba primero la genérica del plato
  // y, si también falla, onImgError pinta el degradado de marca.
  const conRespaldo = (e) => { const t = e.currentTarget; if (t.src !== generica) t.src = generica; else onImgError(e); };
  // Corazón de favoritos (solo con sesión iniciada). Va como hermano absoluto
  // del botón-cabecera, no dentro, porque no se pueden anidar botones.
  const fav = useContext(FavoritosCtx);
  const esFav = !!fav && fav.ids.includes(r.id);
  // Compartir con un amigo: solo si hay contexto social y al menos un amigo.
  const social = useContext(SocialCtx);
  const puedeCompartir = !!social && social.amigos.length > 0;
  const [compartir, setCompartir] = useState(false);
  return (
    <div className="exwrap" style={{ position: "relative", background: C.panel, border: `1px solid ${abierto ? C.hot1 : C.line}`, borderRadius: 18, overflow: "hidden", transition: "border-color .15s" }}>
      {fav && (
        <button onClick={() => fav.alternar(r.id)} aria-pressed={esFav} aria-label={esFav ? `Quitar ${r.nombre} de favoritos` : `Guardar ${r.nombre} en favoritos`}
          title={esFav ? "Quitar de favoritos" : "Guardar en favoritos"}
          style={{ position: "absolute", top: 8, left: 8, zIndex: 2, width: 32, height: 32, padding: 0, borderRadius: "50%", background: "#fff", border: `2px solid ${C.line}`, boxShadow: `2px 2px 0 ${C.line}`, display: "grid", placeItems: "center", fontSize: 15, lineHeight: 1, color: esFav ? C.hot1 : C.line }}>
          {esFav ? "♥" : "♡"}
        </button>
      )}
      {puedeCompartir && (
        <button onClick={() => setCompartir(true)} aria-label={`Compartir ${r.nombre} con un amigo`} title="Compartir con un amigo"
          style={{ position: "absolute", top: 8, left: fav ? 46 : 8, zIndex: 2, width: 32, height: 32, padding: 0, borderRadius: "50%", background: "#fff", border: `2px solid ${C.line}`, boxShadow: `2px 2px 0 ${C.line}`, display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1, color: C.line }}>
          ➦
        </button>
      )}
      {compartir && <CompartirReceta receta={r} onCerrar={() => setCompartir(false)} />}
      <button onClick={onToggle} style={{ display: "flex", alignItems: "stretch", gap: 0, width: "100%", background: "none", border: "none", color: C.text, padding: 0, textAlign: "left" }}>
        <div style={{ width: 108, flexShrink: 0, overflow: "hidden", position: "relative" }}>
          <img className="eximg" src={thumb} alt={r.nombre} loading="lazy" onError={conRespaldo} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>{r.etiqueta}</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 17, marginTop: 4, lineHeight: 1.3 }}>{r.nombre}</div>
          </div>
          {r.kcal != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 17 }}>~{r.kcal}</div>
              <div style={{ fontSize: 11, color: C.dim }}>kcal</div>
            </div>
          )}
          <div style={{ color: C.dim, fontSize: 18 }}>{abierto ? "−" : "+"}</div>
        </div>
      </button>
      {abierto && (
        <div className="fadeUp" style={{ padding: "0 16px 18px" }}>
          {r.escena && (r.fotoEscena ? (
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 16, border: `1px solid ${C.line}` }}>
              <img src={r.fotoEscena} alt={r.nombre} loading="lazy" onError={onImgError} style={{ width: "100%", aspectRatio: "21/9", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(15,44,86,.94))", display: "flex", alignItems: "flex-end", padding: "14px 16px" }}>
                <p style={{ margin: 0, color: "#E8EAEE", fontSize: 13.5, lineHeight: 1.55, fontStyle: "italic", textShadow: "0 1px 8px rgba(0,0,0,.9)" }}>{r.escena}</p>
              </div>
            </div>
          ) : (
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6, fontStyle: "italic", margin: "0 0 16px", borderLeft: `3px solid ${C.hot1}`, paddingLeft: 12 }}>{r.escena}</p>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,200px) 1fr", gap: 18, alignItems: "start" }}>
            <img src={plato} alt={r.nombre} loading="lazy" onError={conRespaldo} style={{ width: "100%", borderRadius: 14, aspectRatio: "1/1", objectFit: "cover", border: `1px solid ${C.line}` }} />
            <DetalleReceta ingredientes={r.ingredientes} pasos={r.pasos} youtube={r.youtube} />
          </div>
          {onBorrar && (
            <button onClick={onBorrar} style={{ marginTop: 16, background: "rgba(200,30,30,.08)", border: "1.5px solid rgba(200,30,30,.35)", color: "#B42318", borderRadius: 10, padding: "9px 20px", fontWeight: 600, fontSize: 13.5 }}>
              🗑 Borrar esta receta
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Adapta una receta de cine al modelo unificado que consume FichaReceta.
const fichaDeCine = (r) => ({
  id: r.id, nombre: r.plato, img: r.img, escena: r.escena, fotoEscena: r.fotoEscena, fotoPlato: r.fotoPlato,
  etiqueta: `🎬 ${r.obra} · ${r.tipo === "serie" ? "Serie" : "Película"}`,
  ingredientes: r.ingredientes, pasos: r.pasos, youtube: youtubeUrl(`${r.plato} ${r.obra}`),
});

// Sección "Cocina de película": recetas icónicas de series y pelis, solo para
// disfrutar. Independiente del plan semanal y del PDF.
function Cine({ onBack, onLogin, onIrSeccion }) {
  const [filtro, setFiltro] = useState("todas"); // "todas" | "serie" | "peli"
  const [abierta, setAbierta] = useState<string | null>(null);
  const lista = RECETAS_CINE.filter((r) => filtro === "todas" || r.tipo === filtro);
  return (
    <div>
      <CabeceraSeccion banner={BANNER_CINE} kicker="Fuera del plan · Solo por placer" titulo={<>Cocina de <span style={gradText}>película</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="cine" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>Platos míticos de tus series y películas favoritas, con la imagen de la obra y su receta completa para hacerlos en casa. Son un capricho: no cuentan para tu plan semanal ni salen en el PDF.</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[["todas", "Todas"], ["serie", "Series"], ["peli", "Películas"]].map(([id, t]) => (
            <button key={id} onClick={() => { setFiltro(id); setAbierta(null); }} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1.5px solid ${filtro === id ? C.hot1 : C.line}`, color: filtro === id ? "#0F2C56" : C.dim, ...(filtro === id ? grad : { background: C.panel }) }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {lista.map((r, i) => (
            <Aparece key={r.id} delay={Math.min(i, 6) * 60} rot={i % 2 ? 1.4 : -1.4}>
              <FichaReceta r={fichaDeCine(r)} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)} />
            </Aparece>
          ))}
        </div>
        <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>🍿 Estos platos son homenajes a sus series y películas: disfrútalos de vez en cuando, sin remordimientos. Tu plan semanal sigue intacto.</div>
      </div>
    </div>
  );
}

// Icono por tema de la noticia, para la etiqueta de cada plato de actualidad.
const ICONO_ACTUALIDAD = { deporte: "🏆", cultura: "🎭", efemeride: "📅", mundo: "🌍" };
const nombreTemaActualidad = (c) => ({ deporte: "Deporte", cultura: "Cultura", efemeride: "Efeméride", mundo: "Mundo" }[c] || "Actualidad");

// Adapta una receta de actualidad al modelo unificado que consume FichaReceta.
const fichaDeActualidad = (r) => ({
  id: r.id, nombre: r.plato, img: r.img, escena: r.escena, fotoEscena: r.fotoEscena, fotoPlato: r.fotoPlato,
  etiqueta: `${ICONO_ACTUALIDAD[r.categoria] || "📰"} ${nombreTemaActualidad(r.categoria)} · ${r.titular}`,
  ingredientes: r.ingredientes, pasos: r.pasos, youtube: youtubeUrl(r.plato),
});

// Sección "Cocina de actualidad": cada semana una tarea programada añade un
// plato inspirado en una noticia real. Independiente del plan semanal y el PDF.
function Actualidad({ onBack, onLogin, onIrSeccion }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  // Más recientes primero, por fecha de la noticia.
  const lista = [...RECETAS_ACTUALIDAD].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return (
    <div>
      <CabeceraSeccion banner={BANNER_ACTUALIDAD} kicker="Fuera del plan · Al ritmo de la actualidad" titulo={<>Cocina de <span style={gradText}>actualidad</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="actualidad" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>Platos inspirados en lo que pasa en el mundo: cada semana sumamos una receta ligada a una noticia de deporte, cultura o efemérides. Son un capricho: no cuentan para tu plan semanal ni salen en el PDF.</p>
        <div style={{ display: "grid", gap: 14 }}>
          {lista.map((r, i) => (
            <Aparece key={r.id} delay={Math.min(i, 6) * 60} rot={i % 2 ? 1.4 : -1.4}>
              <FichaReceta r={fichaDeActualidad(r)} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)} />
            </Aparece>
          ))}
        </div>
        <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>📰 Recetas al hilo de la actualidad: se renuevan solas cada semana. Tu plan semanal sigue intacto.</div>
      </div>
    </div>
  );
}

// Recetario completo: todas las recetas de la app (plan + cine + actualidad) con
// buscador por nombre o ingrediente y filtro por categoría.
const CATS_RECETARIO = [["todas", "Todas"], ["desayuno", "Desayunos"], ["comida", "Comidas"], ["cena", "Cenas"], ["snack", "Snacks"], ["cine", "🎬 De cine"], ["actualidad", "📰 Actualidad"], ["comunidad", "👥 Comunidad"]];
const NOMBRE_CAT = { desayuno: "Desayuno", comida: "Comida", cena: "Cena", snack: "Snack" };

// Recetas publicadas por la comunidad (tabla recetas_comunidad). En modo
// invitado sin Supabase la lista queda vacía y las pantallas funcionan igual.
function useRecetasComunidad() {
  const [comunidad, setComunidad] = useState<any[]>([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("recetas_comunidad").select("id, user_id, autor, receta").order("creado_en", { ascending: false })
      .then(({ data }) => setComunidad(data ?? []));
  }, []);
  return [comunidad, setComunidad] as const;
}

// Todas las recetas de la app (comunidad + plan + cine + actualidad) en el
// modelo unificado de FichaReceta. Lo comparten el recetario y los favoritos.
const recetasUnificadas = (comunidad) => [
  ...comunidad.map((row) => ({
    id: row.id, user_id: row.user_id, nombre: row.receta.nombre, img: row.receta.img, categoria: "comunidad",
    kcal: row.receta.kcalAprox, etiqueta: `👥 Comunidad · ${row.autor}`,
    ingredientes: row.receta.ingredientes, pasos: row.receta.pasos, youtube: youtubeUrl(row.receta.nombre),
  })),
  ...RECETAS.map((r) => ({ id: r.id, nombre: r.nombre, img: r.img, categoria: r.categoria, kcal: r.kcalAprox, etiqueta: NOMBRE_CAT[r.categoria], ingredientes: r.ingredientes, pasos: r.pasos, youtube: youtubeUrl(r.nombre) })),
  ...RECETAS_CINE.map((r) => ({ ...fichaDeCine(r), categoria: "cine" })),
  ...RECETAS_ACTUALIDAD.map((r) => ({ ...fichaDeActualidad(r), categoria: "actualidad" })),
];

function Recetario({ onBack, onLogin, onIrSeccion, onCrear }) {
  const { user, enabled } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [cat, setCat] = useState("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [comunidad, setComunidad] = useRecetasComunidad();
  const borrarComunidad = async (id) => {
    if (!supabase || !window.confirm("¿Seguro que quieres borrar esta receta? No se puede deshacer.")) return;
    const { error } = await supabase.from("recetas_comunidad").delete().eq("id", id);
    if (!error) setComunidad((c) => c.filter((r) => r.id !== id));
  };
  const todas = useMemo(() => recetasUnificadas(comunidad), [comunidad]);
  const q = normalizar(busqueda.trim());
  const lista = todas.filter((r) => (cat === "todas" || r.categoria === cat)
    && (!q || normalizar(r.nombre).includes(q) || r.ingredientes.some((ing) => normalizar(ing.nombre).includes(q))));
  return (
    <div>
      <CabeceraSeccion banner={BANNER_RECETARIO} kicker={`${todas.length} recetas · Todas con foto y elaboración`} titulo={<>El <span style={gradText}>recetario</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="recetario" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>Todas las recetas de PULSO en un solo sitio. Búscalas por nombre o por ingrediente y ábrelas para ver sus cantidades y su elaboración paso a paso.</p>
        {enabled && (
          <div className="fadeUp" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ ...DF, fontWeight: 800, fontSize: 16 }}>¿Tienes un plato propio?</div>
              <div style={{ color: C.dim, fontSize: 13.5, marginTop: 2 }}>{user ? "Publícalo con los ingredientes de nuestra despensa y compártelo con la comunidad." : "Inicia sesión para crear tu receta y publicarla en la comunidad."}</div>
            </div>
            <button className="btn-cta" onClick={user ? onCrear : onLogin} style={{ ...btnPrimario, minWidth: 0, padding: "11px 24px", flexShrink: 0 }}>
              {user ? "+ Crear mi receta" : "Iniciar sesión"}
            </button>
          </div>
        )}
        <div className="fadeUp" style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setAbierta(null); }} placeholder="Busca por nombre o ingrediente: salmón, avena, sándwich…" aria-label="Buscar receta" style={{ width: "100%", boxSizing: "border-box", padding: "16px 20px 16px 50px", borderRadius: 9, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {CATS_RECETARIO.map(([id, t]) => (
            <button key={id} onClick={() => { setCat(id); setAbierta(null); }} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1.5px solid ${cat === id ? C.hot1 : C.line}`, color: cat === id ? "#0F2C56" : C.dim, ...(cat === id ? grad : { background: C.panel }) }}>{t}</button>
          ))}
        </div>
        <div style={{ color: C.dim, fontSize: 13, marginBottom: 14 }}>{lista.length === 1 ? "1 receta" : `${lista.length} recetas`}</div>
        {lista.length === 0 ? (
          <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "30px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>🍽️</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 18, marginTop: 8 }}>No hay recetas con esa búsqueda</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "6px 0 16px" }}>Prueba con otro nombre o ingrediente, o quita los filtros.</p>
            <button className="btn-cta" onClick={() => { setBusqueda(""); setCat("todas"); }} style={{ ...btnPrimario, minWidth: 0, padding: "10px 24px" }}>Ver todas las recetas</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {lista.map((r, i) => (
              <Aparece key={r.id} delay={Math.min(i, 6) * 55} rot={i % 2 ? 1.4 : -1.4}>
                <FichaReceta r={r} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)}
                  onBorrar={r.categoria === "comunidad" && puedeBorrarReceta(user, r) ? () => borrarComunidad(r.id) : undefined} />
              </Aparece>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sección "Favoritos": las recetas que el usuario marcó con el corazón,
// guardadas en su cuenta (tabla favoritos). El menú solo la enlaza con sesión
// iniciada; si se llega sin sesión (p. ej. tras salir), invita a entrar.
function Favoritos({ onBack, onLogin, onIrSeccion }) {
  const { user } = useAuth();
  const fav = useContext(FavoritosCtx);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [comunidad] = useRecetasComunidad();
  const todas = useMemo(() => recetasUnificadas(comunidad), [comunidad]);
  // Ids sin receta (p. ej. una de la comunidad ya borrada) se ignoran sin más.
  const lista = fav ? todas.filter((r) => fav.ids.includes(r.id)) : [];
  return (
    <div>
      <CabeceraSeccion banner={BANNER_FAVORITOS} kicker="Tu colección · Solo la ves tú" titulo={<>Tus <span style={gradText}>favoritos</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="favoritos" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        {!user ? (
          <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "30px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>♥</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 18, marginTop: 8 }}>Tus favoritos te esperan</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "6px 0 16px" }}>Inicia sesión para guardar recetas con el corazón y tenerlas siempre a mano.</p>
            <button className="btn-cta" onClick={onLogin} style={{ ...btnPrimario, minWidth: 0, padding: "10px 24px" }}>Iniciar sesión</button>
          </div>
        ) : lista.length === 0 ? (
          <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "30px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>♡</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 18, marginTop: 8 }}>Aún no tienes favoritos</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "6px 0 16px" }}>Pulsa el corazón de cualquier receta del recetario, del cine o de la actualidad y aparecerá aquí.</p>
            <button className="btn-cta" onClick={() => onIrSeccion("recetario")} style={{ ...btnPrimario, minWidth: 0, padding: "10px 24px" }}>Ir al recetario</button>
          </div>
        ) : (
          <>
            <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>{lista.length === 1 ? "1 receta guardada" : `${lista.length} recetas guardadas`} en tu cuenta, disponibles desde cualquier dispositivo. Vuelve a pulsar el corazón para sacar una de la lista.</p>
            <div style={{ display: "grid", gap: 14 }}>
              {lista.map((r, i) => (
                <Aparece key={r.id} delay={Math.min(i, 6) * 55} rot={i % 2 ? 1.4 : -1.4}>
                  <FichaReceta r={r} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)} />
                </Aparece>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Pantalla "Crea tu receta": formulario para publicar una receta de la
   comunidad. Los ingredientes se eligen de la despensa de la web
   (INGREDIENTES_WEB) y la receta se guarda en la tabla recetas_comunidad,
   de donde el Recetario la lee para todo el mundo. */
const NOMBRES_FOODIMG = { pescado: "Pescado", pollo: "Pollo", carne: "Carne", huevo: "Huevo", avena: "Avena", yogur: "Yogur", ensalada: "Ensalada", arroz: "Arroz", pasta: "Pasta", legumbre: "Legumbre", tostada: "Tostada", batido: "Batido", fruta: "Fruta", patata: "Patata", verdura: "Verdura", otro: "Otro" };

function CrearReceta({ onVolver, onLogin, onIrSeccion }) {
  const { user } = useAuth();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("comida");
  const [img, setImg] = useState("otro");
  const [kcal, setKcal] = useState("");
  const [ingredientes, setIngredientes] = useState<{ nombre: string; cantidad: string }[]>([]);
  const [pasos, setPasos] = useState(["", ""]);
  const [buscaIng, setBuscaIng] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [publicando, setPublicando] = useState(false);

  const q = normalizar(buscaIng.trim());
  const despensa = INGREDIENTES_WEB.filter((n) => !ingredientes.some((i) => i.nombre === n) && (!q || normalizar(n).includes(q)));

  const anadirIngrediente = (n) => { setIngredientes((l) => [...l, { nombre: n, cantidad: "" }]); setBuscaIng(""); };
  const setCantidad = (idx, v) => setIngredientes((l) => l.map((i, j) => (j === idx ? { ...i, cantidad: v } : i)));
  const quitarIngrediente = (idx) => setIngredientes((l) => l.filter((_, j) => j !== idx));
  const setPaso = (idx, v) => setPasos((l) => l.map((p, j) => (j === idx ? v : p)));

  const publicar = async () => {
    const borrador = { nombre: nombre.trim(), categoria, img, kcalAprox: Number(kcal), ingredientes, pasos: pasos.map((p) => p.trim()).filter(Boolean) };
    const errs = validarRecetaComunidad(borrador);
    if (!user) errs.push("Necesitas iniciar sesión para publicar tu receta.");
    setErrores(errs);
    if (errs.length || !supabase || !user) return;
    setPublicando(true);
    // El autor se muestra en la ficha pública: la parte local del correo, sin dominio.
    const autor = (user.email ?? "").split("@")[0] || "usuario";
    const { error } = await supabase.from("recetas_comunidad").insert({ user_id: user.id, autor, receta: borrador });
    setPublicando(false);
    if (error) { setErrores(["No se pudo publicar la receta. Vuelve a intentarlo en un momento."]); return; }
    onVolver();
  };

  const etiqueta = { fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" as const, margin: "24px 0 10px" };
  const inputBase = { boxSizing: "border-box" as const, padding: "13px 16px", borderRadius: 14, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15, width: "100%" };
  const chip = (activo) => ({ flexShrink: 0, padding: "9px 16px", borderRadius: 9, fontWeight: 700, fontSize: 13.5, border: `1.5px solid ${activo ? C.hot1 : C.line}`, color: activo ? "#0F2C56" : C.dim, ...(activo ? grad : { background: C.panel }) });

  return (
    <div>
      <CabeceraSeccion banner={BANNER_RECETARIO} kicker="Comunidad · Comparte tu plato" titulo={<>Crea tu <span style={gradText}>receta</span></>} onBack={onVolver} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="recetario" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 640 }}>Elige los ingredientes de la despensa de PULSO, cuenta cómo se prepara y publícala: aparecerá en el recetario para toda la comunidad.</p>

        <div style={etiqueta}>Nombre del plato</div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Bol de arroz con verduras al curry" style={inputBase} />

        <div style={etiqueta}>Categoría</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CATEGORIAS_RECETA.map((c) => (
            <button key={c} onClick={() => setCategoria(c)} style={chip(categoria === c)}>{NOMBRE_CAT[c]}</button>
          ))}
        </div>

        <div style={etiqueta}>Tipo de plato (elige la foto)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.keys(FOODIMG).map((k) => (
            <button key={k} onClick={() => setImg(k)} style={chip(img === k)}>{NOMBRES_FOODIMG[k] ?? k}</button>
          ))}
        </div>

        <div style={etiqueta}>Kcal aproximadas por ración</div>
        <input type="number" min={50} max={2000} value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="400" style={{ ...inputBase, maxWidth: 180 }} />

        <div style={etiqueta}>Ingredientes {ingredientes.length > 0 && `· ${ingredientes.length} elegidos`}</div>
        {ingredientes.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {ingredientes.map((ing, idx) => (
              <div key={ing.nombre} style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "8px 8px 8px 16px" }}>
                <div style={{ flex: 1, fontSize: 14.5, minWidth: 0 }}>{ing.nombre}</div>
                <input value={ing.cantidad} onChange={(e) => setCantidad(idx, e.target.value)} placeholder="Cantidad: 150 g, 1 unidad…" aria-label={`Cantidad de ${ing.nombre}`} style={{ ...inputBase, width: 190, padding: "9px 12px", background: C.bg, fontSize: 13.5 }} />
                <button onClick={() => quitarIngrediente(idx)} aria-label={`Quitar ${ing.nombre}`} style={{ background: "none", border: "none", color: C.dim, fontSize: 17, padding: "4px 10px" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <input value={buscaIng} onChange={(e) => setBuscaIng(e.target.value)} placeholder="🔍 Busca en la despensa: avena, salmón, tomate…" aria-label="Buscar ingrediente" style={inputBase} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, maxHeight: 190, overflowY: "auto", padding: 2 }}>
          {despensa.map((n) => (
            <button key={n} onClick={() => anadirIngrediente(n)} style={{ ...chip(false), padding: "7px 13px", fontWeight: 600 }}>+ {n}</button>
          ))}
          {despensa.length === 0 && <div style={{ color: C.dim, fontSize: 13.5, padding: "6px 2px" }}>No hay más ingredientes con esa búsqueda.</div>}
        </div>

        <div style={etiqueta}>Elaboración paso a paso</div>
        <div style={{ display: "grid", gap: 8 }}>
          {pasos.map((p, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15, flexShrink: 0, minWidth: 18, textAlign: "right" }}>{idx + 1}</span>
              <input value={p} onChange={(e) => setPaso(idx, e.target.value)} placeholder={idx === 0 ? "Ej. Cuece el arroz 12 minutos y resérvalo." : "Siguiente paso…"} aria-label={`Paso ${idx + 1}`} style={inputBase} />
              {pasos.length > 2 && <button onClick={() => setPasos((l) => l.filter((_, j) => j !== idx))} aria-label={`Quitar paso ${idx + 1}`} style={{ background: "none", border: "none", color: C.dim, fontSize: 17, padding: "4px 6px" }}>✕</button>}
            </div>
          ))}
        </div>
        <button onClick={() => setPasos((l) => [...l, ""])} style={{ marginTop: 10, background: "rgba(15,44,86,.08)", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 600, fontSize: 13.5, color: C.text }}>+ Añadir paso</button>

        {errores.length > 0 && (
          <div style={{ marginTop: 22, background: "rgba(200,30,30,.06)", border: "1.5px solid rgba(200,30,30,.3)", borderRadius: 16, padding: "14px 18px" }}>
            {errores.map((e) => <div key={e} style={{ color: "#B42318", fontSize: 14, lineHeight: 1.7 }}>· {e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <button className="btn-cta" onClick={publicar} disabled={publicando} style={{ ...btnPrimario, opacity: publicando ? 0.6 : 1 }}>{publicando ? "Publicando…" : "Publicar receta"}</button>
          <button className="btn-cta" onClick={onVolver} style={btnSecundario}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// Sección "Restaurantes": busca sitios para comer fuera acordes al plan.
// Usa el embed público de Google Maps (output=embed, sin clave de API): el
// mapa muestra los restaurantes de la zona con sus fichas y reseñas. Los
// chips afinan la búsqueda y se preseleccionan según la dieta del usuario.
const TIPOS_RESTAURANTE = [
  ["saludables", "Saludable"], ["veganos", "Vegano"], ["vegetarianos", "Vegetariano"],
  ["sin gluten", "Sin gluten"], ["de poke y bowls", "Poke y bowls"], ["de ensaladas", "Ensaladas"],
];

function Restaurantes({ datos, onBack, onLogin, onIrSeccion }) {
  const porDieta = { vegana: "veganos", vegetariana: "vegetarianos", sinGluten: "sin gluten", sinLactosa: "saludables" };
  const [lugar, setLugar] = useState("");
  const [tipo, setTipo] = useState(porDieta[datos?.tipoDieta] ?? "saludables");
  const [busqueda, setBusqueda] = useState<{ lugar: string; tipo: string } | null>(null);
  const buscar = (e) => { e.preventDefault(); if (lugar.trim()) setBusqueda({ lugar: lugar.trim(), tipo }); };
  const elegirTipo = (t) => { setTipo(t); if (busqueda) setBusqueda({ ...busqueda, tipo: t }); };
  const consulta = busqueda ? `restaurantes ${busqueda.tipo} en ${busqueda.lugar}` : "";
  return (
    <div>
      <CabeceraSeccion banner={BANNER_RESTAURANTES} kicker="Para comer fuera sin salirte del plan" titulo={<>Restaurantes <span style={gradText}>cerca de ti</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="restaurantes" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>Escribe tu ciudad o tu barrio y te enseñamos en el mapa restaurantes que encajan con tu forma de comer, con sus reseñas y su ubicación.</p>
        <form className="fadeUp" onSubmit={buscar} style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 260px" }}>
            <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📍</span>
            <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ciudad o zona: Madrid, Malasaña, Valencia…" aria-label="Ciudad o zona" style={{ width: "100%", boxSizing: "border-box", padding: "16px 20px 16px 50px", borderRadius: 9, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
          </div>
          <button className="btn-cta" type="submit" disabled={!lugar.trim()} style={{ ...btnPrimario, minWidth: 0, padding: "13px 32px", opacity: lugar.trim() ? 1 : 0.55 }}>Buscar</button>
        </form>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {TIPOS_RESTAURANTE.map(([id, t]) => (
            <button key={id} onClick={() => elegirTipo(id)} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1.5px solid ${tipo === id ? C.hot1 : C.line}`, color: tipo === id ? "#fff" : C.dim, ...(tipo === id ? grad : { background: C.panel }) }}>{t}</button>
          ))}
        </div>
        {busqueda ? (
          <div className="fadeUp">
            <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line}` }}>
              <iframe
                title={`Mapa de ${consulta}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(consulta)}&hl=es&output=embed`}
                style={{ width: "100%", height: 480, border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <a className="btn-cta" href={`https://www.google.com/maps/search/${encodeURIComponent(consulta)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSecundario, minWidth: 0, padding: "11px 24px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Abrir en Google Maps ↗</a>
              <span style={{ color: C.dim, fontSize: 13 }}>Resultados de Google Maps para «{consulta}»</span>
            </div>
          </div>
        ) : (
          <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 18, padding: "44px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>🗺️</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 18, marginTop: 8 }}>¿Dónde quieres comer?</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "6px 0 0", lineHeight: 1.6 }}>Introduce una ciudad o un barrio y elige el tipo de cocina:<br />te mostraremos el mapa con los restaurantes de la zona.</p>
          </div>
        )}
        <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>ℹ️ Los resultados y reseñas son de Google Maps. Si tienes alergias, confirma siempre las opciones directamente con el restaurante.</div>
      </div>
    </div>
  );
}

// Sección "Chef IA": chat de cocina exclusivo para usuarios con sesión.
// El navegador nunca ve la clave de la IA: habla con la Edge Function
// `chef` de Supabase, que valida el JWT, descuenta la cuota diaria y
// reenvía la respuesta de Claude en streaming.
const SUGERENCIAS_CHEF = [
  "¿Qué puedo cenar hoy?",
  "Dame una receta con lo que tengo en la nevera",
  "¿Cómo adapto una receta a mi dieta?",
  "Trucos para dejar la semana cocinada en 2 horas",
];

function Chef({ datos, onBack, onLogin, onIrSeccion }) {
  const { enabled, user } = useAuth();
  const [mensajes, setMensajes] = useState<{ rol: "usuario" | "chef"; texto: string }[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (mensajes.length) finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes]);

  // Contexto compacto que acompaña cada consulta: preferencias, plan de hoy
  // (si existe) y el catálogo resumido. Todo texto plano y barato en tokens.
  const contexto = useMemo(() => {
    const partes: string[] = [];
    const u = resumenUsuario(datos);
    if (u) partes.push(`Sobre el usuario: ${u}.`);
    if (datos?.objetivo && datos?.sexo) {
      const m = calcularMetricas(datos);
      const hoy = buildDiet(datos, m.kcal)[(new Date().getDay() + 6) % 7];
      partes.push(`Su plan de hoy (${hoy.dia}): ${hoy.comidas.map((c) => `${c.nombre} — ${c.receta.nombre}`).join("; ")}. Objetivo diario: ${m.kcal} kcal y ${m.prot} g de proteína.`);
    }
    partes.push(`Catálogo de recetas de PULSO:\n${resumenCatalogo()}`);
    return partes.join("\n\n");
  }, [datos]);

  const enviar = async (pregunta) => {
    const limpio = String(pregunta ?? "").trim();
    if (!limpio || ocupado || !supabase || !supabaseUrl) return;
    setTexto("");
    setOcupado(true);
    const historial = [...mensajes, { rol: "usuario" as const, texto: limpio }];
    setMensajes([...historial, { rol: "chef", texto: "" }]);
    const pintarRespuesta = (fn: (previo: string) => string) =>
      setMensajes((ms) => { const copia = [...ms]; copia[copia.length - 1] = { rol: "chef", texto: fn(copia[copia.length - 1].texto) }; return copia; });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
      const resp = await fetch(`${supabaseUrl}/functions/v1/chef`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseAnonKey!, "content-type": "application/json" },
        body: JSON.stringify({ mensajes: historial.slice(-12), contexto }),
      });
      if (!resp.ok) {
        const cuerpo = await resp.json().catch(() => null);
        if (resp.status === 429) setRestantes(0);
        throw new Error(cuerpo?.error || "El chef no ha podido responder. Inténtalo de nuevo en unos segundos.");
      }
      const usos = resp.headers.get("x-usos-restantes");
      if (usos != null) setRestantes(+usos);
      // La respuesta llega como SSE de la API de Claude: acumulamos los
      // fragmentos de texto (content_block_delta) según van llegando.
      const lector = resp.body!.getReader();
      const decodificador = new TextDecoder();
      let bufer = "";
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        bufer += decodificador.decode(value, { stream: true });
        const lineas = bufer.split("\n");
        bufer = lineas.pop() ?? "";
        for (const linea of lineas) {
          if (!linea.startsWith("data: ")) continue;
          try {
            const evento = JSON.parse(linea.slice(6));
            if (evento.type === "content_block_delta" && evento.delta?.type === "text_delta") {
              pintarRespuesta((previo) => previo + evento.delta.text);
            }
          } catch { /* fragmentos incompletos o eventos que no interesan */ }
        }
      }
      pintarRespuesta((previo) => previo || "El chef se ha quedado sin palabras. Prueba a preguntarlo de otra forma.");
    } catch (e: any) {
      pintarRespuesta(() => `⚠️ ${e?.message || "El chef no ha podido responder. Inténtalo de nuevo."}`);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div>
      <CabeceraSeccion banner={BANNER_CHEF} kicker="Tu asistente de cocina · Exclusivo para usuarios" titulo={<>Chef <span style={gradText}>PULSO</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="chef" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 80px" }}>
        {!enabled ? (
          <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 18, padding: "40px 22px", textAlign: "center", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
            El Chef IA necesita que la app esté conectada a Supabase. En esta instalación no está configurado.
          </div>
        ) : !user ? (
          <div className="fadeUp" style={{ background: C.panel, borderRadius: 18, padding: "44px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>👨‍🍳</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Tu chef personal te espera</div>
            <p style={{ color: C.dim, fontSize: 14, margin: "8px auto 20px", maxWidth: 420, lineHeight: 1.6 }}>Pregúntale cualquier duda de cocina: recetas con lo que tienes en la nevera, sustituciones, técnicas… Conoce tu dieta, tus alergias y todo el recetario de PULSO. Gratis, con 10 consultas al día.</p>
            <button className="btn-cta" onClick={onLogin} style={btnPrimario}>Iniciar sesión para empezar</button>
          </div>
        ) : (
          <>
            <p className="fadeUp" style={{ color: C.dim, fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
              Pregúntale al chef lo que quieras sobre cocina: conoce tu dieta, tus alergias y el recetario de PULSO.
              <span style={{ fontWeight: 700 }}> 10 consultas al día{restantes != null ? ` · te quedan ${Math.max(0, restantes)} hoy` : ""}.</span>
            </p>
            {mensajes.length === 0 && (
              <div className="fadeUp" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
                {SUGERENCIAS_CHEF.map((s) => (
                  <button key={s} onClick={() => enviar(s)} style={{ padding: "10px 18px", borderRadius: 999, fontWeight: 600, fontSize: 14, border: `1.5px solid ${C.line}`, color: C.dim, background: C.panel }}>{s}</button>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              {mensajes.map((m, i) => (
                <div key={i} className="fadeUp" style={{ justifySelf: m.rol === "usuario" ? "end" : "start", maxWidth: "85%", padding: "12px 16px", borderRadius: 18, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", ...(m.rol === "usuario" ? { ...grad, color: "#fff", borderBottomRightRadius: 6 } : { background: C.panel, color: C.text, borderBottomLeftRadius: 6 }) }}>
                  {m.texto || (ocupado && i === mensajes.length - 1 ? "El chef está pensando…" : "")}
                </div>
              ))}
              <div ref={finRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pregunta al chef: ¿qué hago con pollo y calabacín?" aria-label="Pregunta para el chef" disabled={ocupado || restantes === 0} style={{ flex: 1, minWidth: 0, padding: "14px 20px", borderRadius: 999, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
              <button className="btn-cta" type="submit" disabled={ocupado || restantes === 0 || !texto.trim()} style={{ ...btnPrimario, minWidth: 0, padding: "13px 28px", opacity: ocupado || restantes === 0 || !texto.trim() ? 0.55 : 1 }}>{ocupado ? "…" : "Enviar"}</button>
            </form>
            <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>👨‍🍳 El chef es una IA y puede equivocarse: sus respuestas son orientativas y no sustituyen el consejo de un médico o dietista. Con alergias, verifica siempre etiquetas e ingredientes.</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Amigos, chat y recetas compartidas (Fase 3)
   ============================================================ */

// Avatar redondo con la inicial del usuario, en los colores de marca.
function Avatar({ nombre, size = 40 }: { nombre: string; size?: number }) {
  const inicial = (nombre || "?").trim().charAt(0).toUpperCase();
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: "50%", background: C.hot2, border: `2px solid ${C.line}`, display: "grid", placeItems: "center", ...DF, fontSize: size * 0.44, color: C.text }}>{inicial}</div>
  );
}

// Modal para compartir una receta con un amigo por chat. Envía una instantánea
// de la receta (recetaSnapshot) que se sigue viendo aunque la original se borre.
function CompartirReceta({ receta, onCerrar }) {
  const social = useContext(SocialCtx);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [enviadoA, setEnviadoA] = useState<string[]>([]);
  if (!social) return null;
  const enviar = async (amigo) => {
    setEnviando(amigo.id);
    const { error } = await social.enviarMensaje(amigo.id, { texto: `Te comparto esta receta: ${receta.nombre}`, receta: recetaSnapshot(receta) });
    setEnviando(null);
    if (!error) setEnviadoA((l) => [...l, amigo.id]);
  };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,44,86,.5)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: 22, border: `2px solid ${C.line}`, boxShadow: `8px 8px 0 ${C.line}`, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...DF, fontWeight: 800, fontSize: 20 }}>Compartir receta</div>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ background: "none", border: "none", color: C.dim, fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: C.dim, fontSize: 13.5, margin: "4px 0 16px", lineHeight: 1.5 }}>Envía <b style={{ color: C.text }}>{receta.nombre}</b> a un amigo por el chat.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {social.amigos.map((a) => {
            const ya = enviadoA.includes(a.id);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 10px" }}>
                <Avatar nombre={a.nombre || a.usuario} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 14 }}>{a.nombre || a.usuario}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>@{a.usuario}</div>
                </div>
                <button className="btn-cta" onClick={() => enviar(a)} disabled={ya || enviando === a.id} style={{ ...btnPrimario, minWidth: 0, padding: "8px 16px", fontSize: 12, opacity: ya || enviando === a.id ? 0.6 : 1, background: ya ? C.panel2 : C.hot2 }}>
                  {ya ? "✓ Enviada" : enviando === a.id ? "…" : "Enviar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Tarjeta compacta de una receta recibida por chat: se despliega para ver
// ingredientes y elaboración con el mismo detalle que el recetario.
function RecetaCompartida({ receta }) {
  const [abierto, setAbierto] = useState(false);
  const generica = U(FOODIMG[receta.img] || FOODIMG.otro, 400);
  const thumb = receta.fotoPlato || generica;
  const conRespaldo = (e) => { const t = e.currentTarget; if (t.src !== generica) t.src = generica; else onImgError(e); };
  return (
    <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 14, overflow: "hidden", background: "#fff", marginTop: 8 }}>
      <button onClick={() => setAbierto((a) => !a)} style={{ display: "flex", width: "100%", gap: 0, background: "none", border: "none", textAlign: "left", padding: 0, color: C.text, alignItems: "stretch" }}>
        <img src={thumb} onError={conRespaldo} alt={receta.nombre} style={{ width: 66, flexShrink: 0, objectFit: "cover" }} />
        <div style={{ padding: "8px 12px", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.hot1, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>🍽 Receta compartida</div>
          <div style={{ ...DF, fontWeight: 800, fontSize: 14, lineHeight: 1.25, marginTop: 2 }}>{receta.nombre}</div>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{receta.kcal ? `~${receta.kcal} kcal · ` : ""}{abierto ? "ocultar receta ▲" : "ver receta ▼"}</div>
        </div>
      </button>
      {abierto && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.suave}` }}>
          <DetalleReceta ingredientes={receta.ingredientes || []} pasos={receta.pasos || []} youtube={youtubeUrl(receta.nombre)} />
        </div>
      )}
    </div>
  );
}

// Conversación 1 a 1 con un amigo. Carga el historial, lo mantiene al día con
// realtime, marca como leídos los mensajes recibidos y permite enviar texto.
function Chat({ amigo, onVolver }) {
  const social = useContext(SocialCtx);
  const { user } = useAuth();
  const uid = user?.id;
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const finRef = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    if (!supabase || !uid) return;
    const { data } = await supabase.from("mensajes").select("*")
      .or(`and(emisor.eq.${uid},receptor.eq.${amigo.id}),and(emisor.eq.${amigo.id},receptor.eq.${uid})`)
      .order("creado_en", { ascending: true });
    setMensajes(data ?? []);
    setCargando(false);
  }, [uid, amigo.id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes]);
  // Al abrir la conversación y con cada mensaje nuevo, marca como leídos los suyos.
  useEffect(() => { social?.marcarLeidos(amigo.id); }, [amigo.id, mensajes.length]); // eslint-disable-line

  // Realtime: mensajes nuevos que me envía este amigo.
  useEffect(() => {
    if (!supabase || !uid) return;
    const canal = supabase.channel(`chat:${uid}:${amigo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: `receptor=eq.${uid}` },
        (payload: any) => { if (payload.new.emisor === amigo.id) setMensajes((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new])); })
      .subscribe();
    return () => { supabase!.removeChannel(canal); };
  }, [uid, amigo.id]);

  const enviar = async (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !social) return;
    setTexto("");
    const { data, error } = await social.enviarMensaje(amigo.id, { texto: t });
    if (!error && data) setMensajes((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  };

  return (
    <div className="fadeUp">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button className="nav-item" onClick={onVolver} style={{ fontSize: 13 }}>‹ Amigos</button>
        <Avatar nombre={amigo.nombre || amigo.usuario} size={38} />
        <div>
          <div style={{ ...DF, fontWeight: 800, fontSize: 17 }}>{amigo.nombre || amigo.usuario}</div>
          <div style={{ fontSize: 12, color: C.dim }}>@{amigo.usuario}</div>
        </div>
      </div>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 14px", minHeight: 320, maxHeight: "56vh", overflowY: "auto", display: "grid", gap: 10, alignContent: "start" }}>
        {cargando ? (
          <div style={{ color: C.dim, fontSize: 14, textAlign: "center", padding: 20 }}>Cargando conversación…</div>
        ) : mensajes.length === 0 ? (
          <div style={{ color: C.dim, fontSize: 14, textAlign: "center", padding: 20, lineHeight: 1.6 }}>Aún no os habéis escrito. ¡Rompe el hielo o compártele una receta! 🍽</div>
        ) : mensajes.map((m) => {
          const mio = m.emisor === uid;
          return (
            <div key={m.id} style={{ justifySelf: mio ? "end" : "start", maxWidth: "85%" }}>
              {m.texto && (
                <div style={{ padding: "10px 14px", borderRadius: 16, fontSize: 14.5, lineHeight: 1.5, whiteSpace: "pre-wrap", ...(mio ? { background: C.hot2, color: C.text, borderBottomRightRadius: 5 } : { background: C.panel2, color: C.text, borderBottomLeftRadius: 5 }) }}>{m.texto}</div>
              )}
              {m.receta && <RecetaCompartida receta={m.receta} />}
            </div>
          );
        })}
        <div ref={finRef} />
      </div>
      <form onSubmit={enviar} style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Escribe a ${amigo.nombre || amigo.usuario}…`} aria-label="Mensaje" style={{ flex: 1, minWidth: 0, padding: "14px 20px", borderRadius: 999, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
        <button className="btn-cta" type="submit" disabled={!texto.trim()} style={{ ...btnPrimario, minWidth: 0, padding: "13px 26px", opacity: texto.trim() ? 1 : 0.55 }}>Enviar</button>
      </form>
    </div>
  );
}

// Formulario para elegir el @usuario público (necesario para que te encuentren).
function ElegirUsuario({ social }) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const limpio = normalizarUsuario(valor);
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const { error } = await social.guardarUsuario(limpio);
    setGuardando(false);
    setError(error || "");
  };
  return (
    <div className="fadeUp" style={{ background: C.panel, border: `2px solid ${C.line}`, boxShadow: `5px 5px 0 ${C.line}`, borderRadius: 18, padding: "26px 22px", maxWidth: 460, margin: "0 auto" }}>
      <div style={{ fontSize: 30, textAlign: "center" }}>🙋</div>
      <div style={{ ...DF, fontWeight: 800, fontSize: 22, textAlign: "center", marginTop: 6 }}>Elige tu nombre de usuario</div>
      <p style={{ color: C.dim, fontSize: 14, textAlign: "center", margin: "8px 0 18px", lineHeight: 1.6 }}>Es tu identificador público para que tus amigos te encuentren y te agreguen. Minúsculas, números y guion bajo.</p>
      <form onSubmit={guardar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${C.line}`, borderRadius: 12, background: C.bg, padding: "0 14px" }}>
          <span style={{ ...DF, color: C.hot1, fontSize: 18 }}>@</span>
          <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="tu_usuario" autoFocus maxLength={20} style={{ flex: 1, border: "none", background: "none", padding: "14px 0", fontSize: 16, color: C.text, outline: "none" }} />
        </div>
        {limpio && <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8 }}>Serás <b style={{ color: C.text }}>@{limpio}</b></div>}
        {error && <div style={{ color: C.hot1, fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button className="btn-cta" type="submit" disabled={guardando || !!validarUsuario(limpio)} style={{ ...btnPrimario, width: "100%", marginTop: 16, padding: 14, opacity: guardando || validarUsuario(limpio) ? 0.6 : 1 }}>{guardando ? "Guardando…" : "Guardar usuario"}</button>
      </form>
    </div>
  );
}

// Buscador de usuarios por handle (RPC buscar_usuarios) con botón de agregar.
function BuscarAmigos({ social }) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [avisos, setAvisos] = useState<Record<string, string>>({});

  useEffect(() => {
    const termino = normalizarUsuario(q);
    if (termino.length < 2 || !supabase) { setResultados([]); return; }
    setBuscando(true);
    const t = setTimeout(async () => {
      const { data } = await supabase!.rpc("buscar_usuarios", { termino });
      setResultados(data ?? []);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const agregar = async (u) => {
    const codigo = await social.enviarSolicitud(u.usuario);
    setAvisos((a) => ({ ...a, [u.id]: MENSAJE_SOLICITUD[codigo] || MENSAJE_SOLICITUD.error }));
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca a un amigo por su @usuario…" aria-label="Buscar usuarios" style={{ width: "100%", boxSizing: "border-box", padding: "14px 18px 14px 44px", borderRadius: 12, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
      </div>
      {normalizarUsuario(q).length >= 2 && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {buscando && resultados.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: "4px 2px" }}>Buscando…</div>}
          {!buscando && resultados.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: "4px 2px" }}>Nadie con ese usuario. Prueba con otro nombre.</div>}
          {resultados.map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 10px" }}>
              <Avatar nombre={u.nombre || u.usuario} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...DF, fontWeight: 800, fontSize: 14 }}>{u.nombre || u.usuario}</div>
                <div style={{ fontSize: 12, color: C.dim }}>@{u.usuario}</div>
              </div>
              {avisos[u.id]
                ? <span style={{ fontSize: 12, color: C.dim, maxWidth: 130, textAlign: "right" }}>{avisos[u.id]}</span>
                : <button className="btn-cta" onClick={() => agregar(u)} style={{ ...btnPrimario, minWidth: 0, padding: "8px 16px", fontSize: 12 }}>+ Agregar</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sección "Amigos": elegir usuario, buscar y agregar, gestionar solicitudes,
// ver la lista de amigos y abrir el chat con cada uno. Solo con sesión iniciada.
function Amigos({ onBack, onLogin, onIrSeccion }) {
  const { enabled, user } = useAuth();
  const social = useContext(SocialCtx);
  const [chatCon, setChatCon] = useState<Amigo | null>(null);

  const cuerpo = () => {
    if (!enabled) return <Aviso icono="🤝" titulo="Los amigos necesitan Supabase" texto="En esta instalación la app no está conectada a Supabase, así que la parte social no está disponible." />;
    if (!user) return (
      <div className="fadeUp" style={{ background: C.panel, borderRadius: 18, padding: "44px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 30 }}>🤝</div>
        <div style={{ ...DF, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Conecta con tus amigos</div>
        <p style={{ color: C.dim, fontSize: 14, margin: "8px auto 20px", maxWidth: 420, lineHeight: 1.6 }}>Agrega amigos, chatea con ellos y compárteles tus recetas favoritas. Inicia sesión para empezar.</p>
        <button className="btn-cta" onClick={onLogin} style={btnPrimario}>Iniciar sesión</button>
      </div>
    );
    if (!social) return <Aviso icono="⏳" titulo="Un momento" texto="Cargando tu información…" />;
    if (!social.usuario) return <ElegirUsuario social={social} />;
    if (chatCon) return <Chat amigo={chatCon} onVolver={() => { setChatCon(null); social.refrescar(); }} />;

    return (
      <div style={{ display: "grid", gap: 22 }}>
        <div className="fadeUp" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: C.panel2, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "12px 16px" }}>
          <Avatar nombre={social.usuario} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tu usuario</div>
            <div style={{ ...DF, fontWeight: 800, fontSize: 18 }}>@{social.usuario}</div>
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, maxWidth: 220 }}>Comparte tu @usuario para que te agreguen.</div>
        </div>

        <div className="fadeUp">
          <SubtituloSocial>Buscar y agregar</SubtituloSocial>
          <BuscarAmigos social={social} />
        </div>

        {social.recibidas.length > 0 && (
          <div className="fadeUp">
            <SubtituloSocial>Solicitudes recibidas · {social.recibidas.length}</SubtituloSocial>
            <div style={{ display: "grid", gap: 8 }}>
              {social.recibidas.map((s) => (
                <div key={s.amistad_id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 10px" }}>
                  <Avatar nombre={s.nombre || s.usuario} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...DF, fontWeight: 800, fontSize: 14 }}>{s.nombre || s.usuario}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>@{s.usuario}</div>
                  </div>
                  <button className="btn-cta" onClick={() => social.responderSolicitud(s.amistad_id, true)} style={{ ...btnPrimario, minWidth: 0, padding: "8px 14px", fontSize: 12 }}>Aceptar</button>
                  <button onClick={() => social.responderSolicitud(s.amistad_id, false)} aria-label="Rechazar" style={{ background: "none", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.dim }}>Rechazar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {social.enviadas.length > 0 && (
          <div className="fadeUp">
            <SubtituloSocial>Solicitudes enviadas · {social.enviadas.length}</SubtituloSocial>
            <div style={{ display: "grid", gap: 8 }}>
              {social.enviadas.map((s) => (
                <div key={s.amistad_id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 12, padding: "8px 10px" }}>
                  <Avatar nombre={s.nombre || s.usuario} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...DF, fontWeight: 800, fontSize: 14 }}>{s.nombre || s.usuario}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>@{s.usuario}</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.dim }}>Pendiente</span>
                  <button onClick={() => social.eliminarAmigo(s.amistad_id)} aria-label="Cancelar solicitud" style={{ background: "none", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.dim }}>Cancelar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fadeUp">
          <SubtituloSocial>Tus amigos · {social.amigos.length}</SubtituloSocial>
          {social.amigos.length === 0 ? (
            <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 14, padding: "24px 18px", textAlign: "center", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>Todavía no tienes amigos. Búscalos arriba por su @usuario y envíales una solicitud.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {social.amigos.map((a) => {
                const sinLeer = social.noLeidos[a.id] || 0;
                return (
                  <button key={a.amistad_id} onClick={() => setChatCon(a)} className="exwrap" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", color: C.text }}>
                    <Avatar nombre={a.nombre || a.usuario} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...DF, fontWeight: 800, fontSize: 15 }}>{a.nombre || a.usuario}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>@{a.usuario}</div>
                    </div>
                    {sinLeer > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box", background: C.hot1, color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 800, lineHeight: "20px", textAlign: "center" }}>{sinLeer > 9 ? "9+" : sinLeer}</span>}
                    <span style={{ color: C.dim, fontSize: 20 }}>›</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <CabeceraSeccion banner={BANNER_AMIGOS} kicker="Comunidad · Solo con sesión" titulo={<>Tus <span style={gradText}>amigos</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="amigos" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 80px" }}>
        {cuerpo()}
      </div>
    </div>
  );
}

// Subtítulo de bloque para la sección de amigos.
function SubtituloSocial({ children }) {
  return <div style={{ ...DF, fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10, letterSpacing: "0.04em" }}>{children}</div>;
}

// Aviso genérico centrado (sin sesión, sin Supabase, cargando…).
function Aviso({ icono, titulo, texto }) {
  return (
    <div className="fadeUp" style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 18, padding: "40px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>{icono}</div>
      <div style={{ ...DF, fontWeight: 800, fontSize: 20, marginTop: 8 }}>{titulo}</div>
      <p style={{ color: C.dim, fontSize: 14, margin: "8px auto 0", maxWidth: 420, lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}
