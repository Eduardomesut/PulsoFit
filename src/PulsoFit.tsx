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
// Imagen de reserva (degradado de marca) si alguna foto no carga: evita el icono de "imagen rota".
const FALLBACK_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#FF4D2E'/><stop offset='1' stop-color='#FF9A3C'/></linearGradient></defs><rect width='400' height='400' fill='#1A1D22'/><circle cx='200' cy='210' r='78' fill='url(#g)' opacity='0.28'/><circle cx='200' cy='210' r='40' fill='url(#g)' opacity='0.5'/></svg>`)}`;
const onImgError = (e) => { const t = e.currentTarget; if (t.src !== FALLBACK_IMG) t.src = FALLBACK_IMG; };

const EXIMG = {
  // Peso libre / cuerpo
  sentadilla: U("1574680096145-d05b474e2155", 800), flexiones: U("1598971639058-fab3c3109a00", 800),
  pesoMuerto: U("1517963879433-6ad2b056d712", 800), remo: U("1534368420009-621bfab424a8", 800),
  press: U("1583454110551-21f2fa2afe61", 800), zancada: U("1434608519344-49d77a699e1d", 800),
  plancha: U("1566241142559-40e1dab266c6", 800), burpee: U("1601422407692-ec4eeec1d9b3", 800),
  escalador: U("1434682881908-b43d0467b798", 800), curl: U("1581009146145-b5ef050c2e1e", 800),
  pressBanca: U("1534438327276-14e5300c3a48", 800), jalon: U("1598575468023-4a4a1e40d1c9", 800),
  hipThrust: U("1517836357463-d25dfeac3438", 800), correr: U("1571008887538-b36bb32f4571", 800),
  jumping: U("1518611012118-696072aa579a", 800), laterales: U("1541534741688-6078c6bfb5c5", 800),
  // Máquinas de gimnasio
  prensa: U("1534258936925-c58bed479fcb", 800), extCuadriceps: U("1584863231364-2edc166de576", 800),
  curlFemoral: U("1596357395217-80de13130e92", 800), aductores: U("1518310383802-640c2de311b2", 800),
  abductores: U("1517344884509-a0c97ec11bcc", 800), gemelos: U("1550345332-09e3ac987658", 800),
  pressPecho: U("1591741535018-d042766c62eb", 800), contractora: U("1581122584612-713f89daa8eb", 800),
  remoPolea: U("1526506118085-60ce8714f8c5", 800), pressHombro: U("1532029837206-abbe2b7620e3", 800),
  tricepsPolea: U("1605296867304-46d5465a13f1", 800), curlPolea: U("1574680178050-55c6a6a96e0a", 800),
  abdominalMaquina: U("1571019614242-c5c5dee9f50b", 800), gluteoPolea: U("1594381898411-846e7d193883", 800),
  bici: U("1534787238916-9ba6764efd4f", 800), eliptica: U("1540497077202-7c8a3999166f", 800),
  remoErgometro: U("1519505907962-0a6cb0167c73", 800),
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
  // --- Máquinas de gimnasio ---
  prensa: { nombre: "Prensa de piernas (máquina)", musculo: "Cuádriceps · Glúteo", pasos: ["Siéntate con la espalda y la cadera bien apoyadas en el respaldo.", "Coloca los pies en la plataforma a la anchura de los hombros.", "Quita los seguros y baja flexionando las rodillas hasta unos 90°.", "Empuja con toda la planta del pie sin bloquear del todo las rodillas arriba."] },
  extCuadriceps: { nombre: "Extensión de cuádriceps (máquina)", musculo: "Cuádriceps", pasos: ["Ajusta el respaldo para que las rodillas queden alineadas con el eje de giro.", "Coloca el rodillo sobre la parte baja de las espinillas.", "Estira las piernas subiendo el peso hasta casi bloquear la rodilla.", "Aprieta el cuádriceps arriba y baja lento y controlado."] },
  curlFemoral: { nombre: "Curl femoral (máquina)", musculo: "Femoral", pasos: ["Túmbate o siéntate según el modelo, rodillas alineadas con el eje.", "El rodillo apoyado justo encima del talón (tendón de Aquiles).", "Flexiona llevando el talón hacia el glúteo.", "Aprieta el femoral en el punto máximo y baja controlando."] },
  aductores: { nombre: "Máquina de aductores", musculo: "Aductores (cara interna)", pasos: ["Siéntate con la espalda apoyada y las piernas abiertas sobre los apoyos.", "Ajusta la amplitud de apertura a una que sea cómoda.", "Junta las piernas apretando la cara interna de los muslos.", "Vuelve despacio a la apertura inicial sin soltar de golpe."] },
  abductores: { nombre: "Máquina de abductores", musculo: "Glúteo medio", pasos: ["Siéntate con la espalda apoyada y las piernas juntas sobre los apoyos.", "Empuja hacia fuera abriendo las piernas todo lo que permita el rango.", "Aprieta los glúteos en la máxima apertura un segundo.", "Cierra despacio resistiendo el peso."] },
  gemelos: { nombre: "Elevación de gemelos (máquina)", musculo: "Gemelos", pasos: ["Coloca las puntas de los pies en el borde de la plataforma, talones al aire.", "Apoya los hombros bajo las almohadillas (o el peso según el modelo).", "Sube empujando con las puntas lo más alto posible.", "Baja el talón por debajo del escalón para estirar y repite."] },
  pressPecho: { nombre: "Press de pecho (máquina)", musculo: "Pecho · Tríceps", pasos: ["Ajusta el asiento para que las manetas queden a la altura del pecho.", "Espalda apoyada, escápulas juntas y pies firmes en el suelo.", "Empuja las manetas al frente hasta casi estirar los brazos.", "Vuelve controlando hasta notar estiramiento en el pecho."] },
  contractora: { nombre: "Contractora / Peck deck", musculo: "Pecho", pasos: ["Ajusta el asiento para que los brazos queden paralelos al suelo.", "Antebrazos apoyados en las almohadillas, codos a la altura del hombro.", "Junta las almohadillas al frente apretando el pecho.", "Abre despacio sin dejar que el peso tire de más de la cuenta."] },
  remoPolea: { nombre: "Remo en polea baja", musculo: "Espalda · Bíceps", pasos: ["Siéntate con rodillas semiflexionadas y agarra el triángulo o la barra.", "Espalda recta y pecho arriba, brazos estirados al inicio.", "Tira llevando los codos atrás y pegados al cuerpo hasta el abdomen.", "Aprieta la espalda un instante y vuelve estirando sin encorvarte."] },
  pressHombro: { nombre: "Press de hombro (máquina)", musculo: "Hombro · Tríceps", pasos: ["Ajusta el asiento para que las manetas queden a la altura de los hombros.", "Espalda bien apoyada en el respaldo.", "Empuja hacia arriba hasta casi estirar los brazos, sin bloquear.", "Baja controlando hasta la altura de las orejas."] },
  tricepsPolea: { nombre: "Extensión de tríceps en polea", musculo: "Tríceps", pasos: ["De pie frente a la polea alta con barra o cuerda.", "Codos pegados al cuerpo y fijos durante todo el movimiento.", "Estira los brazos hacia abajo hasta bloquear el codo.", "Sube controlando solo hasta que el antebrazo quede horizontal."] },
  curlPolea: { nombre: "Curl de bíceps en polea", musculo: "Bíceps", pasos: ["De pie frente a la polea baja con barra o cuerda.", "Codos pegados a los costados y fijos.", "Flexiona subiendo el agarre hacia los hombros.", "Aprieta el bíceps arriba y baja lento resistiendo."] },
  abdominalMaquina: { nombre: "Máquina de abdominales", musculo: "Core · Abdomen", pasos: ["Ajusta el asiento y agarra las manetas o el apoyo del pecho.", "Contrae el abdomen llevando el pecho hacia las caderas (encógete).", "El movimiento nace del abdomen, no de tirar con los brazos.", "Vuelve despacio sin soltar la tensión del core."] },
  gluteoPolea: { nombre: "Patada de glúteo en polea", musculo: "Glúteo", pasos: ["Coloca la cincha en el tobillo, de frente a la polea baja.", "Sujétate a la estructura y mantén el tronco ligeramente inclinado.", "Lleva la pierna hacia atrás estirada apretando el glúteo.", "Vuelve controlando sin arquear la zona lumbar. Cambia de pierna."] },
  bici: { nombre: "Bicicleta estática", musculo: "Cardio", pasos: ["Ajusta la altura del sillín: rodilla casi estirada abajo.", "Empieza con 3-4 min a ritmo suave para calentar.", "Mantén una cadencia constante con una resistencia media.", "Puedes alternar 1 min fuerte / 2 min suave si buscas intervalos."] },
  eliptica: { nombre: "Elíptica", musculo: "Cardio", pasos: ["Súbete con los pies en los pedales y agarra los manillares móviles.", "Mantén el tronco erguido y el abdomen activo.", "Empuja con piernas y brazos a un ritmo fluido y constante.", "Ajusta la resistencia para mantener una intensidad media-alta."] },
  remoErgometro: { nombre: "Remo en máquina (remo-ergómetro)", musculo: "Cardio · Espalda", pasos: ["Sujeta los pies con las cinchas y agarra la barra con los brazos estirados.", "Empuja primero con las piernas, luego inclina el tronco y tira con los brazos.", "Termina con la barra bajo el pecho y los codos atrás.", "Vuelve en orden inverso: brazos, tronco y por último piernas."] },
};

function seriesReps(objetivo, nivel, ex) {
  const cardioMin = ["correr", "bici", "eliptica", "remoErgometro"].includes(ex);
  const cardioHIIT = ["burpee", "escalador", "jumping"].includes(ex);
  if (cardioMin) return { series: "1", reps: nivel === "principiante" ? "12 min" : nivel === "intermedio" ? "18 min" : "22 min", descanso: "—" };
  if (ex === "plancha") return { series: nivel === "principiante" ? "3" : "4", reps: nivel === "principiante" ? "30 seg" : nivel === "intermedio" ? "45 seg" : "60 seg", descanso: "45 seg" };
  if (cardioHIIT) return { series: nivel === "principiante" ? "3" : "4", reps: nivel === "principiante" ? "30 seg" : "40 seg", descanso: "30 seg" };
  if (objetivo === "ganar") return nivel === "principiante" ? { series: "3", reps: "8–10", descanso: "90 seg" } : nivel === "intermedio" ? { series: "4", reps: "8–10", descanso: "90 seg" } : { series: "4", reps: "6–8", descanso: "2 min" };
  if (objetivo === "perder") return { series: nivel === "principiante" ? "3" : "4", reps: "12–15", descanso: "45 seg" };
  if (objetivo === "resistencia") return { series: "3", reps: "15–20", descanso: "30 seg" };
  return { series: nivel === "principiante" ? "3" : "4", reps: "10–12", descanso: "60 seg" };
}

function buildWorkout(objetivo, nivel, dias) {
  const d3 = dias === 3;
  let plan;
  if (objetivo === "ganar") plan = d3
    ? [{ titulo: "Día 1 · Empuje", foco: "Pecho, hombro y tríceps", lista: ["pressBanca", "pressPecho", "pressHombro", "contractora", "laterales", "tricepsPolea"] }, { titulo: "Día 2 · Tirón", foco: "Espalda y bíceps", lista: ["jalon", "remoPolea", "remo", "pesoMuerto", "curl", "curlPolea"] }, { titulo: "Día 3 · Pierna", foco: "Piernas, glúteo y core", lista: ["sentadilla", "prensa", "extCuadriceps", "curlFemoral", "hipThrust", "gemelos", "abdominalMaquina"] }]
    : [{ titulo: "Día 1 · Torso", foco: "Pecho, espalda y hombro", lista: ["pressBanca", "pressPecho", "jalon", "remoPolea", "pressHombro", "curl", "tricepsPolea"] }, { titulo: "Día 2 · Pierna y core", foco: "Piernas, glúteo y abdomen", lista: ["sentadilla", "prensa", "extCuadriceps", "curlFemoral", "hipThrust", "gemelos", "plancha"] }];
  else if (objetivo === "perder") plan = d3
    ? [{ titulo: "Día 1 · Full body A", foco: "Fuerza + quema", lista: ["sentadilla", "prensa", "pressPecho", "remoPolea", "abdominalMaquina", "plancha"] }, { titulo: "Día 2 · Cardio máquinas + HIIT", foco: "Máxima quema calórica", lista: ["bici", "eliptica", "remoErgometro", "burpee", "escalador"] }, { titulo: "Día 3 · Full body B", foco: "Fuerza + quema", lista: ["pesoMuerto", "pressHombro", "jalon", "hipThrust", "gluteoPolea", "plancha"] }]
    : [{ titulo: "Día 1 · Full body + cardio", foco: "Fuerza + quema", lista: ["sentadilla", "prensa", "pressPecho", "remoPolea", "bici", "plancha"] }, { titulo: "Día 2 · Full body + cardio", foco: "Fuerza + cardio", lista: ["pesoMuerto", "pressHombro", "jalon", "hipThrust", "eliptica", "escalador"] }];
  else if (objetivo === "resistencia") plan = d3
    ? [{ titulo: "Día 1 · Circuito metabólico", foco: "Resistencia muscular", lista: ["prensa", "pressPecho", "remoPolea", "zancada", "abdominalMaquina", "escalador"] }, { titulo: "Día 2 · Cardio máquinas", foco: "Capacidad aeróbica", lista: ["bici", "eliptica", "remoErgometro", "jumping"] }, { titulo: "Día 3 · Circuito total", foco: "Cuerpo completo", lista: ["sentadilla", "jalon", "pressHombro", "curlFemoral", "plancha", "burpee"] }]
    : [{ titulo: "Día 1 · Circuito total", foco: "Resistencia muscular", lista: ["sentadilla", "pressPecho", "remoPolea", "zancada", "escalador", "plancha"] }, { titulo: "Día 2 · Cardio + core", foco: "Capacidad aeróbica", lista: ["bici", "eliptica", "remoErgometro", "abdominalMaquina", "plancha"] }];
  else plan = d3
    ? [{ titulo: "Día 1 · Fuerza torso", foco: "Músculo + tono", lista: ["pressBanca", "pressPecho", "jalon", "remoPolea", "pressHombro", "curl", "tricepsPolea"] }, { titulo: "Día 2 · Fuerza pierna", foco: "Piernas y glúteo", lista: ["sentadilla", "prensa", "extCuadriceps", "curlFemoral", "hipThrust", "gemelos"] }, { titulo: "Día 3 · Metabólico + core", foco: "Quema + core", lista: ["bici", "eliptica", "burpee", "escalador", "abdominalMaquina", "plancha"] }]
    : [{ titulo: "Día 1 · Fuerza total", foco: "Músculo + tono", lista: ["sentadilla", "prensa", "pressBanca", "remoPolea", "pressHombro", "plancha"] }, { titulo: "Día 2 · Fuerza + quema", foco: "Pierna y cardio", lista: ["pesoMuerto", "prensa", "hipThrust", "jalon", "bici", "escalador"] }];
  return plan.map((d) => ({ ...d, ejercicios: d.lista.map((k) => ({ key: k, ...EX[k], ...seriesReps(objetivo, nivel, k) })) }));
}

const DIETAS = {
  perder: { desayunos: ["Yogur griego natural con frutos rojos y 30 g de avena", "Tortilla de 2 huevos con espinacas + 1 pan integral", "Porridge de avena con manzana y canela", "Tostada integral con tomate, pavo y AOVE"], comidas: ["Pechuga de pollo, arroz integral (60 g) y brócoli", "Merluza al horno con patata cocida pequeña y ensalada", "Lentejas estofadas con verduras (plato mediano)", "Ternera magra salteada con pimientos y quinoa (50 g)"], cenas: ["Salmón a la plancha con espárragos", "Revuelto de huevo, champiñones y calabacín", "Ensalada de atún, huevo duro y ½ aguacate", "Pechuga de pavo con puré de coliflor"], snacks: ["1 fruta + 10 almendras", "Yogur desnatado", "Zanahorias con hummus", "Queso batido 0% con canela"] },
  ganar: { desayunos: ["Avena (80 g) con leche, plátano y crema de cacahuete", "4 tostadas integrales con aguacate y 3 huevos", "Batido: leche, avena (60 g), plátano y proteína", "Porridge con nueces, miel y yogur griego"], comidas: ["Arroz (100 g) con pollo (200 g) y AOVE", "Pasta integral (110 g) con ternera picada y tomate", "Salmón (200 g) con patata asada grande y verduras", "Garbanzos con arroz, huevo duro y atún"], cenas: ["Tortilla de 3 huevos con patata y ensalada", "Pollo al horno (200 g) con boniato y aguacate", "Atún con arroz (80 g) y pisto de verduras", "Hamburguesa casera de ternera con pan integral y queso"], snacks: ["Batido de proteína + plátano", "Puñado grande de frutos secos", "Yogur griego con miel y granola", "Sándwich integral de pavo y queso"] },
  ambos: { desayunos: ["Avena (50 g) con yogur griego y frutos rojos", "3 huevos revueltos con pan integral y tomate", "Batido: leche, plátano, avena (40 g) y proteína", "Tostadas integrales con aguacate y huevo poché"], comidas: ["Pollo (180 g) con arroz integral (80 g) y verduras", "Salmón con quinoa (70 g) y espárragos", "Lentejas con arroz y huevo duro", "Ternera magra con patata asada y ensalada"], cenas: ["Merluza al horno con boniato pequeño y brócoli", "Revuelto de 3 huevos con champiñones", "Pechuga de pavo con puré de patata y calabacín", "Ensalada de atún, huevo, aguacate y picatostes"], snacks: ["Yogur griego + nueces", "Fruta + queso fresco", "Batido de proteína", "Tortitas de arroz con crema de cacahuete"] },
  resistencia: { desayunos: ["Porridge de avena (60 g) con plátano y miel", "Tostadas integrales con mermelada y yogur griego", "Batido: leche, avena, frutos rojos y plátano", "Tortilla de 2 huevos con pan integral y zumo natural"], comidas: ["Pasta integral (90 g) con pollo y tomate", "Arroz (90 g) con salmón y verduras", "Cuscús con garbanzos, pasas y pollo", "Patata asada con atún y ensalada"], cenas: ["Arroz (60 g) con huevo y pisto", "Pescado blanco con boniato y calabacín", "Crema de verduras + tortilla francesa", "Pollo salteado con noodles integrales y verduras"], snacks: ["Plátano + dátiles", "Yogur con granola", "Tostada con miel", "Fruta + frutos secos"] },
};
// Fotos de plato por tipo de ingrediente principal (Unsplash).
const FOODIMG = {
  pescado: "1467003909585-2f8a72700288", pollo: "1604908176997-125f25cc6f3d", carne: "1546964124-0cce460f38ef",
  huevo: "1482049016688-2d3e1b311543", avena: "1517673400267-0251440c45dc", yogur: "1488477181946-6428a0291777",
  ensalada: "1512621776951-a57141f2eefd", arroz: "1516684732162-798a0062be99", pasta: "1551183053-bf91a1d81141",
  legumbre: "1585032226651-759b368d7246", tostada: "1528735602780-2552fd46c7af", batido: "1553530666-ba11a7da3888",
  fruta: "1490474418585-ba9bad8fd0ea", patata: "1518977676601-b53f82aba655", verdura: "1540420773420-3366772f4999",
  otro: "1504674900247-0877df9cc836",
};
function platoImg(plato) {
  const p = plato.toLowerCase();
  const has = (...ks) => ks.some((k) => p.includes(k));
  let key = "otro";
  if (has("salmón", "salmon", "merluza", "atún", "atun", "pescado", "bacalao")) key = "pescado";
  else if (has("pollo", "pavo")) key = "pollo";
  else if (has("ternera", "hamburguesa", "carne")) key = "carne";
  else if (has("tortilla", "huevo", "revuelto")) key = "huevo";
  else if (has("avena", "porridge")) key = "avena";
  else if (has("yogur")) key = "yogur";
  else if (has("ensalada")) key = "ensalada";
  else if (has("pasta", "noodles", "cuscús", "cuscus")) key = "pasta";
  else if (has("lentejas", "garbanzos")) key = "legumbre";
  else if (has("tostada", "sándwich", "sandwich", "pan ", "picatostes", "tortitas")) key = "tostada";
  else if (has("batido")) key = "batido";
  else if (has("fruta", "plátano", "platano", "dátiles", "datiles", "frutos", "almendras", "nueces", "granola", "manzana")) key = "fruta";
  else if (has("arroz", "quinoa")) key = "arroz";
  else if (has("patata", "boniato")) key = "patata";
  else if (has("crema", "puré", "pure", "verduras", "brócoli", "brocoli", "zanahoria", "hummus", "espárragos", "esparragos", "coliflor")) key = "verdura";
  return U(FOODIMG[key], 600);
}
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
          {[["4", "objetivos"], ["7 días", "de dieta"], [`${Object.keys(EX).length}`, "ejercicios con foto"]].map(([n, t]) => (
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

    line("PULSO", { size: 24, style: "bold", color: [255, 77, 46], gap: 3 });
    line("Tu plan personalizado", { size: 15, style: "bold" });
    space(4);
    line(`Objetivo: ${obj?.titulo}   |   Nivel: ${cap(datos.nivel)}   |   ${datos.dias} entrenos/semana`, { size: 10, color: [110, 110, 110], gap: 3 });
    line(`${cap(datos.sexo)} · ${datos.edad} años · ${datos.peso} kg · ${datos.altura} cm`, { size: 10, color: [110, 110, 110] });
    space(8);

    line("OBJETIVO NUTRICIONAL DIARIO", { size: 12, style: "bold" });
    space(2);
    line(`Calorías: ${m.kcal} kcal      Proteína: ${m.prot} g      Carbohidratos: ${m.carbs} g      Grasas: ${m.grasa} g`, { size: 11 });
    space(6);
    rule();

    line("ENTRENAMIENTO", { size: 15, style: "bold", color: [255, 77, 46] });
    space(4);
    entreno.forEach((dia) => {
      ensure(50);
      line(dia.titulo, { size: 12.5, style: "bold" });
      line(dia.foco, { size: 9, color: [125, 125, 125] });
      space(3);
      dia.ejercicios.forEach((ex) => {
        ensure(34);
        line(`•  ${ex.nombre}   (${ex.musculo})`, { size: 10.5, style: "bold", indent: 6, gap: 3 });
        line(`${ex.series} series × ${ex.reps}   ·   descanso ${ex.descanso}`, { size: 9.5, color: [90, 90, 90], indent: 16, gap: 3 });
        ex.pasos.forEach((p, i) => line(`${i + 1}. ${p}`, { size: 9, color: [115, 115, 115], indent: 16, gap: 2 }));
        space(4);
      });
      space(6);
    });
    rule();

    line("DIETA SEMANAL", { size: 15, style: "bold", color: [255, 77, 46] });
    space(4);
    dieta.forEach((d) => {
      ensure(50);
      line(d.dia, { size: 12.5, style: "bold" });
      space(1);
      d.comidas.forEach((c) => {
        ensure(26);
        line(`${c.hora}  ·  ${c.nombre}`, { size: 9.5, style: "bold", color: [90, 90, 90], indent: 6, gap: 2 });
        line(c.plato, { size: 10, indent: 16, gap: 3 });
      });
      space(7);
    });
    space(4);
    line("Plan orientativo con fines informativos. No sustituye el consejo de un médico o dietista.", { size: 8, color: [150, 150, 150] });

    doc.save(`plan-pulso-${datos.objetivo}.pdf`);
  };

  return (
    <div>
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        <img src={obj?.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,11,13,.5), rgba(10,11,13,.95))" }} />
        <header style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <div style={{ ...DF, fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={descargarPDF} style={{ ...grad, border: "none", color: "#0A0B0D", fontWeight: 800, borderRadius: 999, padding: "8px 18px", fontSize: 13, boxShadow: "0 6px 22px rgba(255,77,46,.35)" }}>⬇ Descargar PDF</button>
            <button onClick={onReset} style={{ background: "rgba(0,0,0,.4)", border: `1px solid ${C.line}`, color: C.text, borderRadius: 999, padding: "8px 18px", fontSize: 13, backdropFilter: "blur(6px)" }}>↺ Empezar de nuevo</button>
          </div>
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
                            <img className="eximg" src={EXIMG[ex.key]} alt={ex.nombre} loading="lazy" onError={onImgError} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }} />
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
                            <img src={EXIMG[ex.key]} alt={ex.nombre} onError={onImgError} style={{ width: "100%", borderRadius: 14, aspectRatio: "1/1", objectFit: "cover", border: `1px solid ${C.line}` }} />
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
                <div key={c.nombre} className="fadeUp" style={{ animationDelay: `${i * 55}ms`, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ textAlign: "center", flexShrink: 0, width: 50 }}>
                    <div style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15 }}>{c.hora}</div>
                    <div style={{ height: 3, borderRadius: 3, ...grad, marginTop: 6, opacity: .5 }} />
                  </div>
                  <img src={platoImg(c.plato)} alt={c.plato} loading="lazy" onError={onImgError} style={{ width: 76, height: 76, borderRadius: 14, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.line}` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.nombre}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>{c.plato}</div>
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
