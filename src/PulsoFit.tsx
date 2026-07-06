import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

/* ============================================================
   PULSO — Web de nutrición personalizada, estilo editorial
   cinematográfico: banners a pantalla completa con foto real,
   tipografía grande, foto por objetivo y por receta, y cada
   plato con ingredientes y modo de elaboración paso a paso.
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

// Banco de fotos de plato por tipo de ingrediente principal (Unsplash).
const FOODIMG = {
  pescado: "1467003909585-2f8a72700288", pollo: "1604908176997-125f25cc6f3d", carne: "1546964124-0cce460f38ef",
  huevo: "1482049016688-2d3e1b311543", avena: "1517673400267-0251440c45dc", yogur: "1488477181946-6428a0291777",
  ensalada: "1512621776951-a57141f2eefd", arroz: "1516684732162-798a0062be99", pasta: "1551183053-bf91a1d81141",
  legumbre: "1585032226651-759b368d7246", tostada: "1528735602780-2552fd46c7af", batido: "1553530666-ba11a7da3888",
  fruta: "1490474418585-ba9bad8fd0ea", patata: "1518977676601-b53f82aba655", verdura: "1540420773420-3366772f4999",
  otro: "1504674900247-0877df9cc836",
};

const TIPOS_DIETA = [
  { id: "omnivora", titulo: "Omnívora", desc: "Como de todo" },
  { id: "vegetariana", titulo: "Vegetariana", desc: "Sin carne ni pescado" },
  { id: "vegana", titulo: "Vegana", desc: "Sin ningún producto animal" },
  { id: "sinGluten", titulo: "Sin gluten", desc: "Celiaquía o sensibilidad al gluten" },
  { id: "sinLactosa", titulo: "Sin lactosa", desc: "Intolerancia a la lactosa" },
];

// Alérgenos e intolerancias: exclusión ESTRICTA, nunca se relaja.
const ALERGENOS = [
  { id: "frutosSecos", nombre: "Frutos secos" },
  { id: "marisco", nombre: "Marisco" },
  { id: "lactosa", nombre: "Lactosa" },
  { id: "gluten", nombre: "Gluten" },
  { id: "huevo", nombre: "Huevo" },
  { id: "pescado", nombre: "Pescado" },
  { id: "soja", nombre: "Soja" },
];

// Alimentos "no me gustan": se excluyen si el catálogo da suficiente variedad.
const ALIMENTOS = [
  { id: "pollo", nombre: "Pollo / pavo" }, { id: "carneRoja", nombre: "Ternera / cerdo" },
  { id: "pescadoBlanco", nombre: "Pescado blanco" }, { id: "pescadoAzul", nombre: "Salmón / atún" },
  { id: "huevo", nombre: "Huevo" }, { id: "lacteos", nombre: "Lácteos" },
  { id: "avena", nombre: "Avena" }, { id: "arroz", nombre: "Arroz" },
  { id: "pasta", nombre: "Pasta" }, { id: "legumbres", nombre: "Legumbres" },
  { id: "patata", nombre: "Patata / boniato" }, { id: "aguacate", nombre: "Aguacate" },
  { id: "platano", nombre: "Plátano" }, { id: "frutosSecos", nombre: "Frutos secos" },
  { id: "verdurasCrucif", nombre: "Brócoli / coliflor" },
];

/* Catálogo de recetas. Cada una lleva imagen, kcal aproximadas por ración,
   ingredientes con cantidades y modo de elaboración paso a paso.
   - dietas: etiquetas que cumple ("vegana" cuenta también como vegetariana).
   - alergenos: ids de ALERGENOS presentes (sin gluten / sin lactosa se derivan de aquí).
   - contiene: ids de ALIMENTOS, para respetar los "no me gusta".
   - objetivos: afinidad blanda con el objetivo (ordena el plan, nunca filtra). */
const RECETAS = [
  // ---------- DESAYUNOS ----------
  {
    id: "gachasArroz", nombre: "Gachas de arroz con manzana y canela", categoria: "desayuno", img: "arroz", kcalAprox: 360,
    ingredientes: [{ nombre: "Harina de arroz", cantidad: "45 g" }, { nombre: "Bebida de arroz", cantidad: "300 ml" }, { nombre: "Manzana", cantidad: "1 unidad" }, { nombre: "Canela", cantidad: "1 pizca" }],
    pasos: ["Calienta la bebida de arroz en un cazo a fuego medio.", "Añade la harina de arroz en lluvia y remueve 4-5 minutos hasta que espese.", "Ralla media manzana dentro y corta el resto en dados para decorar.", "Sirve en un bol con la manzana por encima y la canela espolvoreada."],
    dietas: ["vegana"], alergenos: [], contiene: ["arroz"], objetivos: ["equilibrio", "ganar"],
  },
  {
    id: "porridgePlatano", nombre: "Porridge de avena con plátano y canela", categoria: "desayuno", img: "avena", kcalAprox: 420,
    ingredientes: [{ nombre: "Copos de avena", cantidad: "60 g" }, { nombre: "Leche", cantidad: "250 ml" }, { nombre: "Plátano", cantidad: "1 unidad" }, { nombre: "Canela", cantidad: "1 pizca" }],
    pasos: ["Calienta la leche en un cazo a fuego medio sin que llegue a hervir.", "Añade la avena y remueve 4-5 minutos hasta que espese.", "Sirve en un bol y corta el plátano en rodajas por encima.", "Termina con la canela espolvoreada."],
    dietas: ["vegetariana"], alergenos: ["gluten", "lactosa"], contiene: ["avena", "platano", "lacteos"], objetivos: ["ganar", "musculo", "equilibrio"],
  },
  {
    id: "yogurFrutosRojos", nombre: "Yogur griego con frutos rojos y chía", categoria: "desayuno", img: "yogur", kcalAprox: 320,
    ingredientes: [{ nombre: "Yogur griego natural", cantidad: "200 g" }, { nombre: "Frutos rojos", cantidad: "100 g" }, { nombre: "Semillas de chía", cantidad: "1 cucharada" }, { nombre: "Miel", cantidad: "1 cucharadita (opcional)" }],
    pasos: ["Pon el yogur en un bol y remuévelo hasta que quede cremoso.", "Lava los frutos rojos y repártelos por encima.", "Espolvorea las semillas de chía y, si quieres, un hilo de miel.", "Deja reposar 5 minutos para que la chía hidrate un poco."],
    dietas: ["vegetariana"], alergenos: ["lactosa"], contiene: ["lacteos"], objetivos: ["perder", "equilibrio", "musculo"],
  },
  {
    id: "tortillaEspinacas", nombre: "Tortilla de espinacas con tostada integral", categoria: "desayuno", img: "huevo", kcalAprox: 380,
    ingredientes: [{ nombre: "Huevos", cantidad: "2 unidades" }, { nombre: "Espinacas frescas", cantidad: "1 puñado" }, { nombre: "Pan integral", cantidad: "1 rebanada" }, { nombre: "Aceite de oliva", cantidad: "1 cucharadita" }],
    pasos: ["Saltea las espinacas 1 minuto en una sartén con el aceite.", "Bate los huevos con una pizca de sal y viértelos sobre las espinacas.", "Cuaja la tortilla a fuego medio, doblándola por la mitad.", "Tuesta el pan y sírvelo junto a la tortilla."],
    dietas: ["vegetariana"], alergenos: ["huevo", "gluten"], contiene: ["huevo"], objetivos: ["perder", "musculo"],
  },
  {
    id: "tostadaAguacate", nombre: "Tostada integral con aguacate y tomate", categoria: "desayuno", img: "tostada", kcalAprox: 350,
    ingredientes: [{ nombre: "Pan integral", cantidad: "2 rebanadas" }, { nombre: "Aguacate", cantidad: "½ unidad" }, { nombre: "Tomate", cantidad: "1 unidad" }, { nombre: "Aceite de oliva y sal", cantidad: "al gusto" }],
    pasos: ["Tuesta el pan hasta que quede dorado.", "Machaca el aguacate con un tenedor y una pizca de sal.", "Unta el aguacate sobre las tostadas.", "Corta el tomate en rodajas finas, colócalo encima y termina con un hilo de aceite."],
    dietas: ["vegana"], alergenos: ["gluten"], contiene: ["aguacate"], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "batidoCacahuete", nombre: "Batido de plátano, avena y crema de cacahuete", categoria: "desayuno", img: "batido", kcalAprox: 520,
    ingredientes: [{ nombre: "Leche", cantidad: "250 ml" }, { nombre: "Plátano", cantidad: "1 unidad" }, { nombre: "Copos de avena", cantidad: "40 g" }, { nombre: "Crema de cacahuete", cantidad: "1 cucharada" }],
    pasos: ["Pela el plátano y trocéalo.", "Pon todos los ingredientes en la batidora.", "Bate 1 minuto hasta que quede homogéneo y sin grumos.", "Sirve frío; puedes añadir hielo antes de batir."],
    dietas: ["vegetariana"], alergenos: ["gluten", "lactosa", "frutosSecos"], contiene: ["avena", "platano", "lacteos", "frutosSecos"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "revueltoChampinones", nombre: "Revuelto de huevos con champiñones", categoria: "desayuno", img: "huevo", kcalAprox: 300,
    ingredientes: [{ nombre: "Huevos", cantidad: "3 unidades" }, { nombre: "Champiñones", cantidad: "100 g" }, { nombre: "Cebollino", cantidad: "al gusto" }, { nombre: "Aceite de oliva", cantidad: "1 cucharadita" }],
    pasos: ["Lamina los champiñones y saltéalos 3-4 minutos hasta dorarlos.", "Bate los huevos con sal y viértelos en la sartén.", "Remueve a fuego suave hasta que cuajen sin secarse.", "Sirve con el cebollino picado por encima."],
    dietas: ["vegetariana"], alergenos: ["huevo"], contiene: ["huevo"], objetivos: ["perder", "musculo"],
  },
  {
    id: "bolFrutas", nombre: "Bol de frutas frescas con coco rallado", categoria: "desayuno", img: "fruta", kcalAprox: 250,
    ingredientes: [{ nombre: "Manzana", cantidad: "1 unidad" }, { nombre: "Naranja", cantidad: "1 unidad" }, { nombre: "Kiwi", cantidad: "1 unidad" }, { nombre: "Coco rallado", cantidad: "1 cucharada" }],
    pasos: ["Lava y pela las frutas.", "Córtalas en dados del mismo tamaño.", "Mézclalas en un bol con el zumo que suelte la naranja.", "Espolvorea el coco rallado justo antes de servir."],
    dietas: ["vegana"], alergenos: [], contiene: [], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "tostadaPavo", nombre: "Tostada integral con pavo y tomate", categoria: "desayuno", img: "tostada", kcalAprox: 340,
    ingredientes: [{ nombre: "Pan integral", cantidad: "2 rebanadas" }, { nombre: "Fiambre de pavo", cantidad: "80 g" }, { nombre: "Tomate rallado", cantidad: "1 unidad" }, { nombre: "Aceite de oliva", cantidad: "1 cucharadita" }],
    pasos: ["Tuesta el pan hasta que quede crujiente.", "Ralla el tomate y mézclalo con el aceite y una pizca de sal.", "Reparte el tomate sobre las tostadas.", "Termina colocando el pavo por encima."],
    dietas: [], alergenos: ["gluten"], contiene: ["pollo"], objetivos: ["perder", "musculo"],
  },
  {
    id: "pudinChia", nombre: "Pudin de chía con bebida de coco y mango", categoria: "desayuno", img: "fruta", kcalAprox: 330,
    ingredientes: [{ nombre: "Semillas de chía", cantidad: "25 g" }, { nombre: "Bebida de coco", cantidad: "200 ml" }, { nombre: "Mango", cantidad: "½ unidad" }],
    pasos: ["Mezcla la chía con la bebida de coco en un vaso o bol.", "Remueve, espera 10 minutos y vuelve a remover para que no se apelmace.", "Deja reposar en la nevera al menos 2 horas (o toda la noche).", "Sirve con el mango en dados por encima."],
    dietas: ["vegana"], alergenos: [], contiene: [], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "tortitasAvena", nombre: "Tortitas de avena y plátano", categoria: "desayuno", img: "avena", kcalAprox: 450,
    ingredientes: [{ nombre: "Copos de avena", cantidad: "60 g" }, { nombre: "Huevos", cantidad: "2 unidades" }, { nombre: "Plátano", cantidad: "1 unidad" }, { nombre: "Canela", cantidad: "1 pizca" }],
    pasos: ["Tritura la avena, los huevos, el plátano y la canela hasta obtener una masa.", "Calienta una sartén antiadherente con unas gotas de aceite.", "Vierte pequeñas porciones y cocina 2 minutos por lado.", "Sirve en torre con fruta o un hilo de miel si quieres."],
    dietas: ["vegetariana"], alergenos: ["gluten", "huevo"], contiene: ["avena", "huevo", "platano"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "tostadaMaizHummus", nombre: "Tortitas de maíz con hummus y pepino", categoria: "desayuno", img: "tostada", kcalAprox: 300,
    ingredientes: [{ nombre: "Tortitas de maíz", cantidad: "3 unidades" }, { nombre: "Hummus", cantidad: "60 g" }, { nombre: "Pepino", cantidad: "½ unidad" }, { nombre: "Pimentón", cantidad: "1 pizca" }],
    pasos: ["Unta cada tortita de maíz con una capa generosa de hummus.", "Corta el pepino en rodajas finas.", "Reparte el pepino sobre el hummus.", "Espolvorea el pimentón antes de servir."],
    dietas: ["vegana"], alergenos: [], contiene: ["legumbres"], objetivos: ["equilibrio", "perder"],
  },
  // ---------- COMIDAS ----------
  {
    id: "polloArrozBrocoli", nombre: "Pollo a la plancha con arroz integral y brócoli", categoria: "comida", img: "pollo", kcalAprox: 550,
    ingredientes: [{ nombre: "Pechuga de pollo", cantidad: "180 g" }, { nombre: "Arroz integral", cantidad: "80 g (en seco)" }, { nombre: "Brócoli", cantidad: "150 g" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Cuece el arroz integral según el tiempo del paquete (35-40 min).", "Cuece el brócoli al vapor 5-6 minutos: debe quedar verde y firme.", "Haz el pollo a la plancha 4-5 minutos por lado con sal y pimienta.", "Monta el plato y aliña con el aceite de oliva en crudo."],
    dietas: [], alergenos: [], contiene: ["pollo", "arroz", "verdurasCrucif"], objetivos: ["musculo", "perder"],
  },
  {
    id: "merluzaPatatas", nombre: "Merluza al horno con patatas panadera", categoria: "comida", img: "pescado", kcalAprox: 480,
    ingredientes: [{ nombre: "Lomo de merluza", cantidad: "200 g" }, { nombre: "Patata", cantidad: "200 g" }, { nombre: "Pimiento verde", cantidad: "½ unidad" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Corta la patata en rodajas finas y el pimiento en tiras.", "Hornéalos 20 minutos a 190 °C con el aceite y sal.", "Coloca la merluza encima y hornea 10-12 minutos más.", "Sirve regando el pescado con el jugo de la bandeja."],
    dietas: [], alergenos: ["pescado"], contiene: ["pescadoBlanco", "patata"], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "lentejasEstofadas", nombre: "Lentejas estofadas con verduras", categoria: "comida", img: "legumbre", kcalAprox: 520,
    ingredientes: [{ nombre: "Lentejas secas", cantidad: "80 g" }, { nombre: "Zanahoria", cantidad: "1 unidad" }, { nombre: "Cebolla", cantidad: "½ unidad" }, { nombre: "Patata", cantidad: "1 pequeña" }, { nombre: "Pimentón", cantidad: "1 cucharadita" }],
    pasos: ["Sofríe la cebolla y la zanahoria picadas 5 minutos.", "Añade el pimentón, remueve y agrega las lentejas y la patata en dados.", "Cubre con agua y cuece a fuego suave 35-40 minutos.", "Rectifica de sal y deja reposar 5 minutos antes de servir."],
    dietas: ["vegana"], alergenos: [], contiene: ["legumbres", "patata"], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "pastaBolonesa", nombre: "Pasta integral con boloñesa de ternera", categoria: "comida", img: "pasta", kcalAprox: 650,
    ingredientes: [{ nombre: "Pasta integral", cantidad: "100 g (en seco)" }, { nombre: "Ternera picada magra", cantidad: "150 g" }, { nombre: "Tomate triturado", cantidad: "200 g" }, { nombre: "Cebolla", cantidad: "½ unidad" }],
    pasos: ["Sofríe la cebolla picada hasta que esté transparente.", "Añade la carne y dórala deshaciéndola con la cuchara.", "Incorpora el tomate y cocina 10 minutos a fuego suave.", "Cuece la pasta al dente, escúrrela y mézclala con la salsa."],
    dietas: [], alergenos: ["gluten"], contiene: ["pasta", "carneRoja"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "salteadoQuinoa", nombre: "Salteado de quinoa con verduras", categoria: "comida", img: "verdura", kcalAprox: 450,
    ingredientes: [{ nombre: "Quinoa", cantidad: "80 g (en seco)" }, { nombre: "Calabacín", cantidad: "½ unidad" }, { nombre: "Pimiento rojo", cantidad: "½ unidad" }, { nombre: "Zanahoria", cantidad: "1 unidad" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Lava la quinoa y cuécela 15 minutos; escúrrela bien.", "Corta las verduras en dados pequeños.", "Saltéalas 6-7 minutos a fuego vivo: deben quedar al dente.", "Añade la quinoa, saltea 2 minutos más y ajusta de sal."],
    dietas: ["vegana"], alergenos: [], contiene: [], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "salmonQuinoa", nombre: "Salmón al horno con quinoa y espárragos", categoria: "comida", img: "pescado", kcalAprox: 580,
    ingredientes: [{ nombre: "Lomo de salmón", cantidad: "180 g" }, { nombre: "Quinoa", cantidad: "70 g (en seco)" }, { nombre: "Espárragos verdes", cantidad: "6 unidades" }, { nombre: "Limón", cantidad: "½ unidad" }],
    pasos: ["Cuece la quinoa 15 minutos y escúrrela.", "Hornea el salmón y los espárragos 12-14 minutos a 200 °C.", "Exprime el limón sobre el salmón al sacarlo.", "Sirve todo junto con una pizca de sal en los espárragos."],
    dietas: [], alergenos: ["pescado"], contiene: ["pescadoAzul"], objetivos: ["musculo", "equilibrio"],
  },
  {
    id: "garbanzosEspinacas", nombre: "Garbanzos salteados con espinacas", categoria: "comida", img: "legumbre", kcalAprox: 490,
    ingredientes: [{ nombre: "Garbanzos cocidos", cantidad: "200 g" }, { nombre: "Espinacas frescas", cantidad: "2 puñados" }, { nombre: "Ajo", cantidad: "2 dientes" }, { nombre: "Pimentón", cantidad: "1 cucharadita" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Dora el ajo laminado en el aceite sin que se queme.", "Añade los garbanzos escurridos y saltéalos 4-5 minutos.", "Incorpora las espinacas hasta que reduzcan.", "Aparta del fuego, añade el pimentón y remueve bien."],
    dietas: ["vegana"], alergenos: [], contiene: ["legumbres"], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "arrozConPollo", nombre: "Arroz con pollo y pimientos", categoria: "comida", img: "arroz", kcalAprox: 620,
    ingredientes: [{ nombre: "Arroz", cantidad: "90 g (en seco)" }, { nombre: "Pollo troceado", cantidad: "150 g" }, { nombre: "Pimiento rojo", cantidad: "½ unidad" }, { nombre: "Guisantes", cantidad: "50 g" }, { nombre: "Caldo o agua", cantidad: "250 ml" }],
    pasos: ["Dora el pollo salpimentado y resérvalo.", "Sofríe el pimiento en la misma sartén 3 minutos.", "Añade el arroz, remueve 1 minuto y cubre con el caldo caliente.", "Incorpora el pollo y los guisantes y cuece 16-18 minutos sin remover."],
    dietas: [], alergenos: [], contiene: ["arroz", "pollo"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "terneraPatataAsada", nombre: "Ternera magra con patata asada y ensalada", categoria: "comida", img: "carne", kcalAprox: 600,
    ingredientes: [{ nombre: "Filete de ternera magra", cantidad: "180 g" }, { nombre: "Patata", cantidad: "1 grande" }, { nombre: "Ensalada verde", cantidad: "1 bol" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Asa la patata entera 45 minutos a 200 °C (o 8-10 min en microondas).", "Haz el filete a la plancha muy caliente, 2-3 minutos por lado.", "Deja reposar la carne 2 minutos antes de cortarla.", "Sirve con la patata abierta y la ensalada aliñada."],
    dietas: [], alergenos: [], contiene: ["carneRoja", "patata"], objetivos: ["musculo", "ganar"],
  },
  {
    id: "ensaladaAtunHuevo", nombre: "Ensalada completa de atún y huevo", categoria: "comida", img: "ensalada", kcalAprox: 420,
    ingredientes: [{ nombre: "Atún al natural", cantidad: "120 g" }, { nombre: "Huevo duro", cantidad: "1 unidad" }, { nombre: "Lechuga y tomate", cantidad: "1 bol" }, { nombre: "Aceitunas", cantidad: "8 unidades" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Cuece el huevo 10 minutos, enfríalo y pélalo.", "Trocea la lechuga y el tomate en un bol amplio.", "Añade el atún escurrido, el huevo en cuartos y las aceitunas.", "Aliña con aceite, sal y un toque de vinagre."],
    dietas: [], alergenos: ["pescado", "huevo"], contiene: ["pescadoAzul", "huevo"], objetivos: ["perder"],
  },
  {
    id: "curryGarbanzos", nombre: "Curry de garbanzos con arroz basmati", categoria: "comida", img: "arroz", kcalAprox: 580,
    ingredientes: [{ nombre: "Garbanzos cocidos", cantidad: "200 g" }, { nombre: "Leche de coco", cantidad: "150 ml" }, { nombre: "Curry en polvo", cantidad: "1 cucharada" }, { nombre: "Arroz basmati", cantidad: "70 g (en seco)" }, { nombre: "Cebolla", cantidad: "½ unidad" }],
    pasos: ["Cuece el arroz basmati 12 minutos y resérvalo.", "Sofríe la cebolla picada, añade el curry y tuéstalo 30 segundos.", "Incorpora los garbanzos y la leche de coco.", "Cocina 8-10 minutos hasta que la salsa espese y sirve sobre el arroz."],
    dietas: ["vegana"], alergenos: [], contiene: ["legumbres", "arroz"], objetivos: ["ganar", "equilibrio"],
  },
  {
    id: "pavoBoniato", nombre: "Pechuga de pavo con boniato y judías verdes", categoria: "comida", img: "pollo", kcalAprox: 520,
    ingredientes: [{ nombre: "Pechuga de pavo", cantidad: "180 g" }, { nombre: "Boniato", cantidad: "200 g" }, { nombre: "Judías verdes", cantidad: "150 g" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Asa el boniato en dados 25 minutos a 200 °C con un hilo de aceite.", "Cuece las judías verdes 6-7 minutos.", "Haz el pavo a la plancha 4 minutos por lado.", "Monta el plato y añade sal y pimienta al gusto."],
    dietas: [], alergenos: [], contiene: ["pollo", "patata"], objetivos: ["perder", "musculo"],
  },
  {
    id: "pastaPesto", nombre: "Pasta con pesto y tomatitos cherry", categoria: "comida", img: "pasta", kcalAprox: 620,
    ingredientes: [{ nombre: "Pasta", cantidad: "100 g (en seco)" }, { nombre: "Albahaca fresca", cantidad: "1 manojo" }, { nombre: "Piñones", cantidad: "20 g" }, { nombre: "Parmesano", cantidad: "30 g" }, { nombre: "Tomates cherry", cantidad: "8 unidades" }],
    pasos: ["Tritura la albahaca, los piñones, el parmesano y aceite hasta obtener el pesto.", "Cuece la pasta al dente y reserva un poco del agua.", "Mezcla la pasta con el pesto, aligerando con el agua reservada.", "Añade los tomatitos partidos por la mitad y sirve."],
    dietas: ["vegetariana"], alergenos: ["gluten", "lactosa", "frutosSecos"], contiene: ["pasta", "frutosSecos", "lacteos"], objetivos: ["ganar", "equilibrio"],
  },
  {
    id: "wokTofu", nombre: "Wok de tofu y verduras con salsa de soja", categoria: "comida", img: "verdura", kcalAprox: 480,
    ingredientes: [{ nombre: "Tofu firme", cantidad: "150 g" }, { nombre: "Verduras variadas (pimiento, zanahoria, calabacín)", cantidad: "250 g" }, { nombre: "Salsa de soja", cantidad: "2 cucharadas" }, { nombre: "Sésamo", cantidad: "1 cucharadita" }],
    pasos: ["Corta el tofu en dados y dóralo en la sartén por todos los lados.", "Retíralo y saltea las verduras en tiras a fuego vivo 5 minutos.", "Devuelve el tofu, añade la salsa de soja y saltea 2 minutos más.", "Sirve con el sésamo espolvoreado."],
    dietas: ["vegana"], alergenos: ["soja", "gluten"], contiene: [], objetivos: ["musculo", "equilibrio"],
  },
  // ---------- CENAS ----------
  {
    id: "salmonEsparragos", nombre: "Salmón a la plancha con espárragos", categoria: "cena", img: "pescado", kcalAprox: 450,
    ingredientes: [{ nombre: "Lomo de salmón", cantidad: "170 g" }, { nombre: "Espárragos verdes", cantidad: "8 unidades" }, { nombre: "Limón", cantidad: "½ unidad" }, { nombre: "Aceite de oliva", cantidad: "1 cucharadita" }],
    pasos: ["Haz el salmón a la plancha 3-4 minutos por lado, empezando por la piel.", "Saltea los espárragos en la misma plancha con una pizca de sal.", "Exprime el limón por encima al servir.", "Termina con un hilo de aceite de oliva en crudo."],
    dietas: [], alergenos: ["pescado"], contiene: ["pescadoAzul"], objetivos: ["perder", "musculo"],
  },
  {
    id: "revueltoCalabacin", nombre: "Revuelto de huevo, champiñones y calabacín", categoria: "cena", img: "huevo", kcalAprox: 320,
    ingredientes: [{ nombre: "Huevos", cantidad: "3 unidades" }, { nombre: "Calabacín", cantidad: "½ unidad" }, { nombre: "Champiñones", cantidad: "100 g" }, { nombre: "Aceite de oliva", cantidad: "1 cucharadita" }],
    pasos: ["Saltea el calabacín en dados y los champiñones laminados 5 minutos.", "Bate los huevos con una pizca de sal.", "Viértelos sobre las verduras y remueve a fuego suave.", "Retira cuando estén cuajados pero jugosos."],
    dietas: ["vegetariana"], alergenos: ["huevo"], contiene: ["huevo"], objetivos: ["perder"],
  },
  {
    id: "cremaVerduras", nombre: "Crema de verduras con patata", categoria: "cena", img: "verdura", kcalAprox: 300,
    ingredientes: [{ nombre: "Calabacín", cantidad: "1 unidad" }, { nombre: "Zanahoria", cantidad: "2 unidades" }, { nombre: "Puerro", cantidad: "1 unidad" }, { nombre: "Patata", cantidad: "1 mediana" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Trocea todas las verduras y la patata.", "Rehógalas 5 minutos con el aceite en una olla.", "Cubre con agua y cuece 20 minutos.", "Tritura hasta que quede fina y ajusta de sal."],
    dietas: ["vegana"], alergenos: [], contiene: ["patata"], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "pavoPureColiflor", nombre: "Pavo a la plancha con puré de coliflor", categoria: "cena", img: "pollo", kcalAprox: 400,
    ingredientes: [{ nombre: "Pechuga de pavo", cantidad: "160 g" }, { nombre: "Coliflor", cantidad: "300 g" }, { nombre: "Ajo", cantidad: "1 diente" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Cuece la coliflor 12-15 minutos hasta que esté muy tierna.", "Tritúrala con el aceite, el ajo (dorado antes) y sal: quedará como un puré.", "Haz el pavo a la plancha 4 minutos por lado.", "Sirve el pavo sobre el puré con pimienta recién molida."],
    dietas: [], alergenos: [], contiene: ["pollo", "verdurasCrucif"], objetivos: ["perder", "musculo"],
  },
  {
    id: "tortillaPatata", nombre: "Tortilla de patata al horno con ensalada", categoria: "cena", img: "huevo", kcalAprox: 480,
    ingredientes: [{ nombre: "Huevos", cantidad: "3 unidades" }, { nombre: "Patata", cantidad: "200 g" }, { nombre: "Cebolla", cantidad: "½ unidad" }, { nombre: "Ensalada verde", cantidad: "1 bol" }],
    pasos: ["Corta la patata y la cebolla finas y hornéalas 25 minutos a 190 °C.", "Bate los huevos y mezcla con la patata y cebolla asadas.", "Vierte en un molde y hornea 12-15 minutos hasta cuajar.", "Sirve una porción con la ensalada aliñada."],
    dietas: ["vegetariana"], alergenos: ["huevo"], contiene: ["huevo", "patata"], objetivos: ["equilibrio", "ganar"],
  },
  {
    id: "ensaladaQuinoaAguacate", nombre: "Ensalada templada de quinoa con aguacate", categoria: "cena", img: "ensalada", kcalAprox: 420,
    ingredientes: [{ nombre: "Quinoa", cantidad: "60 g (en seco)" }, { nombre: "Aguacate", cantidad: "½ unidad" }, { nombre: "Tomate", cantidad: "1 unidad" }, { nombre: "Pepino", cantidad: "½ unidad" }, { nombre: "Limón", cantidad: "½ unidad" }],
    pasos: ["Cuece la quinoa 15 minutos y deja que se temple.", "Corta el aguacate, el tomate y el pepino en dados.", "Mezcla todo en un bol grande.", "Aliña con zumo de limón, aceite y sal justo antes de servir."],
    dietas: ["vegana"], alergenos: [], contiene: ["aguacate"], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "pescadoBlancoVerduras", nombre: "Pescado blanco al horno con verduras", categoria: "cena", img: "pescado", kcalAprox: 380,
    ingredientes: [{ nombre: "Lubina o merluza", cantidad: "200 g" }, { nombre: "Calabacín", cantidad: "½ unidad" }, { nombre: "Zanahoria", cantidad: "1 unidad" }, { nombre: "Cebolla", cantidad: "½ unidad" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Corta las verduras en juliana y ponlas en una bandeja con el aceite.", "Hornea las verduras 15 minutos a 190 °C.", "Coloca el pescado salpimentado encima.", "Hornea 10-12 minutos más y sirve con el jugo de la bandeja."],
    dietas: [], alergenos: ["pescado"], contiene: ["pescadoBlanco"], objetivos: ["perder"],
  },
  {
    id: "salteadoPolloArroz", nombre: "Salteado de pollo con arroz y verduras", categoria: "cena", img: "arroz", kcalAprox: 550,
    ingredientes: [{ nombre: "Pechuga de pollo", cantidad: "150 g" }, { nombre: "Arroz", cantidad: "60 g (en seco)" }, { nombre: "Verduras variadas", cantidad: "200 g" }, { nombre: "Aceite de oliva", cantidad: "1 cucharada" }],
    pasos: ["Cuece el arroz y resérvalo.", "Saltea el pollo en tiras hasta dorarlo.", "Añade las verduras en juliana y saltea 5 minutos a fuego vivo.", "Incorpora el arroz, mezcla 2 minutos y ajusta de sal."],
    dietas: [], alergenos: [], contiene: ["pollo", "arroz"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "hamburguesaCasera", nombre: "Hamburguesa casera de ternera con pan integral", categoria: "cena", img: "carne", kcalAprox: 620,
    ingredientes: [{ nombre: "Ternera picada", cantidad: "150 g" }, { nombre: "Pan integral de hamburguesa", cantidad: "1 unidad" }, { nombre: "Lechuga y tomate", cantidad: "al gusto" }, { nombre: "Cebolla", cantidad: "unas aros" }],
    pasos: ["Forma la hamburguesa con la carne salpimentada, sin apretarla demasiado.", "Hazla a la plancha 3-4 minutos por lado.", "Tuesta ligeramente el pan en la misma plancha.", "Monta con lechuga, tomate y cebolla."],
    dietas: [], alergenos: ["gluten"], contiene: ["carneRoja"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "tofuBrocoli", nombre: "Tofu salteado con brócoli y sésamo", categoria: "cena", img: "verdura", kcalAprox: 380,
    ingredientes: [{ nombre: "Tofu firme", cantidad: "150 g" }, { nombre: "Brócoli", cantidad: "200 g" }, { nombre: "Salsa tamari (sin gluten)", cantidad: "1 cucharada" }, { nombre: "Sésamo", cantidad: "1 cucharadita" }],
    pasos: ["Corta el tofu en dados y dóralo bien por todos los lados.", "Cuece el brócoli al vapor 4 minutos: debe quedar crujiente.", "Junta tofu y brócoli en la sartén con el tamari.", "Saltea 2 minutos y sirve con el sésamo por encima."],
    dietas: ["vegana"], alergenos: ["soja"], contiene: ["verdurasCrucif"], objetivos: ["musculo", "perder"],
  },
  {
    id: "pistoArroz", nombre: "Pisto de verduras con arroz", categoria: "cena", img: "verdura", kcalAprox: 350,
    ingredientes: [{ nombre: "Tomate triturado", cantidad: "200 g" }, { nombre: "Pimiento rojo y verde", cantidad: "½ + ½" }, { nombre: "Calabacín", cantidad: "½ unidad" }, { nombre: "Cebolla", cantidad: "½ unidad" }, { nombre: "Arroz", cantidad: "50 g (en seco)" }],
    pasos: ["Sofríe la cebolla y los pimientos picados 5 minutos.", "Añade el calabacín en dados y cocina 5 minutos más.", "Incorpora el tomate y deja reducir 15 minutos a fuego suave.", "Cuece el arroz aparte y sírvelo con el pisto por encima."],
    dietas: ["vegana"], alergenos: [], contiene: ["arroz"], objetivos: ["equilibrio", "perder"],
  },
  {
    id: "espaguetisCalabacin", nombre: "Espaguetis integrales con calabacín y tomate", categoria: "cena", img: "pasta", kcalAprox: 520,
    ingredientes: [{ nombre: "Espaguetis integrales", cantidad: "90 g (en seco)" }, { nombre: "Calabacín", cantidad: "1 unidad" }, { nombre: "Tomate triturado", cantidad: "200 g" }, { nombre: "Ajo", cantidad: "2 dientes" }],
    pasos: ["Dora el ajo laminado y añade el calabacín en medias lunas.", "Incorpora el tomate y cocina 10 minutos.", "Cuece los espaguetis al dente.", "Mezcla la pasta con la salsa y sirve con albahaca si tienes."],
    dietas: ["vegana"], alergenos: ["gluten"], contiene: ["pasta"], objetivos: ["equilibrio", "ganar"],
  },
  {
    id: "bolArrozAlubias", nombre: "Bol de arroz con alubias negras y aguacate", categoria: "cena", img: "arroz", kcalAprox: 560,
    ingredientes: [{ nombre: "Arroz", cantidad: "70 g (en seco)" }, { nombre: "Alubias negras cocidas", cantidad: "150 g" }, { nombre: "Aguacate", cantidad: "½ unidad" }, { nombre: "Maíz dulce", cantidad: "50 g" }, { nombre: "Lima", cantidad: "½ unidad" }],
    pasos: ["Cuece el arroz y colócalo como base del bol.", "Calienta las alubias y repártelas encima con el maíz.", "Añade el aguacate laminado.", "Termina con zumo de lima, sal y un toque de comino."],
    dietas: ["vegana"], alergenos: [], contiene: ["arroz", "legumbres", "aguacate"], objetivos: ["ganar", "equilibrio"],
  },
  {
    id: "fajitasPollo", nombre: "Fajitas de pollo con pimientos", categoria: "cena", img: "pollo", kcalAprox: 540,
    ingredientes: [{ nombre: "Tortillas de trigo", cantidad: "2 unidades" }, { nombre: "Pechuga de pollo", cantidad: "150 g" }, { nombre: "Pimiento rojo y verde", cantidad: "½ + ½" }, { nombre: "Cebolla", cantidad: "½ unidad" }],
    pasos: ["Corta el pollo, los pimientos y la cebolla en tiras.", "Saltea el pollo hasta dorarlo y resérvalo.", "Saltea las verduras a fuego vivo 5 minutos y junta con el pollo.", "Calienta las tortillas y rellénalas al momento."],
    dietas: [], alergenos: ["gluten"], contiene: ["pollo"], objetivos: ["equilibrio", "musculo"],
  },
  // ---------- SNACKS ----------
  {
    id: "frutaAlmendras", nombre: "Fruta fresca con puñado de almendras", categoria: "snack", img: "fruta", kcalAprox: 200,
    ingredientes: [{ nombre: "Fruta de temporada", cantidad: "1 pieza" }, { nombre: "Almendras crudas", cantidad: "10 unidades" }],
    pasos: ["Lava la fruta y córtala si lo prefieres.", "Acompáñala con las almendras.", "Mastica despacio: es un snack que sacia mucho."],
    dietas: ["vegana"], alergenos: ["frutosSecos"], contiene: ["frutosSecos"], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "yogurCanela", nombre: "Yogur natural con canela", categoria: "snack", img: "yogur", kcalAprox: 130,
    ingredientes: [{ nombre: "Yogur natural", cantidad: "1 unidad (125 g)" }, { nombre: "Canela", cantidad: "1 pizca" }, { nombre: "Miel", cantidad: "1 cucharadita (opcional)" }],
    pasos: ["Remueve el yogur hasta que quede cremoso.", "Espolvorea la canela por encima.", "Añade la miel solo si necesitas el toque dulce."],
    dietas: ["vegetariana"], alergenos: ["lactosa"], contiene: ["lacteos"], objetivos: ["perder"],
  },
  {
    id: "hummusZanahoria", nombre: "Bastones de zanahoria con hummus", categoria: "snack", img: "verdura", kcalAprox: 180,
    ingredientes: [{ nombre: "Zanahoria", cantidad: "2 unidades" }, { nombre: "Hummus", cantidad: "50 g" }],
    pasos: ["Pela las zanahorias y córtalas en bastones.", "Sirve el hummus en un cuenco pequeño.", "Moja y disfruta: fibra + proteína vegetal."],
    dietas: ["vegana"], alergenos: [], contiene: ["legumbres"], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "batidoPlatanoArroz", nombre: "Batido de plátano con bebida de arroz", categoria: "snack", img: "batido", kcalAprox: 250,
    ingredientes: [{ nombre: "Plátano", cantidad: "1 unidad" }, { nombre: "Bebida de arroz", cantidad: "250 ml" }, { nombre: "Canela", cantidad: "1 pizca" }],
    pasos: ["Pela y trocea el plátano.", "Bate con la bebida de arroz 1 minuto.", "Sirve frío con la canela por encima."],
    dietas: ["vegana"], alergenos: [], contiene: ["platano", "arroz"], objetivos: ["ganar", "equilibrio"],
  },
  {
    id: "tortitasCacahuete", nombre: "Tortitas de arroz con crema de cacahuete", categoria: "snack", img: "tostada", kcalAprox: 260,
    ingredientes: [{ nombre: "Tortitas de arroz", cantidad: "2 unidades" }, { nombre: "Crema de cacahuete", cantidad: "20 g" }],
    pasos: ["Unta la crema de cacahuete sobre las tortitas.", "Puedes añadir rodajas de plátano por encima.", "Ideal antes o después de actividad física."],
    dietas: ["vegana"], alergenos: ["frutosSecos"], contiene: ["arroz", "frutosSecos"], objetivos: ["ganar", "musculo"],
  },
  {
    id: "quesoBatidoFrutosRojos", nombre: "Queso batido 0% con frutos rojos", categoria: "snack", img: "yogur", kcalAprox: 150,
    ingredientes: [{ nombre: "Queso batido 0%", cantidad: "150 g" }, { nombre: "Frutos rojos", cantidad: "80 g" }],
    pasos: ["Sirve el queso batido en un bol.", "Añade los frutos rojos lavados por encima.", "Un snack muy alto en proteína y muy saciante."],
    dietas: ["vegetariana"], alergenos: ["lactosa"], contiene: ["lacteos"], objetivos: ["musculo", "perder"],
  },
  {
    id: "macedonia", nombre: "Macedonia de fruta fresca", categoria: "snack", img: "fruta", kcalAprox: 150,
    ingredientes: [{ nombre: "Naranja", cantidad: "1 unidad" }, { nombre: "Kiwi", cantidad: "1 unidad" }, { nombre: "Fresas", cantidad: "5 unidades" }, { nombre: "Menta", cantidad: "unas hojas (opcional)" }],
    pasos: ["Pela y trocea toda la fruta en dados.", "Mezcla en un bol con el zumo que suelte la naranja.", "Añade la menta picada y deja enfriar 10 minutos."],
    dietas: ["vegana"], alergenos: [], contiene: [], objetivos: ["perder", "equilibrio"],
  },
  {
    id: "huevoDuroCherry", nombre: "Huevo duro con tomates cherry", categoria: "snack", img: "huevo", kcalAprox: 160,
    ingredientes: [{ nombre: "Huevo", cantidad: "1-2 unidades" }, { nombre: "Tomates cherry", cantidad: "6 unidades" }, { nombre: "Sal y aceite de oliva", cantidad: "al gusto" }],
    pasos: ["Cuece el huevo 10 minutos desde que hierva el agua.", "Enfríalo bajo el grifo y pélalo.", "Sirve en mitades con los cherry, sal y un hilo de aceite."],
    dietas: ["vegetariana"], alergenos: ["huevo"], contiene: ["huevo"], objetivos: ["perder", "musculo"],
  },
  {
    id: "edamame", nombre: "Edamame al vapor con sal en escamas", categoria: "snack", img: "legumbre", kcalAprox: 180,
    ingredientes: [{ nombre: "Edamame (con vaina)", cantidad: "100 g" }, { nombre: "Sal en escamas", cantidad: "1 pizca" }],
    pasos: ["Cuece o haz al vapor el edamame 5 minutos.", "Escúrrelo y sazona con la sal en escamas.", "Cómelo presionando la vaina para sacar las habas."],
    dietas: ["vegana"], alergenos: ["soja"], contiene: ["legumbres"], objetivos: ["musculo", "perder"],
  },
  {
    id: "cruditesGuacamole", nombre: "Crudités de pepino y pimiento con guacamole", categoria: "snack", img: "verdura", kcalAprox: 170,
    ingredientes: [{ nombre: "Pepino", cantidad: "½ unidad" }, { nombre: "Pimiento rojo", cantidad: "½ unidad" }, { nombre: "Guacamole", cantidad: "60 g" }],
    pasos: ["Corta el pepino y el pimiento en bastones.", "Sirve el guacamole en un cuenco.", "Moja los bastones: grasas buenas y muy pocas calorías."],
    dietas: ["vegana"], alergenos: [], contiene: ["aguacate"], objetivos: ["equilibrio", "perder"],
  },
];

const SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Franjas de comida según el nº de comidas al día, con reparto calórico orientativo.
const REPARTO = {
  3: [
    { nombre: "Desayuno", hora: "08:30", pct: 0.3, cat: "desayuno" },
    { nombre: "Comida", hora: "14:00", pct: 0.4, cat: "comida" },
    { nombre: "Cena", hora: "21:00", pct: 0.3, cat: "cena" },
  ],
  4: [
    { nombre: "Desayuno", hora: "08:00", pct: 0.25, cat: "desayuno" },
    { nombre: "Comida", hora: "14:00", pct: 0.35, cat: "comida" },
    { nombre: "Merienda", hora: "17:30", pct: 0.15, cat: "snack" },
    { nombre: "Cena", hora: "21:00", pct: 0.25, cat: "cena" },
  ],
  5: [
    { nombre: "Desayuno", hora: "08:00", pct: 0.25, cat: "desayuno" },
    { nombre: "Media mañana", hora: "11:00", pct: 0.1, cat: "snack" },
    { nombre: "Comida", hora: "14:00", pct: 0.3, cat: "comida" },
    { nombre: "Merienda", hora: "17:30", pct: 0.1, cat: "snack" },
    { nombre: "Cena", hora: "21:00", pct: 0.25, cat: "cena" },
  ],
};

/* Filtra el catálogo según las preferencias del usuario.
   Alergias y tipo de dieta son ESTRICTOS; los "no me gusta" se relajan
   si dejan una categoría con menos de 4 recetas (el catálogo garantiza
   que con solo alergias + dieta siempre quedan al menos 4 por categoría). */
function filtrarRecetas(datos) {
  const excluyeAlergeno = (r) => r.alergenos.some((a) =>
    datos.alergias.includes(a)
    || (datos.tipoDieta === "sinGluten" && a === "gluten")
    || (datos.tipoDieta === "sinLactosa" && a === "lactosa"));
  const cumpleDieta = (r) =>
    datos.tipoDieta === "vegetariana" ? (r.dietas.includes("vegetariana") || r.dietas.includes("vegana"))
      : datos.tipoDieta === "vegana" ? r.dietas.includes("vegana")
        : true;
  const porCategoria = (cat) => {
    const base = RECETAS.filter((r) => r.categoria === cat && !excluyeAlergeno(r) && cumpleDieta(r));
    let pool = base.filter((r) => !r.contiene.some((c) => datos.noGusta.includes(c)));
    if (pool.length < 4) pool = base; // relaja "no me gusta"; alergias y dieta, nunca
    // Afinidad con el objetivo: solo reordena (afines primero), no filtra.
    return [...pool.filter((r) => r.objetivos.includes(datos.objetivo)), ...pool.filter((r) => !r.objetivos.includes(datos.objetivo))];
  };
  return { desayuno: porCategoria("desayuno"), comida: porCategoria("comida"), cena: porCategoria("cena"), snack: porCategoria("snack") };
}

function buildDiet(datos, kcal) {
  const pools = filtrarRecetas(datos);
  return SEMANA.map((dia, i) => ({
    dia,
    comidas: REPARTO[datos.comidasDia].map((f, j) => {
      const pool = pools[f.cat];
      // El desfase por franja (j*2) evita que las dos franjas de snack repitan receta el mismo día.
      return { nombre: f.nombre, hora: f.hora, kcal: Math.round((kcal * f.pct) / 10) * 10, receta: pool[(i + j * 2) % pool.length] };
    }),
  }));
}

function calcularMetricas({ sexo, edad, peso, altura, objetivo }) {
  const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === "hombre" ? 5 : -161);
  const tdee = tmb * 1.5;
  const ajuste = objetivo === "perder" ? -450 : objetivo === "ganar" ? 400 : objetivo === "musculo" ? 250 : 0;
  const kcal = Math.round((tdee + ajuste) / 10) * 10;
  const prot = Math.round(peso * (objetivo === "musculo" ? 2.2 : objetivo === "perder" ? 2 : 1.8));
  const grasa = Math.round(peso * 0.9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { kcal, prot, grasa, carbs };
}

const OBJETIVOS = [
  { id: "perder", titulo: "Perder peso", desc: "Déficit calórico sin pasar hambre", img: U("1512621776951-a57141f2eefd") },
  { id: "equilibrio", titulo: "Comer equilibrado", desc: "Salud y energía en el día a día", img: U("1490474418585-ba9bad8fd0ea") },
  { id: "ganar", titulo: "Ganar peso", desc: "Superávit calórico limpio", img: U("1551183053-bf91a1d81141") },
  { id: "musculo", titulo: "Ganar músculo", desc: "Alta proteína para construir masa", img: U("1467003909585-2f8a72700288") },
];
const HERO_IMG = U("1504674900247-0877df9cc836");
const BANNER_DIETA = U("1490645935967-10de6ba17061");

/* Migra un plan guardado con el formato antiguo (app con entrenamientos)
   al formato actual. Los objetivos antiguos se traducen a los nuevos y
   los campos de fitness (nivel, dias) desaparecen. */
function migrarDatos(d) {
  if (!d) return null;
  const esAntiguo = "nivel" in d || "dias" in d;
  const idsActuales = OBJETIVOS.map((o) => o.id);
  const mapaAntiguo = { perder: "perder", ganar: "musculo", ambos: "equilibrio", resistencia: "equilibrio" };
  const objetivo = esAntiguo ? (mapaAntiguo[d.objetivo] ?? null) : (idsActuales.includes(d.objetivo) ? d.objetivo : null);
  const { nivel, dias, ...resto } = d;
  return {
    sexo: null, edad: 28, peso: 75, altura: 172,
    ...resto,
    objetivo,
    tipoDieta: TIPOS_DIETA.some((t) => t.id === d.tipoDieta) ? d.tipoDieta : "omnivora",
    alergias: Array.isArray(d.alergias) ? d.alergias : [],
    noGusta: Array.isArray(d.noGusta) ? d.noGusta : [],
    comidasDia: [3, 4, 5].includes(d.comidasDia) ? d.comidasDia : 5,
  };
}

export default function App() {
  const [fase, setFase] = useState("hero");
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ objetivo: null, sexo: null, edad: 28, peso: 75, altura: 172, tipoDieta: "omnivora", alergias: [], noGusta: [], comidasDia: 5 });
  const [authAbierto, setAuthAbierto] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(null);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));
  const { user } = useAuth();
  useEffect(() => { window.scrollTo(0, 0); }, [fase, paso]);

  // Al iniciar sesión, recupera el último plan guardado del usuario (migrándolo si es antiguo).
  useEffect(() => {
    if (!supabase || !user) { setPlanGuardado(null); return; }
    supabase.from("planes").select("datos").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const migrado = migrarDatos(data?.datos ?? null);
        setPlanGuardado(migrado && migrado.objetivo ? migrado : null);
      });
  }, [user]);

  const retomarPlan = () => { if (planGuardado) { setDatos(planGuardado); setFase("plan"); } };

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
      {fase === "hero" && <Hero onStart={() => setFase("form")} onLogin={() => setAuthAbierto(true)} planGuardado={planGuardado} onRetomar={retomarPlan} />}
      {fase === "form" && <Formulario datos={datos} set={set} paso={paso} setPaso={setPaso} onFinish={() => setFase("scan")} onBack={() => setFase("hero")} />}
      {fase === "scan" && <Scan onDone={() => setFase("plan")} />}
      {fase === "plan" && <Plan datos={datos} onReset={() => { setPaso(0); setDatos((d) => ({ ...d, objetivo: null, sexo: null })); setFase("hero"); }} onLogin={() => setAuthAbierto(true)} />}
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="fadeUp" style={{ width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 22, padding: 26 }}>
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
          <button type="submit" disabled={cargando} style={{ ...grad, width: "100%", marginTop: 18, border: "none", color: "#0A0B0D", fontWeight: 800, fontSize: 15, padding: 15, borderRadius: 999, opacity: cargando ? 0.6 : 1 }}>
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

// Chip de sesión reutilizable en las cabeceras (login / usuario).
function CuentaChip({ onLogin, oscuro }) {
  const { enabled, ready, user, signOut } = useAuth();
  if (!enabled || !ready) return null;
  const base = { borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 700 };
  if (!user) return (
    <button onClick={onLogin} style={{ ...base, ...grad, border: "none", color: "#0A0B0D" }}>Iniciar sesión</button>
  );
  const nombre = (user.email || "").split("@")[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: oscuro ? C.text : C.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>👤 {nombre}</span>
      <button onClick={() => signOut()} style={{ ...base, background: oscuro ? "rgba(0,0,0,.4)" : C.panel, border: `1px solid ${C.line}`, color: C.text }}>Salir</button>
    </div>
  );
}

function Hero({ onStart, onLogin, planGuardado, onRetomar }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img src={HERO_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenburns 18s ease-out both" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(10,11,13,.55) 0%, rgba(10,11,13,.35) 40%, rgba(10,11,13,.92) 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 480px at 78% 12%, rgba(255,77,46,.28), transparent 62%)` }} />
      </div>
      <header style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", gap: 12 }}>
        <div style={{ ...DF, fontWeight: 800, fontSize: 24, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></div>
        <CuentaChip onLogin={onLogin} oscuro />
      </header>
      <main className="fadeUp" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 28px 9vh", maxWidth: 1100 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.32em", color: C.hot2, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>Tu plan. Tu mesa. Tus reglas.</div>
        <h1 style={{ ...DF, fontSize: "clamp(46px, 9vw, 118px)", fontWeight: 800, lineHeight: 0.95, margin: 0 }}>Come con<br /><span style={gradText}>intención.</span></h1>
        <p style={{ color: "#D7DADF", fontSize: 18, maxWidth: 540, lineHeight: 1.6, marginTop: 26 }}>Dinos tu objetivo, tus gustos y tus alergias. En segundos generamos tu semana de comidas completa, con cada receta ilustrada, sus ingredientes y su modo de elaboración paso a paso.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={onStart} style={{ ...grad, marginTop: 34, border: "none", color: "#0A0B0D", fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", padding: "19px 56px", borderRadius: 999, boxShadow: "0 10px 44px rgba(255,77,46,.4)", transition: "transform .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>CREAR MI PLAN GRATIS →</button>
          {planGuardado && (
            <button onClick={onRetomar} style={{ marginTop: 34, background: "rgba(255,255,255,.06)", border: `1.5px solid ${C.line}`, color: C.text, fontWeight: 700, fontSize: 15, padding: "18px 30px", borderRadius: 999, backdropFilter: "blur(6px)" }}>↩ Continuar con mi plan guardado</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 60, flexWrap: "wrap" }}>
          {[["4", "objetivos"], ["7 días", "de dieta"], [`${RECETAS.length}`, "recetas con foto"]].map(([n, t]) => (
            <div key={t}><div style={{ ...DF, fontSize: 32, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{t}</div></div>
          ))}
        </div>
      </main>
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
                  <button key={o.id} onClick={() => set("objetivo", o.id)} style={{ position: "relative", height: 200, borderRadius: 20, overflow: "hidden", border: `2px solid ${activo ? C.hot1 : "transparent"}`, padding: 0, textAlign: "left", boxShadow: activo ? "0 10px 40px rgba(255,77,46,.3)" : "none", transition: "border-color .15s" }}>
                    <img src={o.img} alt="" onError={onImgError} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
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
            <h2 style={{ ...DF, fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 8px" }}>¿Qué tipo de dieta sigues?</h2>
            <p style={{ color: C.dim, marginBottom: 28 }}>Todas las recetas de tu plan la respetarán.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {TIPOS_DIETA.map((t) => (
                <button key={t.id} onClick={() => set("tipoDieta", t.id)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.tipoDieta === t.id ? "linear-gradient(135deg, rgba(255,77,46,.18), rgba(255,154,60,.08))" : C.panel, border: `1.5px solid ${datos.tipoDieta === t.id ? C.hot1 : C.line}` }}>
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
                <button key={n} onClick={() => set("comidasDia", n)} style={{ textAlign: "left", padding: "18px 20px", borderRadius: 16, color: C.text, background: datos.comidasDia === n ? "linear-gradient(135deg, rgba(255,77,46,.18), rgba(255,154,60,.08))" : C.panel, border: `1.5px solid ${datos.comidasDia === n ? C.hot1 : C.line}` }}>
                  <div style={{ ...DF, fontWeight: 800, fontSize: 22 }}>{n} <span style={{ fontSize: 13, fontWeight: 400, color: C.dim }}>comidas</span></div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>{REPARTO[n].map((f) => f.nombre).join(" · ")}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button onClick={next} disabled={!puedeSeguir} style={{ ...(puedeSeguir ? grad : { background: C.panel2 }), marginTop: 34, border: "none", color: puedeSeguir ? "#0A0B0D" : C.dim, fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", padding: 18, borderRadius: 999, width: "100%", opacity: puedeSeguir ? 1 : 0.6, cursor: puedeSeguir ? "pointer" : "not-allowed" }}>{paso < ultimo ? "CONTINUAR →" : "GENERAR MI PLAN ⚡"}</button>
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

function Plan({ datos, onReset, onLogin }) {
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

    line("PULSO", { size: 24, style: "bold", color: [255, 77, 46], gap: 3 });
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

    line("DIETA SEMANAL", { size: 15, style: "bold", color: [255, 77, 46] });
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
    line("RECETARIO", { size: 15, style: "bold", color: [255, 77, 46] });
    space(4);
    recetario.forEach((r) => {
      ensure(60);
      line(r.nombre, { size: 11.5, style: "bold" });
      line(`${cap(r.categoria)} · ~${r.kcalAprox} kcal por ración`, { size: 9, color: [125, 125, 125], gap: 3 });
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
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,11,13,.5), rgba(10,11,13,.95))" }} />
        <header style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
          <div style={{ ...DF, fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>PULSO<span style={gradText}>.</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {enabled && user && guardado && <span style={{ fontSize: 12, color: C.hot2, fontWeight: 700 }}>✓ Guardado</span>}
            <button onClick={descargarPDF} style={{ ...grad, border: "none", color: "#0A0B0D", fontWeight: 800, borderRadius: 999, padding: "8px 18px", fontSize: 13, boxShadow: "0 6px 22px rgba(255,77,46,.35)" }}>⬇ Descargar PDF</button>
            <button onClick={onReset} style={{ background: "rgba(0,0,0,.4)", border: `1px solid ${C.line}`, color: C.text, borderRadius: 999, padding: "8px 18px", fontSize: 13, backdropFilter: "blur(6px)" }}>↺ Empezar de nuevo</button>
            <CuentaChip onLogin={onLogin} oscuro />
          </div>
        </header>
        <div className="fadeUp" style={{ position: "absolute", left: 0, right: 0, bottom: 26, maxWidth: 980, margin: "0 auto", padding: "0 18px" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: C.hot2, fontWeight: 700 }}>Tu plan · {obj?.titulo}{datos.tipoDieta !== "omnivora" ? ` · ${tipoDieta?.titulo}` : ""}</div>
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
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,11,13,.85), rgba(10,11,13,.3))", display: "flex", alignItems: "center", padding: "0 26px" }}>
              <div>
                <div style={{ ...DF, fontSize: 24, fontWeight: 800 }}>Tu semana de comidas</div>
                <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>~{m.kcal} kcal · {m.prot} g proteína al día</div>
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
                      <div>
                        <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Ingredientes</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
                          {c.receta.ingredientes.map((ing) => (
                            <li key={ing.nombre} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "#D6D9DE" }}>
                              <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 13, flexShrink: 0, minWidth: 74 }}>{ing.cantidad}</span>{ing.nombre}
                            </li>
                          ))}
                        </ul>
                        <div style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", margin: "18px 0 10px" }}>Modo de elaboración</div>
                        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                          {c.receta.pasos.map((p, pi) => (
                            <li key={pi} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.55, color: "#D6D9DE" }}>
                              <span style={{ ...DF, ...gradText, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{pi + 1}</span>{p}
                            </li>
                          ))}
                        </ol>
                      </div>
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
