/* ============================================================
   PULSO — Catálogos de datos y lógica pura de la aplicación
   (recetas, filtrado, plan semanal, métricas y migración).
   Sin dependencias de React: se importa desde PulsoFit.tsx
   y desde los tests.
   ============================================================ */

export const U = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Enlace a una búsqueda en YouTube por el nombre de la receta: siempre funciona
// y no depende de un vídeo concreto que pueda borrarse.
export const youtubeUrl = (nombre) => `https://www.youtube.com/results?search_query=${encodeURIComponent(nombre + " receta")}`;
// Minúsculas y sin tildes, para que la búsqueda encuentre "sandwich" en "Sándwich".
export const normalizar = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Banco de fotos de plato por tipo de ingrediente principal (Unsplash).
export const FOODIMG = {
  pescado: "1467003909585-2f8a72700288", pollo: "1604908176997-125f25cc6f3d", carne: "1546964124-0cce460f38ef",
  huevo: "1482049016688-2d3e1b311543", avena: "1517673400267-0251440c45dc", yogur: "1488477181946-6428a0291777",
  ensalada: "1512621776951-a57141f2eefd", arroz: "1516684732162-798a0062be99", pasta: "1551183053-bf91a1d81141",
  legumbre: "1585032226651-759b368d7246", tostada: "1528735602780-2552fd46c7af", batido: "1553530666-ba11a7da3888",
  fruta: "1490474418585-ba9bad8fd0ea", patata: "1518977676601-b53f82aba655", verdura: "1540420773420-3366772f4999",
  otro: "1504674900247-0877df9cc836",
};

export const TIPOS_DIETA = [
  { id: "omnivora", titulo: "Omnívora", desc: "Como de todo" },
  { id: "vegetariana", titulo: "Vegetariana", desc: "Sin carne ni pescado" },
  { id: "vegana", titulo: "Vegana", desc: "Sin ningún producto animal" },
  { id: "sinGluten", titulo: "Sin gluten", desc: "Celiaquía o sensibilidad al gluten" },
  { id: "sinLactosa", titulo: "Sin lactosa", desc: "Intolerancia a la lactosa" },
];

// Alérgenos e intolerancias: exclusión ESTRICTA, nunca se relaja.
export const ALERGENOS = [
  { id: "frutosSecos", nombre: "Frutos secos" },
  { id: "marisco", nombre: "Marisco" },
  { id: "lactosa", nombre: "Lactosa" },
  { id: "gluten", nombre: "Gluten" },
  { id: "huevo", nombre: "Huevo" },
  { id: "pescado", nombre: "Pescado" },
  { id: "soja", nombre: "Soja" },
];

// Alimentos "no me gustan": se excluyen si el catálogo da suficiente variedad.
export const ALIMENTOS = [
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
export const RECETAS = [
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

// Recetas icónicas de películas y series. Sección independiente ("cine"):
// NO participan en el plan semanal ni en el PDF (buildDiet/descargarPDF solo usan RECETAS).
// - fotoEscena: imagen real de la obra (hotlink a los wikis de Fandom / Wikimedia),
//   se usa como miniatura y como banner de la ficha para que sea fiel a la serie.
// - fotoPlato: foto real del plato (Wikimedia Commons) para el detalle de la receta.
// Ambas son opcionales; si faltan o fallan al cargar se cae a la foto de FOODIMG.
export const RECETAS_CINE = [
  {
    id: "bearItalianBeef", obra: "The Bear", tipo: "serie", plato: "Sándwich de ternera italiana (Italian Beef)", img: "carne",
    fotoEscena: "https://static.wikia.nocookie.net/the-bear/images/c/ce/OriginalBeef.jpg/revision/latest/scale-to-width-down/900?cb=20230120000221",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mmm..._Italian_beef_%286286691399%29.jpg/960px-Mmm..._Italian_beef_%286286691399%29.jpg",
    escena: "El sándwich estrella de The Beef, el local de Chicago que Carmy hereda y que da origen a toda la serie.",
    ingredientes: [{ nombre: "Pan tipo baguette blanda", cantidad: "1 unidad" }, { nombre: "Redondo de ternera asado en lonchas muy finas", cantidad: "200 g" }, { nombre: "Caldo de carne (jus)", cantidad: "250 ml" }, { nombre: "Giardiniera (encurtido picante italiano)", cantidad: "3 cucharadas" }, { nombre: "Pimiento verde asado", cantidad: "½ unidad" }, { nombre: "Ajo, orégano y pimienta", cantidad: "al gusto" }],
    pasos: ["Calienta el caldo con ajo, orégano y pimienta y deja que reduzca 10 minutos.", "Sumerge las lonchas de ternera en el caldo caliente 1-2 minutos, sin que se sequen.", "Abre el pan y rellénalo con la carne escurrida.", "Corona con giardiniera y tiras de pimiento asado.", "Al estilo Chicago: moja medio sándwich en el jus antes de servir (\"dipped\")."],
  },
  {
    id: "bearTortilla", obra: "The Bear", tipo: "serie", plato: "Tortilla francesa con chips y cebollino", img: "huevo",
    fotoEscena: "https://static.wikia.nocookie.net/the-bear/images/b/b3/S02E09.jpg/revision/latest/scale-to-width-down/900?cb=20230628215758",
    escena: "La tortilla que Sydney prepara para Natalie en la 2ª temporada: queso Boursin dentro y patatas chips machacadas por encima.",
    ingredientes: [{ nombre: "Huevos", cantidad: "3 unidades" }, { nombre: "Queso crema con hierbas (tipo Boursin)", cantidad: "2 cucharadas" }, { nombre: "Patatas chips de crema y cebolla", cantidad: "1 puñado" }, { nombre: "Cebollino picado", cantidad: "1 cucharada" }, { nombre: "Mantequilla", cantidad: "1 nuez" }],
    pasos: ["Bate los huevos y cuélalos para una textura extrafina.", "Cuájalos a fuego muy suave con la mantequilla, removiendo sin parar: no deben dorarse.", "Antes de cerrar la tortilla, reparte el queso por el centro.", "Enróllala con cuidado, en forma de puro.", "Píntala con mantequilla y termina con las chips machacadas y el cebollino."],
  },
  {
    id: "ratatouille", obra: "Ratatouille", tipo: "peli", plato: "Ratatouille (confit byaldi)", img: "verdura",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Confit_byaldi_1.jpg/960px-Confit_byaldi_1.jpg",
    escena: "El plato que Rémy sirve al crítico Anton Ego y que le devuelve de golpe a su infancia.",
    ingredientes: [{ nombre: "Calabacín", cantidad: "1 unidad" }, { nombre: "Berenjena", cantidad: "1 unidad" }, { nombre: "Tomate pera", cantidad: "3 unidades" }, { nombre: "Pimiento rojo asado", cantidad: "1 unidad" }, { nombre: "Salsa de tomate", cantidad: "200 g" }, { nombre: "Aceite de oliva y tomillo", cantidad: "al gusto" }],
    pasos: ["Corta el calabacín, la berenjena y el tomate en rodajas muy finas.", "Extiende la salsa de tomate con el pimiento triturado en la base de una fuente.", "Coloca las rodajas en abanico, alternando colores.", "Riega con aceite, sal y tomillo, y cubre con papel de horno.", "Hornea 45 minutos a 160 °C. Sirve con un cordón de aceite, como en la película."],
  },
  {
    id: "chefCubano", obra: "Chef", tipo: "peli", plato: "Sándwich cubano", img: "tostada",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Cubano_sandwich.jpg/960px-Cubano_sandwich.jpg",
    escena: "El sándwich con el que Carl Casper recorre EE. UU. en su food truck 'El Jefe' junto a su hijo.",
    ingredientes: [{ nombre: "Pan cubano o chapata", cantidad: "1 unidad" }, { nombre: "Cerdo asado en lonchas", cantidad: "120 g" }, { nombre: "Jamón cocido", cantidad: "2 lonchas" }, { nombre: "Queso suizo (emmental)", cantidad: "2 lonchas" }, { nombre: "Pepinillos en rodajas", cantidad: "4 unidades" }, { nombre: "Mostaza y mantequilla", cantidad: "al gusto" }],
    pasos: ["Unta el pan con mostaza por dentro y mantequilla por fuera.", "Monta capas de cerdo, jamón, queso y pepinillos.", "Prénsalo en sartén o plancha con peso encima, 3-4 minutos por lado.", "Está listo cuando el queso funde y el pan cruje.", "Córtalo en diagonal, como manda Casper."],
  },
  {
    id: "pulpBurger", obra: "Pulp Fiction", tipo: "peli", plato: "Hamburguesa Big Kahuna", img: "carne",
    fotoEscena: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Big_Kahuna_Burger.png/960px-Big_Kahuna_Burger.png",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Pineapple_bacon_cheeseburger.jpg/960px-Pineapple_bacon_cheeseburger.jpg",
    escena: "\"Mmm, esto sí que es una hamburguesa sabrosa\": la hamburguesa hawaiana que Jules prueba en el apartamento de Brett.",
    ingredientes: [{ nombre: "Carne picada de ternera", cantidad: "180 g" }, { nombre: "Pan de hamburguesa brioche", cantidad: "1 unidad" }, { nombre: "Queso cheddar", cantidad: "1 loncha" }, { nombre: "Piña a la plancha", cantidad: "1 rodaja" }, { nombre: "Lechuga, tomate y cebolla morada", cantidad: "al gusto" }, { nombre: "Salsa barbacoa", cantidad: "1 cucharada" }],
    pasos: ["Forma la hamburguesa sin apretar demasiado y salpimienta.", "Hazla a fuego fuerte 3 minutos por lado; funde el cheddar encima al final.", "Marca la rodaja de piña en la misma sartén.", "Monta: pan, salsa, lechuga, carne con queso, piña, tomate y cebolla.", "Acompáñala de un buen refresco... aunque no sea un batido de 5 dólares."],
  },
  {
    id: "padrinoSalsa", obra: "El Padrino", tipo: "peli", plato: "Espaguetis con la salsa de Clemenza", img: "pasta",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Spaghetti_and_meatballs_1.jpg/960px-Spaghetti_and_meatballs_1.jpg",
    escena: "Clemenza enseña a Michael a cocinar para veinte: \"Primero doras el ajo, luego echas el tomate...\".",
    ingredientes: [{ nombre: "Espaguetis", cantidad: "100 g" }, { nombre: "Tomate triturado", cantidad: "400 g" }, { nombre: "Albóndigas pequeñas", cantidad: "6 unidades" }, { nombre: "Salchichas frescas", cantidad: "2 unidades" }, { nombre: "Ajo", cantidad: "2 dientes" }, { nombre: "Vino tinto y una pizca de azúcar", cantidad: "un chorrito" }],
    pasos: ["Dora el ajo laminado en aceite, sin quemarlo.", "Añade el tomate y deja que hierva suave.", "Incorpora las albóndigas y las salchichas doradas.", "Echa el chorrito de vino y la pizca de azúcar, el truco de Clemenza.", "Cuece 30 minutos a fuego lento y sirve sobre los espaguetis."],
  },
  {
    id: "rossSandwich", obra: "Friends", tipo: "serie", plato: "El sándwich de Ross (con 'jugosín')", img: "tostada",
    fotoEscena: "https://static.wikia.nocookie.net/friends/images/5/5b/TOWRoss%27Sandwich.png/revision/latest?cb=20180304183345",
    escena: "El sándwich de sobras de Acción de Gracias que le roban a Ross en el trabajo: su secreto es la rebanada central empapada en salsa.",
    ingredientes: [{ nombre: "Pan de molde", cantidad: "3 rebanadas" }, { nombre: "Pavo asado en lonchas", cantidad: "120 g" }, { nombre: "Relleno de pan y verduras (stuffing)", cantidad: "3 cucharadas" }, { nombre: "Salsa de carne (gravy)", cantidad: "100 ml" }, { nombre: "Arándanos en salsa", cantidad: "1 cucharada" }],
    pasos: ["Empapa la rebanada central en la salsa caliente: es el famoso 'jugosín' (moist maker).", "Monta la base con pavo y relleno.", "Coloca encima la rebanada empapada.", "Añade más pavo y los arándanos.", "Cierra el sándwich y córtalo por la mitad. Y que nadie te lo quite de la nevera del trabajo."],
  },
  {
    id: "pollosHermanos", obra: "Breaking Bad", tipo: "serie", plato: "Pollo frito Los Pollos Hermanos", img: "pollo",
    fotoEscena: "https://static.wikia.nocookie.net/breakingbad/images/e/ed/Los_Pollos_Hermanos.jpg/revision/latest?cb=20100622005212",
    escena: "El pollo crujiente del restaurante de Gus Fring, la tapadera más famosa de Albuquerque.",
    ingredientes: [{ nombre: "Contramuslos de pollo", cantidad: "4 unidades" }, { nombre: "Leche + zumo de ½ limón (suero casero)", cantidad: "250 ml" }, { nombre: "Harina", cantidad: "150 g" }, { nombre: "Pimentón, ajo en polvo y cayena", cantidad: "1 cucharadita de cada" }, { nombre: "Aceite para freír", cantidad: "abundante" }],
    pasos: ["Mezcla la leche con el limón y marina el pollo 1 hora en la nevera.", "Mezcla la harina con las especias y sal.", "Escurre el pollo y rebózalo presionando para que la costra agarre.", "Fríe a 170 °C unos 14 minutos, hasta que esté dorado y hecho por dentro.", "Escurre sobre rejilla para que quede crujiente, digno de Gus Fring."],
  },
];

// Recetas inspiradas en la actualidad. Sección independiente ("actualidad"):
// una tarea programada semanal añade aquí un plato ligado a una noticia real
// (deporte, cultura, efemérides...). Igual que la de cine, NO participa en el
// plan semanal ni en el PDF (buildDiet/descargarPDF solo usan RECETAS).
// - categoria: tema de la noticia ("deporte" | "cultura" | "efemeride" | "mundo").
// - titular: la noticia que inspira el plato; fecha: día de la noticia (ISO).
// - fuente: enlace a la noticia (opcional).
// - fotoEscena / fotoPlato: imágenes reales opcionales; si faltan o fallan al
//   cargar se cae a la foto de FOODIMG según `img`.
export const RECETAS_ACTUALIDAD = [
  {
    id: "sanfermin2026Pochas", categoria: "efemeride", titular: "Comienza en Pamplona la semana grande de los Sanfermines 2026, con el chupinazo y los encierros diarios", fecha: "2026-07-06",
    plato: "Pochas a la Navarra", img: "legumbre",
    fuente: "https://es.wikipedia.org/wiki/Sanfermines",
    escena: "Tras el chupinazo del 6 de julio, Pamplona se llena de pañuelicos rojos, charangas y encierros al amanecer. Y cuando el bullicio da una tregua, en cualquier casa o peña navarra hierve la olla de pochas, el guiso de alubia blanca fresca que es la comida reina de estas fiestas.",
    ingredientes: [{ nombre: "Alubia blanca fresca (pocha)", cantidad: "500 g" }, { nombre: "Chorizo", cantidad: "150 g" }, { nombre: "Panceta", cantidad: "100 g" }, { nombre: "Pimiento verde y cebolla", cantidad: "1 de cada" }, { nombre: "Tomate maduro", cantidad: "1 unidad" }, { nombre: "Ajo y laurel", cantidad: "2 dientes y 1 hoja" }],
    pasos: ["Rehoga en aceite la cebolla, el pimiento y el ajo picados hasta que estén tiernos.", "Añade el tomate rallado y sofríe unos minutos más.", "Incorpora las pochas, el chorizo, la panceta y el laurel, y cubre con agua fría.", "Cocina a fuego suave, sin tapar del todo, 'asustando' el guiso con un chorro de agua fría un par de veces para que no se rompa la piel de la alubia.", "Deja reposar 10 minutos antes de servir bien caliente, como se come en cualquier peña durante los Sanfermines."],
  },
  {
    id: "wimbledon2026Fresas", categoria: "deporte", titular: "Wimbledon 2026 entra en su semana decisiva en Londres", fecha: "2026-07-08",
    plato: "Fresas con nata de Wimbledon", img: "fruta",
    fuente: "https://en.wikipedia.org/wiki/2026_Wimbledon_Championships",
    fotoPlato: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Strawberries_and_cream_%28Wimbledon%29.jpg/960px-Strawberries_and_cream_%28Wimbledon%29.jpg",
    escena: "El bocado más icónico del tenis: mientras se juegan las semifinales en el All England Club, las gradas se llenan de cuencos de fresas con nata, la tradición inglesa que acompaña a Wimbledon desde hace más de un siglo.",
    ingredientes: [{ nombre: "Fresas frescas", cantidad: "250 g" }, { nombre: "Nata para montar (35% m.g.)", cantidad: "150 ml" }, { nombre: "Azúcar glas", cantidad: "1 cucharada" }, { nombre: "Vainilla", cantidad: "unas gotas" }],
    pasos: ["Lava las fresas, retírales el rabito y córtalas por la mitad.", "Espolvoréalas con media cucharada de azúcar y déjalas macerar 10 minutos para que suelten su jugo.", "Monta la nata bien fría con el resto del azúcar y la vainilla hasta que forme picos suaves.", "Reparte las fresas en cuencos y corona con la nata montada.", "Sírvelas al momento, como en las gradas del All England Club."],
  },
];

export const SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Franjas de comida según el nº de comidas al día, con reparto calórico orientativo.
export const REPARTO = {
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
export function filtrarRecetas(datos) {
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

export function buildDiet(datos, kcal) {
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

export function calcularMetricas({ sexo, edad, peso, altura, objetivo }) {
  const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === "hombre" ? 5 : -161);
  const tdee = tmb * 1.5;
  const ajuste = objetivo === "perder" ? -450 : objetivo === "ganar" ? 400 : objetivo === "musculo" ? 250 : 0;
  const kcal = Math.round((tdee + ajuste) / 10) * 10;
  const prot = Math.round(peso * (objetivo === "musculo" ? 2.2 : objetivo === "perder" ? 2 : 1.8));
  const grasa = Math.round(peso * 0.9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { kcal, prot, grasa, carbs };
}

export const OBJETIVOS = [
  { id: "perder", titulo: "Perder peso", desc: "Déficit calórico sin pasar hambre", img: U("1512621776951-a57141f2eefd") },
  { id: "equilibrio", titulo: "Comer equilibrado", desc: "Salud y energía en el día a día", img: U("1490474418585-ba9bad8fd0ea") },
  { id: "ganar", titulo: "Ganar peso", desc: "Superávit calórico limpio", img: U("1551183053-bf91a1d81141") },
  { id: "musculo", titulo: "Ganar músculo", desc: "Alta proteína para construir masa", img: U("1467003909585-2f8a72700288") },
];

/* ---------- Contexto para el Chef IA ----------
   El chat envía a la Edge Function un contexto compacto en texto plano:
   el catálogo resumido (sin ingredientes ni pasos, para gastar pocos
   tokens) y las preferencias del usuario. Son funciones puras para
   poder testearlas. */

export function resumenCatalogo() {
  return RECETAS.map((r) => {
    const etiquetas = [r.categoria, `~${r.kcalAprox} kcal`];
    if (r.dietas.length) etiquetas.push(r.dietas.join("/"));
    if (r.alergenos.length) etiquetas.push(`alérgenos: ${r.alergenos.join("/")}`);
    return `- ${r.nombre} (${etiquetas.join(", ")})`;
  }).join("\n");
}

export function resumenUsuario(datos) {
  if (!datos) return "";
  const partes: string[] = [];
  const dieta = TIPOS_DIETA.find((t) => t.id === datos.tipoDieta);
  if (dieta && dieta.id !== "omnivora") partes.push(`Dieta: ${dieta.titulo}`);
  const obj = OBJETIVOS.find((o) => o.id === datos.objetivo);
  if (obj) partes.push(`Objetivo: ${obj.titulo}`);
  const alergias = ALERGENOS.filter((a) => (datos.alergias ?? []).includes(a.id)).map((a) => a.nombre);
  if (alergias.length) partes.push(`Alergias e intolerancias (estrictas): ${alergias.join(", ")}`);
  const noGusta = ALIMENTOS.filter((a) => (datos.noGusta ?? []).includes(a.id)).map((a) => a.nombre);
  if (noGusta.length) partes.push(`No le gusta: ${noGusta.join(", ")}`);
  if ([3, 4, 5].includes(datos.comidasDia)) partes.push(`Hace ${datos.comidasDia} comidas al día`);
  return partes.join(". ");
}

/* Migra un plan guardado con el formato antiguo (app con entrenamientos)
   al formato actual. Los objetivos antiguos se traducen a los nuevos y
   los campos de fitness (nivel, dias) desaparecen. */
export function migrarDatos(d) {
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

/* ============================================================
   Recetas de la comunidad: creadas por usuarios con sesión y
   guardadas en Supabase (tabla recetas_comunidad). Aquí vive la
   lógica pura; la interfaz y las llamadas a Supabase, en PulsoFit.tsx.
   ============================================================ */

/* Único correo con permiso para borrar recetas de OTROS usuarios. Aquí solo
   decide qué botones se muestran: la seguridad real la imponen las políticas
   RLS de supabase/schema.sql, que repiten este mismo correo. */
export const ADMIN_EMAIL = "merinofernandezeduardo@gmail.com";

/* Una receta de la comunidad la puede borrar su autor o el administrador.
   Solo aplica a recetas con user_id (las del catálogo fijo no se borran). */
export function puedeBorrarReceta(user, receta) {
  if (!user || !receta || !receta.user_id) return false;
  return receta.user_id === user.id || user.email === ADMIN_EMAIL;
}

/* Despensa de la web: todos los ingredientes que usan las recetas del
   catálogo, sin duplicados y ordenados. Es la lista de la que se eligen
   los ingredientes al crear una receta de la comunidad. */
export const INGREDIENTES_WEB = [...new Set(RECETAS.flatMap((r) => r.ingredientes.map((i) => i.nombre)))]
  .sort((a, b) => a.localeCompare(b, "es"));

export const CATEGORIAS_RECETA = ["desayuno", "comida", "cena", "snack"];

/* Valida el borrador de una receta de la comunidad antes de publicarla.
   Devuelve la lista de problemas en castellano; vacía si es publicable. */
export function validarRecetaComunidad(borrador) {
  const errores: string[] = [];
  if (!borrador || typeof borrador !== "object") return ["La receta está vacía."];
  if (!borrador.nombre || borrador.nombre.trim().length < 3) errores.push("Ponle un nombre a la receta (mínimo 3 letras).");
  if (!CATEGORIAS_RECETA.includes(borrador.categoria)) errores.push("Elige una categoría: desayuno, comida, cena o snack.");
  if (!(borrador.img in FOODIMG)) errores.push("Elige el tipo de plato para la foto.");
  const kcal = Number(borrador.kcalAprox);
  if (!Number.isFinite(kcal) || kcal < 50 || kcal > 2000) errores.push("Indica las kcal aproximadas por ración (entre 50 y 2000).");
  const ingredientes = Array.isArray(borrador.ingredientes) ? borrador.ingredientes : [];
  if (ingredientes.length < 2) errores.push("Añade al menos 2 ingredientes de la despensa.");
  if (ingredientes.some((i) => !INGREDIENTES_WEB.includes(i.nombre))) errores.push("Solo puedes usar ingredientes disponibles en la despensa de la web.");
  if (ingredientes.some((i) => !i.cantidad || !i.cantidad.trim())) errores.push("Indica la cantidad de cada ingrediente.");
  const pasos = (Array.isArray(borrador.pasos) ? borrador.pasos : []).filter((p) => p && p.trim());
  if (pasos.length < 2) errores.push("Describe la elaboración en al menos 2 pasos.");
  return errores;
}
