import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import {
  U, youtubeUrl, normalizar, FOODIMG, TIPOS_DIETA, ALERGENOS, ALIMENTOS,
  RECETAS, RECETAS_CINE, REPARTO, buildDiet, calcularMetricas, OBJETIVOS, migrarDatos,
} from "./logica";

/* ============================================================
   PULSO — Web de nutrición personalizada, estilo editorial
   cinematográfico: banners a pantalla completa con foto real,
   tipografía grande, foto por objetivo y por receta, y cada
   plato con ingredientes y modo de elaboración paso a paso.
   Imágenes: Unsplash (fuente libre) vía URL directa.
   ============================================================ */

/* Paleta clara estilo Apple: los grises de apple.com (#F5F5F7 para paneles,
   texto #1D1D1F, secundario #6E6E73) y el acento de marca en dos naranjas
   próximos en tono para que el degradado sea suave, no estridente. */
const C = {
  bg: "#FFFFFF", panel: "#F5F5F7", panel2: "#E8E8ED",
  line: "#E2E2E7", text: "#1D1D1F", dim: "#6E6E73",
  hot1: "#F5501A", hot2: "#F98D1F",
};
const grad = { backgroundImage: `linear-gradient(90deg, ${C.hot1}, ${C.hot2})` };
const gradText = { backgroundImage: `linear-gradient(90deg, ${C.hot1}, ${C.hot2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
const DF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif", letterSpacing: "-0.03em" };
// Imagen de reserva (degradado de marca) si alguna foto no carga: evita el icono de "imagen rota".
const FALLBACK_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#F5501A'/><stop offset='1' stop-color='#F98D1F'/></linearGradient></defs><rect width='400' height='400' fill='#F5F5F7'/><circle cx='200' cy='210' r='78' fill='url(#g)' opacity='0.28'/><circle cx='200' cy='210' r='40' fill='url(#g)' opacity='0.5'/></svg>`)}`;
const onImgError = (e) => { const t = e.currentTarget; if (t.src !== FALLBACK_IMG) t.src = FALLBACK_IMG; };

/* Botones de acción principales, estilo Apple: píldora compacta de tamaño
   uniforme. El primario lleva el degradado de marca con texto blanco;
   el secundario es gris translúcido con blur. Las microinteracciones
   (hover, presión) viven en las clases .btn-cta y button:active. */
const btnBase = { border: "none", borderRadius: 980, fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", padding: "13px 28px", minWidth: "min(220px, 100%)", transition: "transform .18s ease, filter .18s ease, box-shadow .18s ease" };
const btnPrimario = { ...btnBase, ...grad, color: "#fff", boxShadow: "0 4px 16px rgba(245,80,26,.25)" };
const btnSecundario = { ...btnBase, background: "rgba(29,29,31,.07)", color: C.text, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" };

const HERO_IMG = U("1504674900247-0877df9cc836");
const BANNER_DIETA = U("1490645935967-10de6ba17061");
const BANNER_CINE = U("1489599849927-2ee91cede3ba"); // butacas de cine; si falla, onImgError pone el degradado de marca
const BANNER_RECETARIO = U("1466637574441-749b8f19452f"); // mesa con ingredientes, cabecera del recetario

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

  // Secciones de catálogo (recetario y cine): recuerdan desde qué pantalla se
  // abrieron para volver a ella; saltar de una sección a otra no pisa ese origen.
  const [seccionDesde, setSeccionDesde] = useState("hero");
  const esSeccion = (f) => f === "cine" || f === "recetario";
  const irSeccion = (s) => { if (!esSeccion(fase)) setSeccionDesde(fase); setFase(s); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(26px);} to {opacity:1; transform:none;} }
        @keyframes kenburns { from { transform: scale(1);} to { transform: scale(1.12);} }
        @keyframes scanline { 0%{top:0%;} 100%{top:100%;} }
        .fadeUp { animation: fadeUp .6s ease both; }
        /* Microinteracciones tipo Apple: todo botón responde al hover y se
           comprime ligeramente al pulsarlo; tarjetas e inputs devuelven
           feedback suave (sombra al pasar, halo al enfocar). */
        button { cursor:pointer; font-family:inherit; transition: background .18s ease, filter .18s ease, transform .18s ease, border-color .18s ease, box-shadow .18s ease, color .18s ease; }
        button:active { transform: scale(.97); }
        button:focus-visible { outline:2px solid ${C.hot1}; outline-offset:3px; }
        .btn-cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .btn-cta:active { transform: scale(.97); }
        .exwrap { transition: box-shadow .28s ease, border-color .18s ease; }
        .exwrap:hover { box-shadow: 0 14px 34px rgba(0,0,0,.08); }
        input[type=email], input[type=password], input[type=text], input:not([type]) { transition: border-color .2s ease, box-shadow .2s ease; }
        input[type=email]:focus, input[type=password]:focus, input[type=text]:focus, input:not([type]):focus { outline: none; border-color: ${C.hot1} !important; box-shadow: 0 0 0 4px rgba(245,80,26,.12); }
        input[type=range]{ accent-color:${C.hot1}; }
        ::selection { background:${C.hot1}; color:#fff; }
        @media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms !important; transition-duration:.01ms !important; } }
        .exwrap:hover .eximg { transform: scale(1.06); }
        /* Navegación tipo Tesla: enlaces de texto planos que muestran una
           pastilla translúcida al pasar el ratón. La cabecera vive siempre
           sobre una foto (.sobre-foto → texto blanco, pastilla blanca);
           el menú lateral es un panel claro (.sobre-claro → pastilla gris). */
        .nav-item { background: transparent; border: none; color: inherit; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 980px; transition: background .2s ease; text-decoration: none; white-space: nowrap; }
        .nav-item:hover, .nav-item.activo { background: rgba(23,26,32,.06); }
        .sobre-foto .nav-item:hover, .sobre-foto .nav-item.activo { background: rgba(255,255,255,.16); backdrop-filter: blur(8px); }
        .sobre-claro .nav-item:hover, .sobre-claro .nav-item.activo { background: rgba(23,26,32,.06); backdrop-filter: none; }
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
      {fase === "recetario" && <Recetario onBack={() => setFase(seccionDesde)} onLogin={() => setAuthAbierto(true)} onIrSeccion={irSeccion} />}
      {authAbierto && <AuthModal onClose={() => setAuthAbierto(false)} />}
    </div>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(23,26,32,.45)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 22, padding: 26, boxShadow: "0 24px 60px rgba(0,0,0,.16)" }}>
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

// Cabecera compartida por todas las pantallas, estilo Tesla: logo a la izquierda,
// enlaces de texto centrados (escritorio), acciones contextuales a la derecha y
// un botón "Menú" que abre el panel lateral en pantallas estrechas.
// `onInicio` hace clicable el logo; `actual` resalta la sección activa.
const NAV_LINKS = [["recetario", "Recetario"], ["cine", "Cine y series"]];
function Cabecera({ onIrSeccion, onLogin, onInicio, actual, acciones }: any) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const logo = <span style={{ ...DF, fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></span>;
  return (
    <header className="sobre-foto" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", color: "#fff" }}>
      {onInicio
        ? <button className="nav-item" onClick={onInicio} aria-label="Ir al inicio" style={{ padding: "6px 10px" }}>{logo}</button>
        : <div style={{ padding: "6px 10px" }}>{logo}</div>}
      <nav className="nav-escritorio" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
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
    </header>
  );
}

// Panel lateral deslizante (menú móvil), estilo Tesla: lista vertical de
// enlaces planos sobre un panel con blur que entra desde la derecha.
function MenuLateral({ onCerrar, onIrSeccion, onLogin, onInicio, actual }) {
  const ir = (fn) => () => { onCerrar(); fn(); };
  const item = { width: "100%", textAlign: "left" as const, fontSize: 15, padding: "12px 14px" };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 90 }}>
      <div className="sobre-claro" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 85vw)", background: "rgba(255,255,255,.96)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", borderLeft: `1px solid ${C.line}`, color: C.text, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 4, animation: "menuIn .28s ease both" }}>
        <button className="nav-item" onClick={onCerrar} aria-label="Cerrar menú" style={{ alignSelf: "flex-end", fontSize: 20, lineHeight: 1, padding: "8px 12px" }}>×</button>
        {onInicio && <button className="nav-item" onClick={ir(onInicio)} style={item}>Inicio</button>}
        {NAV_LINKS.map(([id, t]) => (
          <button key={id} className={`nav-item${actual === id ? " activo" : ""}`} onClick={ir(() => onIrSeccion(id))} style={item}>{t}</button>
        ))}
        <div style={{ height: 1, background: C.line, margin: "10px 4px" }} />
        <CuentaChip onLogin={ir(onLogin)} vertical />
      </div>
    </div>
  );
}

function Hero({ onStart, onLogin, planGuardado, onRetomar, onIrSeccion }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenburns 18s ease-out both" }} />
        {/* La foto queda arriba (texto blanco) y se funde en blanco hacia la
            zona de CTAs y cifras, que usa texto oscuro: transición tipo Tesla. */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(10,11,13,.55) 0%, rgba(10,11,13,.28) 42%, rgba(255,255,255,.88) 80%, #FFFFFF 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 480px at 78% 12%, rgba(245,80,26,.16), transparent 62%)` }} />
      </div>
      <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} />
      <main className="fadeUp" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", textAlign: "center", padding: "16vh 24px 0", color: "#fff", textShadow: "0 1px 22px rgba(0,0,0,.45)" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.32em", color: C.hot2, textTransform: "uppercase", marginBottom: 18, fontWeight: 700 }}>Tu plan. Tu mesa. Tus reglas.</div>
        <h1 style={{ ...DF, fontSize: "clamp(42px, 8vw, 96px)", fontWeight: 800, lineHeight: 1, margin: 0 }}>Come con <span style={{ ...gradText, textShadow: "none" }}>intención.</span></h1>
        <p style={{ color: "#F1F2F4", fontSize: 17, maxWidth: 560, lineHeight: 1.6, marginTop: 22 }}>Dinos tu objetivo, tus gustos y tus alergias. En segundos generamos tu semana de comidas completa, con cada receta ilustrada paso a paso.</p>
      </main>
      <div className="fadeUp" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30, padding: "40px 24px 6vh" }}>
        <div className="cta-fila" style={{ display: "flex", gap: 14, justifyContent: "center", width: "100%", maxWidth: 600 }}>
          <button className="btn-cta" onClick={onStart} style={btnPrimario}>Crear mi plan</button>
          {planGuardado
            ? <button className="btn-cta" onClick={onRetomar} style={btnSecundario}>Continuar con mi plan</button>
            : <button className="btn-cta" onClick={() => onIrSeccion("recetario")} style={btnSecundario}>Explorar el recetario</button>}
        </div>
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap", justifyContent: "center" }}>
          {[["4", "objetivos"], ["7 días", "de dieta"], [`${RECETAS.length}`, "recetas con foto"]].map(([n, t]) => (
            <div key={t} style={{ textAlign: "center" }}><div style={{ ...DF, fontSize: 20, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{t}</div></div>
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
    padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14,
    border: `1.5px solid ${activo ? C.hot1 : C.line}`, color: activo ? "#0A0B0D" : C.dim,
    ...(activo ? grad : { background: C.panel }),
  });
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
            <p style={{ color: C.dim, marginBottom: 28 }}>Todo el plan de comidas se diseñará alrededor de esto.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {OBJETIVOS.map((o) => {
                const activo = datos.objetivo === o.id;
                return (
                  <button key={o.id} onClick={() => set("objetivo", o.id)} style={{ position: "relative", height: 200, borderRadius: 20, overflow: "hidden", border: `2px solid ${activo ? C.hot1 : "transparent"}`, padding: 0, textAlign: "left", boxShadow: activo ? "0 10px 40px rgba(245,80,26,.22)" : "none", transition: "border-color .15s" }}>
                    <img src={o.img} alt="" onError={onImgError} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: activo ? "linear-gradient(180deg, rgba(245,80,26,.25), rgba(10,11,13,.9))" : "linear-gradient(180deg, rgba(10,11,13,.15), rgba(10,11,13,.88))" }} />
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
                <button key={s} onClick={() => set("sexo", s)} style={{ flex: 1, padding: 16, borderRadius: 14, textTransform: "capitalize", fontWeight: 700, fontSize: 16, color: C.text, background: datos.sexo === s ? "linear-gradient(135deg, rgba(245,80,26,.12), rgba(249,141,31,.06))" : C.panel, border: `1.5px solid ${datos.sexo === s ? C.hot1 : C.line}` }}>{s === "hombre" ? "♂ Hombre" : "♀ Mujer"}</button>
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
                <button key={t.id} onClick={() => set("tipoDieta", t.id)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.tipoDieta === t.id ? "linear-gradient(135deg, rgba(245,80,26,.12), rgba(249,141,31,.06))" : C.panel, border: `1.5px solid ${datos.tipoDieta === t.id ? C.hot1 : C.line}` }}>
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
                <button key={n} onClick={() => set("comidasDia", n)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.comidasDia === n ? "linear-gradient(135deg, rgba(245,80,26,.12), rgba(249,141,31,.06))" : C.panel, border: `1.5px solid ${datos.comidasDia === n ? C.hot1 : C.line}` }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 22 }}>{n} <span style={{ fontSize: 13, fontWeight: 400, color: C.dim }}>comidas</span></div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>{REPARTO[n].map((f) => f.nombre).join(" · ")}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button className="btn-cta" onClick={next} disabled={!puedeSeguir} style={{ ...btnPrimario, ...(puedeSeguir ? {} : { backgroundImage: "none", background: C.panel2, color: C.dim }), marginTop: 34, width: "100%", padding: 15, fontSize: 15, opacity: puedeSeguir ? 1 : 0.6, cursor: puedeSeguir ? "pointer" : "not-allowed" }}>{paso < ultimo ? "Continuar" : "Generar mi plan"}</button>
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
      <div style={{ width: 260, height: 4, background: C.line, borderRadius: 4, marginTop: 22, overflow: "hidden" }}>
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

    line("PULSO", { size: 24, style: "bold", color: [245, 80, 26], gap: 3 });
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

    line("DIETA SEMANAL", { size: 15, style: "bold", color: [245, 80, 26] });
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

    line("RECETARIO", { size: 15, style: "bold", color: [245, 80, 26] });
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
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,11,13,.45) 0%, rgba(255,255,255,.75) 62%, #FFFFFF 100%)" }} />
        <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} onInicio={onReset} acciones={
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
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,11,13,.72), rgba(10,11,13,.2))", display: "flex", alignItems: "center", padding: "0 26px" }}>
              <div style={{ color: "#fff" }}>
                <div style={{ ...DF, fontSize: 24, fontWeight: 800 }}>Tu semana de comidas</div>
                <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13, marginTop: 4 }}>~{m.kcal} kcal · {m.prot} g proteína al día</div>
              </div>
            </div>
          </div>
          {(datos.tipoDieta !== "omnivora" || alergiasNombres.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {datos.tipoDieta !== "omnivora" && (
                <span style={{ fontSize: 12, fontWeight: 700, color: C.hot2, border: `1px solid ${C.line}`, background: C.panel, borderRadius: 999, padding: "6px 14px" }}>🥗 {tipoDieta?.titulo}</span>
              )}
              {alergiasNombres.map((n) => (
                <span key={n} style={{ fontSize: 12, fontWeight: 700, color: C.hot2, border: `1px solid ${C.line}`, background: C.panel, borderRadius: 999, padding: "6px 14px" }}>🚫 Sin {n.toLowerCase()}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
            {dieta.map((d, i) => (
              <button key={d.dia} onClick={() => setDiaDieta(i)} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14, border: `1.5px solid ${diaDieta === i ? C.hot1 : C.line}`, color: diaDieta === i ? "#0A0B0D" : C.dim, ...(diaDieta === i ? grad : { background: C.panel }) }}>{d.dia}</button>
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
          <li key={ing.nombre} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "#3F454C" }}>
            <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 13, flexShrink: 0, minWidth: 74 }}>{ing.cantidad}</span>{ing.nombre}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "18px 0 10px" }}>Modo de elaboración</div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {pasos.map((p, pi) => (
          <li key={pi} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.55, color: "#3F454C" }}>
            <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{pi + 1}</span>{p}
          </li>
        ))}
      </ol>
      <a href={youtube} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 18, textDecoration: "none", background: "rgba(29,29,31,.06)", borderRadius: 980, padding: "11px 20px", fontWeight: 600, fontSize: 14, color: C.text }}>
        <span style={{ ...grad, color: "#0A0B0D", borderRadius: 999, width: 26, height: 26, display: "grid", placeItems: "center", fontSize: 12, flexShrink: 0 }}>▶</span>
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
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,11,13,.45) 0%, rgba(255,255,255,.75) 62%, #FFFFFF 100%)" }} />
      <Cabecera onIrSeccion={onIrSeccion} onLogin={onLogin} actual={actual} acciones={
        <button className="nav-item" onClick={onBack}>← Volver</button>
      } />
      <div className="fadeUp" style={{ position: "absolute", left: 0, right: 0, bottom: 26, maxWidth: 980, margin: "0 auto", padding: "0 18px", color: C.text }}>
        <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: C.hot1, fontWeight: 700 }}>{kicker}</div>
        <h1 style={{ ...DF, fontSize: "clamp(30px,6vw,54px)", fontWeight: 800, margin: "8px 0 0" }}>{titulo}</h1>
      </div>
    </div>
  );
}

// Ficha expandible de receta, compartida por el recetario y la sección de cine.
// `r` es un modelo unificado: etiqueta pequeña, nombre, kcal y fotos opcionales
// (escena de la obra y plato real) más el detalle (ingredientes, pasos, youtube).
function FichaReceta({ r, abierto, onToggle, delay = 0 }) {
  const generica = U(FOODIMG[r.img] || FOODIMG.otro, 600);
  const thumb = r.fotoEscena || r.fotoPlato || generica;
  const plato = r.fotoPlato || generica;
  // Las fotos externas pueden caerse: se prueba primero la genérica del plato
  // y, si también falla, onImgError pinta el degradado de marca.
  const conRespaldo = (e) => { const t = e.currentTarget; if (t.src !== generica) t.src = generica; else onImgError(e); };
  return (
    <div className="exwrap fadeUp" style={{ animationDelay: `${delay}ms`, background: C.panel, border: `1px solid ${abierto ? C.hot1 : C.line}`, borderRadius: 18, overflow: "hidden", transition: "border-color .15s" }}>
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
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(10,11,13,.92))", display: "flex", alignItems: "flex-end", padding: "14px 16px" }}>
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
            <button key={id} onClick={() => { setFiltro(id); setAbierta(null); }} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14, border: `1.5px solid ${filtro === id ? C.hot1 : C.line}`, color: filtro === id ? "#0A0B0D" : C.dim, ...(filtro === id ? grad : { background: C.panel }) }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {lista.map((r, i) => (
            <FichaReceta key={r.id} r={fichaDeCine(r)} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)} delay={i * 55} />
          ))}
        </div>
        <div style={{ marginTop: 18, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 18px", fontSize: 13, color: C.dim, lineHeight: 1.6 }}>🍿 Estos platos son homenajes a sus series y películas: disfrútalos de vez en cuando, sin remordimientos. Tu plan semanal sigue intacto.</div>
      </div>
    </div>
  );
}

// Recetario completo: todas las recetas de la app (plan + cine) con buscador
// por nombre o ingrediente y filtro por categoría.
const CATS_RECETARIO = [["todas", "Todas"], ["desayuno", "Desayunos"], ["comida", "Comidas"], ["cena", "Cenas"], ["snack", "Snacks"], ["cine", "🎬 De cine"]];
const NOMBRE_CAT = { desayuno: "Desayuno", comida: "Comida", cena: "Cena", snack: "Snack" };

function Recetario({ onBack, onLogin, onIrSeccion }) {
  const [busqueda, setBusqueda] = useState("");
  const [cat, setCat] = useState("todas");
  const [abierta, setAbierta] = useState<string | null>(null);
  const todas = useMemo(() => [
    ...RECETAS.map((r) => ({ id: r.id, nombre: r.nombre, img: r.img, categoria: r.categoria, kcal: r.kcalAprox, etiqueta: NOMBRE_CAT[r.categoria], ingredientes: r.ingredientes, pasos: r.pasos, youtube: youtubeUrl(r.nombre) })),
    ...RECETAS_CINE.map((r) => ({ ...fichaDeCine(r), categoria: "cine" })),
  ], []);
  const q = normalizar(busqueda.trim());
  const lista = todas.filter((r) => (cat === "todas" || r.categoria === cat)
    && (!q || normalizar(r.nombre).includes(q) || r.ingredientes.some((ing) => normalizar(ing.nombre).includes(q))));
  return (
    <div>
      <CabeceraSeccion banner={BANNER_RECETARIO} kicker={`${todas.length} recetas · Todas con foto y elaboración`} titulo={<>El <span style={gradText}>recetario</span></>} onBack={onBack} onLogin={onLogin} onIrSeccion={onIrSeccion} actual="recetario" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px 80px" }}>
        <p className="fadeUp" style={{ color: C.dim, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 640 }}>Todas las recetas de PULSO en un solo sitio. Búscalas por nombre o por ingrediente y ábrelas para ver sus cantidades y su elaboración paso a paso.</p>
        <div className="fadeUp" style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setAbierta(null); }} placeholder="Busca por nombre o ingrediente: salmón, avena, sándwich…" aria-label="Buscar receta" style={{ width: "100%", boxSizing: "border-box", padding: "16px 20px 16px 50px", borderRadius: 999, background: C.panel, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 15 }} />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {CATS_RECETARIO.map(([id, t]) => (
            <button key={id} onClick={() => { setCat(id); setAbierta(null); }} style={{ flexShrink: 0, padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14, border: `1.5px solid ${cat === id ? C.hot1 : C.line}`, color: cat === id ? "#0A0B0D" : C.dim, ...(cat === id ? grad : { background: C.panel }) }}>{t}</button>
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
              <FichaReceta key={r.id} r={r} abierto={abierta === r.id} onToggle={() => setAbierta(abierta === r.id ? null : r.id)} delay={Math.min(i, 8) * 45} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
