import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
   PULSO — Web de entrenamiento y nutrición, estilo editorial
   cinematográfico (inspiración Tesla / Nike): banners a
   pantalla completa con foto real, tipografía grande,
   sección con imagen por objetivo y foto por ejercicio.
   Imágenes: Unsplash (fuente libre) vía URL directa.
   ============================================================ */

const C = {
  bg: "#0A0B0D", panel: "#131519", panel2: "#1A1D22",
  line: "#282C33", text: "#F6F5F2", dim: "#9CA3AE",
  hot1: "#FF4D2E", hot2: "#FF9A3C",
};
const grad = { backgroundImage: `linear-gradient(90deg, ${C.hot1}, ${C.hot2})` };
const gradText = { backgroundImage: `linear-gradient(90deg, ${C.hot1}, ${C.hot2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
const DF = { fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", letterSpacing: "-0.03em" };
const U = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const EXIMG = {
  sentadilla: U("1574680096145-d05b474e2155", 800), flexiones: U("1598971639058-fab3c3109a00", 800),
  pesoMuerto: U("1517963879433-6ad2b056d712", 800), remo: U("1534368420009-621bfab424a8", 800),
  press: U("1583454110551-21f2fa2afe61", 800), zancada: U("1434608519344-49d77a699e1d", 800),
  plancha: U("1566241142559-40e1dab266c6", 800), burpee: U("1601422407692-ec4eeec1d9b3", 800),
  escalador: U("1434682881908-b43d0467b798", 800), curl: U("1581009146145-b5ef050c2e1e", 800),
  pressBanca: U("1534438327276-14e5300c3a48", 800), jalon: U("1598575468023-4a4a1e40d1c9", 800),
  hipThrust: U("1517836357463-d25dfeac3438", 800), correr: U("1571008887538-b36bb32f4571", 800),
  jumping: U("1518611012118-696072aa579a", 800), laterales: U("1541534741688-6078c6bfb5c5", 800),
};

const EX = {
  sentadilla: { nombre: "Sentadilla", musculo: "Piernas · Glúteo", pasos: ["Pies a la anchura de los hombros, puntas ligeramente hacia fuera.", "Baja empujando la cadera atrás, como si te sentaras en una silla.", "Rodillas siguiendo la dirección de los pies, espalda recta.", "Baja hasta que el muslo quede paralelo al suelo y sube empujando con los talones."] },
  flexiones: { nombre: "Flexiones", musculo: "Pecho · Tríceps", pasos: ["Manos algo más abiertas que los hombros, cuerpo en línea recta.", "Aprieta abdomen y glúteo para no arquear la lumbar.", "Baja el pecho hasta casi tocar el suelo, codos a 45°.", "Empuja con fuerza para volver arriba. Principiante: apoya rodillas."] },
  pesoMuerto: { nombre: "Peso muerto rumano", musculo: "Femoral · Glúteo", pasos: ["De pie con barra o mancuernas frente a los muslos.", "Baja el peso pegado a las piernas empujando la cadera atrás.", "Rodillas semiflexionadas y espalda siempre recta.", "Al notar tensión en el femoral, sube apretando el glúteo."] },
  remo: { nombre: "Remo con mancuerna", musculo: "Espalda · Bíceps", pasos: ["Apoya rodilla y mano en un banco, espalda paralela al suelo.", "Coge la mancuerna con el brazo estirado.", "Tira del codo hacia el techo llevando la mancuerna a la cadera.", "Baja controlando. Cambia de lado al terminar."] },
  press: { nombre: "Press militar", musculo: "Hombro · Tríceps", pasos: ["De pie, mancuernas a la altura de los hombros, palmas al frente.", "Aprieta el abdomen para no arquear la espalda.", "Empuja el peso arriba hasta estirar los brazos.", "Baja despacio hasta los hombros."] },
  zancada: { nombre: "Zancadas", musculo: "Piernas · Glúteo", pasos: ["Da un paso largo hacia delante.", "Baja hasta que ambas rodillas formen 90°.", "El torso siempre vertical.", "Empuja con el talón delantero para volver. Alterna piernas."] },
  plancha: { nombre: "Plancha", musculo: "Core · Abdomen", pasos: ["Apóyate sobre antebrazos y puntas de los pies.", "Cuerpo en línea recta de cabeza a talones.", "Aprieta abdomen y glúteo, no dejes caer la cadera.", "Respira controlado y aguanta el tiempo indicado."] },
  burpee: { nombre: "Burpees", musculo: "Cuerpo completo", pasos: ["Desde de pie, agáchate y apoya las manos en el suelo.", "Lanza los pies atrás a posición de flexión.", "Haz una flexión (opcional) y recoge los pies de un salto.", "Salta hacia arriba con los brazos extendidos. Repite fluido."] },
  escalador: { nombre: "Mountain climbers", musculo: "Core · Cardio", pasos: ["Posición de flexión con brazos estirados.", "Lleva una rodilla al pecho y vuelve.", "Alterna piernas rápido, como corriendo en el sitio.", "Mantén la cadera baja y el abdomen firme."] },
  curl: { nombre: "Curl de bíceps", musculo: "Bíceps", pasos: ["De pie, mancuernas a los lados, palmas al frente.", "Sube doblando solo el codo, sin balancearte.", "Aprieta el bíceps arriba un segundo.", "Baja lento y controlado."] },
  pressBanca: { nombre: "Press de banca", musculo: "Pecho · Tríceps", pasos: ["Túmbate con los pies firmes en el suelo.", "Agarre algo más abierto que los hombros.", "Baja la barra controlada a la mitad del pecho.", "Empuja arriba sin bloquear los codos."] },
  jalon: { nombre: "Jalón / Dominadas", musculo: "Espalda · Bíceps", pasos: ["Agarre más abierto que los hombros.", "Saca pecho y tira hacia la parte alta del pecho.", "Lleva los codos hacia abajo y atrás.", "Sube controlando. Si dominas el jalón, prueba dominadas."] },
  hipThrust: { nombre: "Hip thrust", musculo: "Glúteo · Femoral", pasos: ["Espalda alta apoyada en un banco, peso sobre la cadera.", "Pies firmes, rodillas a 90°.", "Empuja la cadera arriba apretando el glúteo.", "Arriba, cuerpo en línea recta. Baja controlado."] },
  correr: { nombre: "Carrera por intervalos", musculo: "Cardio", pasos: ["Calienta 5 min trotando suave.", "Alterna 1 min rápido con 2 min suaves.", "Repite el ciclo el tiempo indicado.", "Termina con 5 min de trote suave y estiramientos."] },
  jumping: { nombre: "Jumping jacks", musculo: "Cardio", pasos: ["De pie, brazos a los lados y pies juntos.", "Salta abriendo piernas y subiendo los brazos.", "Vuelve a la posición inicial con otro salto.", "Ritmo constante, aterriza suave."] },
  laterales: { nombre: "Elevaciones laterales", musculo: "Hombro", pasos: ["De pie, mancuernas ligeras a los lados.", "Sube los brazos a los lados hasta la altura del hombro.", "Codos ligeramente flexionados, sin balancearte.", "Baja lento resistiendo el peso."] },
};

function seriesReps(objetivo, nivel, ex) {
  const cardio = ["burpee", "escalador", "jumping", "correr"].includes(ex);
  if (ex === "correr") return { series: "1", reps: nivel === "principiante" ? "15 min" : nivel === "intermedio" ? "20 min" : "25 min", descanso: "—" };
  if (ex === "plancha") return { series: nivel === "principiante" ? "3" : "4", reps: nivel === "principiante" ? "30 seg" : nivel === "intermedio" ? "45 seg" : "60 seg", descanso: "45 seg" };
  if (cardio) return { series: nivel === "principiante" ? "3" : "4", reps: nivel === "principiante" ? "30 seg" : "40 seg", descanso: "30 seg" };
  if (objetivo === "ganar") return nivel === "principiante" ? { series: "3", reps: "8–10", descanso: "90 seg" } : nivel === "intermedio" ? { series: "4", reps: "8–10", descanso: "90 seg" } : { series: "4", reps: "6–8", descanso: "2 min" };
  if (objetivo === "perder") return { series: nivel === "principiante" ? "3" : "4", reps: "12–15", descanso: "45 seg" };
  if (objetivo === "resistencia") return { series: "3", reps: "15–20", descanso: "30 seg" };
  return { series: nivel === "principiante" ? "3" : "4", reps: "10–12", descanso: "60 seg" };
}

function buildWorkout(objetivo, nivel, dias) {
  const d3 = dias === 3;
  let plan;
  if (objetivo === "ganar") plan = d3
    ? [{ titulo: "Día 1 · Empuje", foco: "Pecho, hombro y tríceps", lista: ["pressBanca", "press", "flexiones", "laterales"] }, { titulo: "Día 2 · Tirón", foco: "Espalda y bíceps", lista: ["jalon", "remo", "pesoMuerto", "curl"] }, { titulo: "Día 3 · Pierna", foco: "Piernas, glúteo y core", lista: ["sentadilla", "zancada", "hipThrust", "plancha"] }]
    : [{ titulo: "Día 1 · Torso", foco: "Pecho, espalda y hombro", lista: ["pressBanca", "jalon", "press", "remo", "curl"] }, { titulo: "Día 2 · Pierna", foco: "Piernas, glúteo y core", lista: ["sentadilla", "pesoMuerto", "zancada", "hipThrust", "plancha"] }];
  else if (objetivo === "perder") plan = d3
    ? [{ titulo: "Día 1 · Full body A", foco: "Fuerza + quema", lista: ["sentadilla", "flexiones", "remo", "zancada", "plancha"] }, { titulo: "Día 2 · Cardio HIIT", foco: "Máxima quema calórica", lista: ["correr", "burpee", "escalador", "jumping"] }, { titulo: "Día 3 · Full body B", foco: "Fuerza + quema", lista: ["pesoMuerto", "press", "hipThrust", "escalador", "plancha"] }]
    : [{ titulo: "Día 1 · Full body A", foco: "Fuerza + quema", lista: ["sentadilla", "flexiones", "remo", "burpee", "plancha"] }, { titulo: "Día 2 · Full body B", foco: "Fuerza + cardio", lista: ["pesoMuerto", "press", "zancada", "escalador", "jumping"] }];
  else if (objetivo === "resistencia") plan = d3
    ? [{ titulo: "Día 1 · Circuito metabólico", foco: "Resistencia muscular", lista: ["sentadilla", "flexiones", "zancada", "escalador", "plancha"] }, { titulo: "Día 2 · Cardio intervalos", foco: "Capacidad aeróbica", lista: ["correr", "jumping", "burpee"] }, { titulo: "Día 3 · Circuito total", foco: "Cuerpo completo", lista: ["pesoMuerto", "remo", "press", "escalador", "plancha"] }]
    : [{ titulo: "Día 1 · Circuito total", foco: "Resistencia muscular", lista: ["sentadilla", "flexiones", "remo", "escalador", "plancha"] }, { titulo: "Día 2 · Cardio + core", foco: "Capacidad aeróbica", lista: ["correr", "burpee", "jumping", "plancha"] }];
  else plan = d3
    ? [{ titulo: "Día 1 · Fuerza torso", foco: "Músculo + tono", lista: ["pressBanca", "jalon", "press", "curl"] }, { titulo: "Día 2 · Fuerza pierna", foco: "Piernas y glúteo", lista: ["sentadilla", "pesoMuerto", "zancada", "hipThrust"] }, { titulo: "Día 3 · Metabólico", foco: "Quema + core", lista: ["burpee", "escalador", "jumping", "plancha"] }]
    : [{ titulo: "Día 1 · Fuerza total", foco: "Músculo + tono", lista: ["sentadilla", "pressBanca", "remo", "press", "plancha"] }, { titulo: "Día 2 · Fuerza + quema", foco: "Pierna y cardio", lista: ["pesoMuerto", "zancada", "hipThrust", "burpee", "escalador"] }];
  return plan.map((d) => ({ ...d, ejercicios: d.lista.map((k) => ({ key: k, ...EX[k], ...seriesReps(objetivo, nivel, k) })) }));
}

const DIETAS = {
  perder: { desayunos: ["Yogur griego natural con frutos rojos y 30 g de avena", "Tortilla de 2 huevos con espinacas + 1 pan integral", "Porridge de avena con manzana y canela", "Tostada integral con tomate, pavo y AOVE"], comidas: ["Pechuga de pollo, arroz integral (60 g) y brócoli", "Merluza al horno con patata cocida pequeña y ensalada", "Lentejas estofadas con verduras (plato mediano)", "Ternera magra salteada con pimientos y quinoa (50 g)"], cenas: ["Salmón a la plancha con espárragos", "Revuelto de huevo, champiñones y calabacín", "Ensalada de atún, huevo duro y ½ aguacate", "Pechuga de pavo con puré de coliflor"], snacks: ["1 fruta + 10 almendras", "Yogur desnatado", "Zanahorias con hummus", "Queso batido 0% con canela"] },
  ganar: { desayunos: ["Avena (80 g) con leche, plátano y crema de cacahuete", "4 tostadas integrales con aguacate y 3 huevos", "Batido: leche, avena (60 g), plátano y proteína", "Porridge con nueces, miel y yogur griego"], comidas: ["Arroz (100 g) con pollo (200 g) y AOVE", "Pasta integral (110 g) con ternera picada y tomate", "Salmón (200 g) con patata asada grande y verduras", "Garbanzos con arroz, huevo duro y atún"], cenas: ["Tortilla de 3 huevos con patata y ensalada", "Pollo al horno (200 g) con boniato y aguacate", "Atún con arroz (80 g) y pisto de verduras", "Hamburguesa casera de ternera con pan integral y queso"], snacks: ["Batido de proteína + plátano", "Puñado grande de frutos secos", "Yogur griego con miel y granola", "Sándwich integral de pavo y queso"] },
  ambos: { desayunos: ["Avena (50 g) con yogur griego y frutos rojos", "3 huevos revueltos con pan integral y tomate", "Batido: leche, plátano, avena (40 g) y proteína", "Tostadas integrales con aguacate y huevo poché"], comidas: ["Pollo (180 g) con arroz integral (80 g) y verduras", "Salmón con quinoa (70 g) y espárragos", "Lentejas con arroz y huevo duro", "Ternera magra con patata asada y ensalada"], cenas: ["Merluza al horno con boniato pequeño y brócoli", "Revuelto de 3 huevos con champiñones", "Pechuga de pavo con puré de patata y calabacín", "Ensalada de atún, huevo, aguacate y picatostes"], snacks: ["Yogur griego + nueces", "Fruta + queso fresco", "Batido de proteína", "Tortitas de arroz con crema de cacahuete"] },
  resistencia: { desayunos: ["Porridge de avena (60 g) con plátano y miel", "Tostadas integrales con mermelada y yogur griego", "Batido: leche, avena, frutos rojos y plátano", "Tortilla de 2 huevos con pan integral y zumo natural"], comidas: ["Pasta integral (90 g) con pollo y tomate", "Arroz (90 g) con salmón y verduras", "Cuscús con garbanzos, pasas y pollo", "Patata asada con atún y ensalada"], cenas: ["Arroz (60 g) con huevo y pisto", "Pescado blanco con boniato y calabacín", "Crema de verduras + tortilla francesa", "Pollo salteado con noodles integrales y verduras"], snacks: ["Plátano + dátiles", "Yogur con granola", "Tostada con miel", "Fruta + frutos secos"] },
};
const SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
function buildDiet(objetivo) {
  const d = DIETAS[objetivo];
  return SEMANA.map((dia, i) => ({ dia, comidas: [
    { nombre: "Desayuno", plato: d.desayunos[i % d.desayunos.length], hora: "08:00" },
    { nombre: "Media mañana", plato: d.snacks[i % d.snacks.length], hora: "11:00" },
    { nombre: "Comida", plato: d.comidas[i % d.comidas.length], hora: "14:00" },
    { nombre: "Merienda", plato: d.snacks[(i + 2) % d.snacks.length], hora: "17:30" },
    { nombre: "Cena", plato: d.cenas[i % d.cenas.length], hora: "21:00" },
  ] }));
}
function calcularMetricas({ sexo, edad, peso, altura, objetivo }) {
  const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === "hombre" ? 5 : -161);
  const tdee = tmb * 1.5;
  const ajuste = objetivo === "perder" ? -450 : objetivo === "ganar" ? 350 : objetivo === "resistencia" ? 150 : 0;
  const kcal = Math.round((tdee + ajuste) / 10) * 10;
  const prot = Math.round(peso * (objetivo === "ganar" ? 2.2 : 2));
  const grasa = Math.round(peso * 0.9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { kcal, prot, grasa, carbs };
}

const OBJETIVOS = [
  { id: "perder", titulo: "Perder peso", desc: "Quema grasa conservando músculo", img: U("1571019613454-1cb2f99b2d8b") },
  { id: "ganar", titulo: "Ganar músculo", desc: "Volumen limpio y fuerza", img: U("1581009146145-b5ef050c2e1e") },
  { id: "ambos", titulo: "Recomposición", desc: "Perder grasa y ganar músculo", img: U("1534438327276-14e5300c3a48") },
  { id: "resistencia", titulo: "Resistencia", desc: "Más energía y capacidad", img: U("1571008887538-b36bb32f4571") },
];
const HERO_IMG = U("1517838277536-f5f99be501cd");
const BANNER_DIETA = U("1490645935967-10de6ba17061");

export default function App() {
  const [fase, setFase] = useState("hero");
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ objetivo: null, sexo: null, edad: 28, peso: 75, altura: 172, nivel: null, dias: 3 });
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
  useEffect(() => { window.scrollTo(0, 0); }, [fase, paso]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(26px);} to {opacity:1; transform:none;} }
        @keyframes kenburns { from { transform: scale(1);} to { transform: scale(1.12);} }
        @keyframes scanline { 0%{top:0%;} 100%{top:100%;} }
        .fadeUp { animation: fadeUp .6s ease both; }
        button { cursor:pointer; font-family:inherit; }
        button:focus-visible { outline:2px solid ${C.hot2}; outline-offset:3px; }
        input[type=range]{ accent-color:${C.hot1}; }
        ::selection { background:${C.hot1}; color:#fff; }
        @media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms !important; } }
        .exwrap:hover .eximg { transform: scale(1.06); }
      `}</style>
      {fase === "hero" && <Hero onStart={() => setFase("form")} />}
      {fase === "form" && <Formulario datos={datos} set={set} paso={paso} setPaso={setPaso} onFinish={() => setFase("scan")} onBack={() => setFase("hero")} />}
      {fase === "scan" && <Scan onDone={() => setFase("plan")} />}
      {fase === "plan" && <Plan datos={datos} onReset={() => { setPaso(0); setDatos((d) => ({ ...d, objetivo: null, sexo: null, nivel: null })); setFase("hero"); }} />}
    </div>
  );
}

function Hero({ onStart }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenburns 18s ease-out both" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(10,11,13,.55) 0%, rgba(10,11,13,.35) 40%, rgba(10,11,13,.92) 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 480px at 78% 12%, rgba(255,77,46,.28), transparent 62%)` }} />
      </div>
      <header style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px" }}>
        <div style={{ ...DF, fontWeight: 800, fontSize: 24, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></div>
        <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.2em", textTransform: "uppercase" }}>Entrena · Come · Progresa</div>
      </header>
      <main className="fadeUp" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 28px 9vh", maxWidth: 1100 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.32em", color: C.hot2, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>Tu plan. Tu cuerpo. Tus reglas.</div>
        <h1 style={{ ...DF, fontSize: "clamp(46px, 9vw, 118px)", fontWeight: 800, lineHeight: 0.95, margin: 0 }}>Entrena con<br /><span style={gradText}>intención.</span></h1>
        <p style={{ color: "#D7DADF", fontSize: 18, maxWidth: 540, lineHeight: 1.6, marginTop: 26 }}>Dinos tu objetivo, edad y peso. En segundos generamos tu dieta semanal completa y tus entrenamientos, con cada ejercicio ilustrado y explicado paso a paso.</p>
        <div>
          <button onClick={onStart} style={{ ...grad, marginTop: 34, border: "none", color: "#0A0B0D", fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", padding: "19px 56px", borderRadius: 999, boxShadow: "0 10px 44px rgba(255,77,46,.4)", transition: "transform .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>CREAR MI PLAN GRATIS →</button>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 60, flexWrap: "wrap" }}>
          {[["4", "objetivos"], ["7 días", "de dieta"], ["16", "ejercicios con foto"]].map(([n, t]) => (
            <div key={t}><div style={{ ...DF, fontSize: 32, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{t}</div></div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Formulario({ datos, set, paso, setPaso, onFinish, onBack }) {
  const pasos = ["Objetivo", "Sobre ti", "Nivel y días"];
  const puedeSeguir = paso === 0 ? !!datos.objetivo : paso === 1 ? !!datos.sexo : !!datos.nivel;
  const next = () => (paso < 2 ? setPaso(paso + 1) : onFinish());
  return (
    <div style={{ minHeight: "100vh", maxWidth: 860, margin: "0 auto", padding: "26px 18px 40px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
        <button onClick={() => (paso === 0 ? onBack() : setPaso(paso - 1))} style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, borderRadius: 999, width: 42, height: 42, fontSize: 18 }} aria-label="Volver">←</button>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          {pasos.map((p, i) => (
            <div key={p} style={{ flex: 1 }}>
              <div style={{ height: 5, borderRadius: 4, background: i <= paso ? undefined : C.line, ...(i <= paso ? grad : {}) }} />
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: i === paso ? C.text : C.dim, marginTop: 8 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fadeUp" key={paso} style={{ flex: 1 }}>
        {paso === 0 && (
          <>
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>¿Cuál es tu objetivo?</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Todo el plan se diseñará alrededor de esto.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {OBJETIVOS.map((o) => {
                const activo = datos.objetivo === o.id;
                return (
                  <button key={o.id} onClick={() => set("objetivo", o.id)} style={{ position: "relative", height: 200, borderRadius: 20, overflow: "hidden", border: `2px solid ${activo ? C.hot1 : "transparent"}`, padding: 0, textAlign: "left", boxShadow: activo ? "0 10px 40px rgba(255,77,46,.3)" : "none", transition: "border-color .15s" }}>
                    <img src={o.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: activo ? "linear-gradient(180deg, rgba(255,77,46,.25), rgba(10,11,13,.9))" : "linear-gradient(180deg, rgba(10,11,13,.15), rgba(10,11,13,.88))" }} />
                    <div style={{ position: "absolute", left: 20, right: 20, bottom: 18 }}>
                      <div style={{ ...DF, fontWeight: 800, fontSize: 24, color: "#fff" }}>{o.titulo}</div>
                      <div style={{ color: "#D7DADF", fontSize: 13, marginTop: 4 }}>{o.desc}</div>
                    </div>
                    {activo && <div style={{ position: "absolute", top: 14, right: 14, ...grad, color: "#0A0B0D", fontWeight: 800, borderRadius: 999, width: 30, height: 30, display: "grid", placeItems: "center", fontSize: 16 }}>✓</div>}
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
                <button key={s} onClick={() => set("sexo", s)} style={{ flex: 1, padding: 16, borderRadius: 14, textTransform: "capitalize", fontWeight: 700, fontSize: 16, color: C.text, background: datos.sexo === s ? "linear-gradient(135deg, rgba(255,77,46,.18), rgba(255,154,60,.08))" : C.panel, border: `1.5px solid ${datos.sexo === s ? C.hot1 : C.line}` }}>{s === "hombre" ? "♂ Hombre" : "♀ Mujer"}</button>
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
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>Tu experiencia</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Ajustamos series, repeticiones y descansos a tu nivel.</p>
            <div style={{ display: "grid", gap: 12, marginBottom: 30 }}>
              {[["principiante", "Principiante", "Desde cero o menos de 6 meses"], ["intermedio", "Intermedio", "Entreno regular desde hace 6 meses – 2 años"], ["avanzado", "Avanzado", "Más de 2 años entrenando en serio"]].map(([id, t, d]) => (
                <button key={id} onClick={() => set("nivel", id)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.nivel === id ? "linear-gradient(135deg, rgba(255,77,46,.18), rgba(255,154,60,.08))" : C.panel, border: `1.5px solid ${datos.nivel === id ? C.hot1 : C.line}` }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 17 }}>{t}</div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>{d}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: C.dim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Días de entrenamiento por semana</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[2, 3].map((n) => (
                <button key={n} onClick={() => set("dias", n)} style={{ flex: 1, padding: 18, borderRadius: 14, color: C.text, fontWeight: 800, fontSize: 22, background: datos.dias === n ? "linear-gradient(135deg, rgba(255,77,46,.18), rgba(255,154,60,.08))" : C.panel, border: `1.5px solid ${datos.dias === n ? C.hot1 : C.line}`, ...DF }}>{n} <span style={{ fontSize: 13, fontWeight: 400, color: C.dim }}>días</span></button>
              ))}
            </div>
          </>
        )}
      </div>
      <button onClick={next} disabled={!puedeSeguir} style={{ ...(puedeSeguir ? grad : { background: C.panel2 }), marginTop: 34, border: "none", color: puedeSeguir ? "#0A0B0D" : C.dim, fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", padding: 18, borderRadius: 999, width: "100%", opacity: puedeSeguir ? 1 : 0.6, cursor: puedeSeguir ? "pointer" : "not-allowed" }}>{paso < 2 ? "CONTINUAR →" : "GENERAR MI PLAN ⚡"}</button>
    </div>
  );
}

function Scan({ onDone }) {
  const frases = ["Analizando tu metabolismo…", "Calculando calorías y macros…", "Diseñando tu dieta semanal…", "Construyendo tus entrenamientos…", "Ajustando a tu nivel…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 720); return () => clearInterval(t); }, []);
  useEffect(() => { if (i >= frases.length) onDone(); }, [i, onDone]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "relative", width: 200, height: 260, borderRadius: 24, overflow: "hidden", border: `1px solid ${C.line}`, marginBottom: 40 }}>
        <img src={U("1517838277536-f5f99be501cd", 600)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(.4) brightness(.7)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, ...grad, boxShadow: `0 0 24px ${C.hot1}`, animation: "scanline 1.4s linear infinite" }} />
      </div>
      <div className="fadeUp" key={i} style={{ ...DF, fontSize: 22, fontWeight: 700 }}>{frases[Math.min(i, frases.length - 1)]}</div>
      <div style={{ width: 260, height: 4, background: C.line, borderRadius: 4, marginTop: 22, overflow: "hidden" }}>
        <div style={{ height: "100%", ...grad, width: `${Math.min(100, ((i + 1) / frases.length) * 100)}%`, transition: "width .7s ease" }} />
      </div>
    </div>
  );
}

function Plan({ datos, onReset }) {
  const [tab, setTab] = useState("entreno");
  const [diaDieta, setDiaDieta] = useState(0);
  const [exAbierto, setExAbierto] = useState<string | null>(null);
  const m = useMemo(() => calcularMetricas(datos), [datos]);
  const entreno = useMemo(() => buildWorkout(datos.objetivo, datos.nivel, datos.dias), [datos]);
  const dieta = useMemo(() => buildDiet(datos.objetivo), [datos.objetivo]);
  const obj = OBJETIVOS.find((o) => o.id === datos.objetivo);
  return (
    <div>
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        <img src={obj?.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,11,13,.5), rgba(10,11,13,.95))" }} />
        <header style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <div style={{ ...DF, fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></div>
          <button onClick={onReset} style={{ background: "rgba(0,0,0,.4)", border: `1px solid ${C.line}`, color: C.text, borderRadius: 999, padding: "8px 18px", fontSize: 13, backdropFilter: "blur(6px)" }}>↺ Empezar de nuevo</button>
        </header>
        <div className="fadeUp" style={{ position: "absolute", left: 0, right: 0, bottom: 26, maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: C.hot2, fontWeight: 700 }}>Tu plan · {obj?.titulo}</div>
          <h1 style={{ ...DF, fontSize: "clamp(30px,6vw,54px)", fontWeight: 800, margin: "8px 0 0" }}>{datos.dias} entrenos/semana · <span style={gradText}>{m.kcal} kcal</span></h1>
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
        <div style={{ display: "flex", gap: 8, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 999, padding: 6, margin: "26px 0", position: "sticky", top: 10, zIndex: 20 }}>
          {[["entreno", "🏋️ Entrenamiento"], ["dieta", "🥗 Dieta semanal"]].map(([id, t]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: 13, borderRadius: 999, border: "none", fontWeight: 700, fontSize: 15, color: tab === id ? "#0A0B0D" : C.dim, ...(tab === id ? grad : { background: "transparent" }) }}>{t}</button>
          ))}
        </div>
        {tab === "entreno" && (
          <div className="fadeUp">
            {entreno.map((dia, di) => (
              <section key={dia.titulo} style={{ marginBottom: 34 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
                  <h2 style={{ ...DF, fontSize: 24, fontWeight: 800, margin: 0 }}>{dia.titulo}</h2>
                  <span style={{ fontSize: 13, color: C.dim }}>{dia.foco}</span>
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                  {dia.ejercicios.map((ex, ei) => {
                    const id = `${di}-${ei}`; const abierto = exAbierto === id;
                    return (
                      <div key={id} className="exwrap" style={{ background: C.panel, border: `1px solid ${abierto ? C.hot1 : C.line}`, borderRadius: 18, overflow: "hidden", transition: "border-color .15s" }}>
                        <button onClick={() => setExAbierto(abierto ? null : id)} style={{ display: "flex", alignItems: "stretch", gap: 0, width: "100%", background: "none", border: "none", color: C.text, padding: 0, textAlign: "left" }}>
                          <div style={{ width: 108, flexShrink: 0, overflow: "hidden", position: "relative" }}>
                            <img className="eximg" src={EXIMG[ex.key]} alt={ex.nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }} />
                          </div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", minWidth: 0 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ ...DF, fontWeight: 800, fontSize: 17 }}>{ex.nombre}</div>
                              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{ex.musculo}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ ...DF, fontWeight: 800, fontSize: 17 }}>{ex.series} × {ex.reps}</div>
                              <div style={{ fontSize: 11, color: C.dim }}>descanso {ex.descanso}</div>
                            </div>
                            <div style={{ color: C.dim, fontSize: 18 }}>{abierto ? "−" : "+"}</div>
                          </div>
                        </button>
                        {abierto && (
                          <div className="fadeUp" style={{ padding: "0 16px 18px", display: "grid", gridTemplateColumns: "minmax(140px,200px) 1fr", gap: 18, alignItems: "start" }}>
                            <img src={EXIMG[ex.key]} alt={ex.nombre} style={{ width: "100%", borderRadius: 14, aspectRatio: "1/1", objectFit: "cover", border: `1px solid ${C.line}` }} />
                            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                              {ex.pasos.map((p, pi) => (
                                <li key={pi} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.55, color: "#D6D9DE" }}>
                                  <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{pi + 1}</span>{p}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>💡 Calienta 5–10 min antes. Descansa al menos un día entre sesiones. Si un ejercicio causa dolor (no esfuerzo), páralo y consulta a un profesional.</div>
          </div>
        )}
        {tab === "dieta" && (
          <div className="fadeUp">
            <div style={{ position: "relative", height: 150, borderRadius: 20, overflow: "hidden", marginBottom: 18 }}>
              <img src={BANNER_DIETA} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,11,13,.85), rgba(10,11,13,.3))", display: "flex", alignItems: "center", padding: "0 26px" }}>
                <div>
                  <div style={{ ...DF, fontSize: 24, fontWeight: 800 }}>Tu semana de comidas</div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>~{m.kcal} kcal · {m.prot} g proteína al día</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
              {dieta.map((d, i) => (
                <button key={d.dia} onClick={() => setDiaDieta(i)} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14, border: `1.5px solid ${diaDieta === i ? C.hot1 : C.line}`, color: diaDieta === i ? "#0A0B0D" : C.dim, ...(diaDieta === i ? grad : { background: C.panel }) }}>{d.dia}</button>
              ))}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {dieta[diaDieta].comidas.map((c, i) => (
                <div key={c.nombre} className="fadeUp" style={{ animationDelay: `${i * 55}ms`, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: "18px 20px", display: "flex", gap: 18, alignItems: "center" }}>
                  <div style={{ textAlign: "center", flexShrink: 0, width: 58 }}>
                    <div style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 17 }}>{c.hora}</div>
                    <div style={{ height: 3, borderRadius: 3, ...grad, marginTop: 6, opacity: .5 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.nombre}</div>
                    <div style={{ fontSize: 15.5, fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>{c.plato}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>💧 Bebe 2–2,5 L de agua al día. Las cantidades son orientativas: ajústalas a tu hambre y progreso. Plan informativo, no sustituye a un médico o dietista.</div>
          </div>
        )}
      </div>
    </div>
  );
}
