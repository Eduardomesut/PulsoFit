import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import {
  U, youtubeUrl, normalizar, FOODIMG, TIPOS_DIETA, ALERGENOS, ALIMENTOS,
  RECETAS, RECETAS_CINE, REPARTO, buildDiet, calcularMetricas, OBJETIVOS, migrarDatos,
  INGREDIENTES_WEB, CATEGORIAS_RECETA, validarRecetaComunidad, puedeBorrarReceta,
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
const BANNER_RECETARIO = U("1466637574441-749b8f19452f"); // mesa con ingredientes, cabecera del recetario
const BANNER_RESTAURANTES = U("1517248135467-4c7edcad34c4"); // interior de restaurante, cabecera de la sección de restaurantes

/* Enlace "Mi rutina" del menú: App lo rellena cuando hay sesión iniciada y un
   plan que enseñar (el de la sesión actual o el guardado en Supabase); null lo
   oculta. Va por contexto para que la cabecera lo lea desde cualquier pantalla
   sin arrastrar la prop por todas. */
const RutinaCtx = createContext<null | (() => void)>(null);

export default function App() {
  const [fase, setFase] = useState("hero");
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ objetivo: null, sexo: null, edad: 28, peso: 75, altura: 172, tipoDieta: "omnivora", alergias: [], noGusta: [], comidasDia: 5 });
  const [authAbierto, setAuthAbierto] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(null);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
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
  const esSeccion = (f) => f === "cine" || f === "recetario" || f === "restaurantes";
  const irSeccion = (s) => { if (!esSeccion(fase)) setSeccionDesde(fase); setFase(s); };

  return (
    <RutinaCtx.Provider value={irARutina}>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: MONO, fontSize: 14 }}>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(26px);} to {opacity:1; transform:none;} }
        @keyframes kenburns { from { transform: scale(1);} to { transform: scale(1.12);} }
        @keyframes scanline { 0%{top:0%;} 100%{top:100%;} }
        @keyframes marquesina { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .fadeUp { animation: fadeUp .6s ease both; }
        /* Polaroids flotantes del hero: la capa exterior recibe el paralaje del
           ratón (variables --px/--py) y la interior levita en bucle. Al pasar
           el ratón por encima, la foto se endereza y crece un poco. */
        @keyframes flotar { 0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); } 50% { transform: translateY(-13px) rotate(calc(var(--rot, 0deg) + 1.6deg)); } }
        .polaroid { position: absolute; transform: translate(var(--px, 0px), var(--py, 0px)); transition: transform .45s cubic-bezier(.2,.8,.3,1); will-change: transform; z-index: 3; }
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
        @keyframes menuIn { from { transform: translateX(100%); } to { transform: none; } }
        @media (max-width: 600px) { .cta-fila { flex-direction: column; align-items: stretch; } }
      `}</style>
      {fase === "hero" && <Hero onStart={() => setFase("form")} onLogin={() => setAuthAbierto(true)} planGuardado={planGuardado} onRetomar={retomarPlan} onIrSeccion={irSeccion} />}
      {fase === "form" && <Formulario datos={datos} set={set} paso={paso} setPaso={setPaso} onFinish={() => setFase("scan")} onBack={() => setFase("hero")} />}
      {fase === "scan" && <Scan onDone={() => setFase("plan")} />}
      {fase === "plan" && <Plan datos={datos} onReset={() => { setPaso(0); setDatos((d) => ({ ...d, objetivo: null, sexo: null })); setFase("hero"); }} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "cine" && <Cine onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "recetario" && <Recetario onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} onCrear={() => setFase("crear")} />}
      {fase === "crear" && <CrearReceta onVolver={() => setFase("recetario")} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {fase === "restaurantes" && <Restaurantes datos={datos} onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {authAbierto && <AuthModal onClose={() => setAuthAbierto(false)} />}
    </div>
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

// Cabecera compartida por todas las pantallas, estilo food-truck retro:
// marquesina marina arriba y barra blanca tipo pegatina con el logo a la
// izquierda, enlaces monoespaciados centrados (escritorio), acciones
// contextuales a la derecha y un botón "Menú" en pantallas estrechas.
// `onInicio` hace clicable el logo; `actual` resalta la sección activa.
const NAV_LINKS = [["recetario", "Recetario"], ["cine", "Cine y series"], ["restaurantes", "Restaurantes"]];
function Cabecera({ onIrSeccion, onLogin, onInicio, actual, acciones }: any) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const irARutina = useContext(RutinaCtx);
  const logo = <span style={{ ...DF, fontSize: 19, letterSpacing: "0.14em" }}>PULSO<span style={{ color: C.hot1 }}>.</span></span>;
  return (
    <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }}>
      <Marquesina texto={`${RECETAS.length}+ recetas con foto · Tu semana de comidas en segundos · PDF gratis · Recetas de la comunidad`} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, margin: "12px 14px 0", padding: "8px 14px", background: "#fff", border: `2px solid ${C.line}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.line}`, color: C.text }}>
        {onInicio
          ? <button className="nav-item" onClick={onInicio} aria-label="Ir al inicio" style={{ padding: "4px 10px" }}>{logo}</button>
          : <div style={{ padding: "4px 10px" }}>{logo}</div>}
        <nav className="nav-escritorio" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
          {irARutina && <button className={`nav-item${actual === "rutina" ? " activo" : ""}`} onClick={irARutina}>Mi rutina</button>}
          {NAV_LINKS.map(([id, t]) => (
            <button key={id} className={`nav-item${actual === id ? " activo" : ""}`} onClick={() => onIrSeccion(id)}>{t}</button>
          ))}
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

// Panel lateral deslizante (menú móvil), estilo Tesla: lista vertical de
// enlaces planos sobre un panel con blur que entra desde la derecha.
function MenuLateral({ onCerrar, onIrSeccion, onLogin, onInicio, actual }) {
  const ir = (fn) => () => { onCerrar(); fn(); };
  const irARutina = useContext(RutinaCtx);
  const item = { width: "100%", textAlign: "left" as const, fontSize: 15, padding: "12px 14px" };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 90 }}>
      <div className="sobre-claro" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 85vw)", background: "rgba(255,255,255,.96)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderLeft: `2px solid ${C.line}`, color: C.text, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 4, animation: "menuIn .28s ease both" }}>
        <button className="nav-item" onClick={onCerrar} aria-label="Cerrar menú" style={{ alignSelf: "flex-end", fontSize: 20, lineHeight: 1, padding: "8px 12px" }}>×</button>
        {onInicio && <button className="nav-item fadeUp" onClick={ir(onInicio)} style={{ ...item, animationDelay: "60ms" }}>Inicio</button>}
        {irARutina && <button className={`nav-item fadeUp${actual === "rutina" ? " activo" : ""}`} onClick={ir(irARutina)} style={{ ...item, animationDelay: "110ms" }}>Mi rutina</button>}
        {NAV_LINKS.map(([id, t], i) => (
          <button key={id} className={`nav-item fadeUp${actual === id ? " activo" : ""}`} onClick={ir(() => onIrSeccion(id))} style={{ ...item, animationDelay: `${160 + i * 55}ms` }}>{t}</button>
        ))}
        <div style={{ height: 1, background: C.line, margin: "10px 4px" }} />
        <CuentaChip onLogin={ir(onLogin)} vertical />
      </div>
    </div>
  );
}

/* Aparece: revela su contenido cuando entra en el viewport (IntersectionObserver),
   con un pequeño salto y giro tipo pegatina. Sustituye al fadeUp de montaje en
   las listas largas, para que cada tarjeta anime justo cuando se ve. */
function Aparece({ children, delay = 0, rot = 0 }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visto ? 1 : 0, transform: visto ? "none" : `translateY(30px) rotate(${rot}deg) scale(.98)`, transition: `opacity .55s ease ${delay}ms, transform .55s cubic-bezier(.2,.9,.3,1.15) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* Fotos flotantes del hero: polaroids giradas que levitan en bucle y se
   apartan del ratón cuando pasa cerca (paralaje + repulsión), como las
   fotos sueltas de la web de pizza-amici. Solo escritorio (>1080px). */
const POLAROIDS = [
  { img: "ensalada", texto: "sin remordimientos", pos: { top: "23%", left: "5%" }, rot: -7, deriva: 30, dur: 7.2 },
  { img: "batido", texto: "listo en 10 min", pos: { top: "56%", left: "10%" }, rot: 5, deriva: 55, dur: 8.4 },
  { img: "carne", texto: "alto en proteína", pos: { top: "21%", right: "6%" }, rot: 6, deriva: 42, dur: 7.8 },
  { img: "fruta", texto: "tu semana, resuelta", pos: { top: "58%", right: "11%" }, rot: -5, deriva: 68, dur: 9 },
];
function FotosFlotantes() {
  const capa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = capa.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.querySelectorAll<HTMLElement>(".polaroid").forEach((foto, i) => {
          const fr = foto.getBoundingClientRect();
          const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
          // Deriva de profundidad: cada foto sigue al ratón a su propio ritmo…
          const deriva = POLAROIDS[i]?.deriva ?? 40;
          let px = (e.clientX - (r.left + r.width / 2)) / deriva;
          let py = (e.clientY - (r.top + r.height / 2)) / deriva;
          // …y repulsión de cercanía: si el ratón se acerca, la foto se aparta.
          const dx = cx - e.clientX, dy = cy - e.clientY;
          const dist = Math.hypot(dx, dy);
          const fuerza = Math.max(0, 1 - dist / 300) * 46;
          if (dist > 1) { px += (dx / dist) * fuerza; py += (dy / dist) * fuerza; }
          foto.style.setProperty("--px", `${px.toFixed(1)}px`);
          foto.style.setProperty("--py", `${py.toFixed(1)}px`);
        });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
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
  const [diaDieta, setDiaDieta] = useState(0);
  const [recetaAbierta, setRecetaAbierta] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const { user, enabled } = useAuth();
  const m = useMemo(() => calcularMetricas(datos), [datos]);
  const dieta = useMemo(() => buildDiet(datos, m.kcal), [datos, m.kcal]);
  const obj = OBJETIVOS.find((o) => o.id === datos.objetivo);
  const tipoDieta = TIPOS_DIETA.find((t) => t.id === datos.tipoDieta);
  const alergiasNombres = ALERGENOS.filter((a) => datos.alergias.includes(a.id)).map((a) => a.nombre);

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
              <button key={d.dia} onClick={() => setDiaDieta(i)} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 14, border: `1.5px solid ${diaDieta === i ? C.hot1 : C.line}`, color: diaDieta === i ? "#0F2C56" : C.dim, ...(diaDieta === i ? grad : { background: C.panel }) }}>{d.dia}</button>
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
  return (
    <div className="exwrap" style={{ background: C.panel, border: `1px solid ${abierto ? C.hot1 : C.line}`, borderRadius: 18, overflow: "hidden", transition: "border-color .15s" }}>
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

// Recetario completo: todas las recetas de la app (plan + cine) con buscador
// por nombre o ingrediente y filtro por categoría.
const CATS_RECETARIO = [["todas", "Todas"], ["desayuno", "Desayunos"], ["comida", "Comidas"], ["cena", "Cenas"], ["snack", "Snacks"], ["cine", "🎬 De cine"], ["comunidad", "👥 Comunidad"]];
const NOMBRE_CAT = { desayuno: "Desayuno", comida: "Comida", cena: "Cena", snack: "Snack" };

function Recetario({ onBack, onLogin, onIrSeccion, onCrear }) {
  const { user, enabled } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [cat, setCat] = useState("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  // Recetas publicadas por la comunidad (tabla recetas_comunidad). En modo
  // invitado sin Supabase la lista queda vacía y la sección funciona igual.
  const [comunidad, setComunidad] = useState<any[]>([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("recetas_comunidad").select("id, user_id, autor, receta").order("creado_en", { ascending: false })
      .then(({ data }) => setComunidad(data ?? []));
  }, []);
  const borrarComunidad = async (id) => {
    if (!supabase || !window.confirm("¿Seguro que quieres borrar esta receta? No se puede deshacer.")) return;
    const { error } = await supabase.from("recetas_comunidad").delete().eq("id", id);
    if (!error) setComunidad((c) => c.filter((r) => r.id !== id));
  };
  const todas = useMemo(() => [
    ...comunidad.map((row) => ({
      id: row.id, user_id: row.user_id, nombre: row.receta.nombre, img: row.receta.img, categoria: "comunidad",
      kcal: row.receta.kcalAprox, etiqueta: `👥 Comunidad · ${row.autor}`,
      ingredientes: row.receta.ingredientes, pasos: row.receta.pasos, youtube: youtubeUrl(row.receta.nombre),
    })),
    ...RECETAS.map((r) => ({ id: r.id, nombre: r.nombre, img: r.img, categoria: r.categoria, kcal: r.kcalAprox, etiqueta: NOMBRE_CAT[r.categoria], ingredientes: r.ingredientes, pasos: r.pasos, youtube: youtubeUrl(r.nombre) })),
    ...RECETAS_CINE.map((r) => ({ ...fichaDeCine(r), categoria: "cine" })),
  ], [comunidad]);
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
