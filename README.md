# PULSO

**Web de nutrición personalizada** con estilo editorial cinematográfico (inspiración Tesla / Nike). Dile a la app tu objetivo, tus gustos y tus alergias y en segundos genera tu **semana de comidas completa**, con cada receta ilustrada, sus ingredientes y su modo de elaboración paso a paso.

> Aplicación para gestión de alimentación y salud personalizada.

## Características

- **4 objetivos**: perder peso, comer equilibrado, ganar peso y ganar músculo.
- **Cálculo de calorías y macros** (fórmula Mifflin-St Jeor) según sexo, edad, peso, altura y objetivo.
- **Preferencias alimentarias**: tipo de dieta (omnívora, vegetariana, vegana, sin gluten, sin lactosa), alimentos que no te gustan y alergias e intolerancias (exclusión estricta).
- **3, 4 o 5 comidas al día** con reparto calórico por franja.
- **50 recetas** con foto, ingredientes con cantidades y modo de elaboración paso a paso.
- **Dieta semanal** de 7 días adaptada a tus preferencias, exportable a PDF con recetario incluido.
- Interfaz oscura, animaciones y diseño responsive.

## Stack

- [React 18](https://react.dev/)
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Puesta en marcha

Requisitos: [Node.js](https://nodejs.org/) 18 o superior.

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Compilar para producción
npm run build

# Previsualizar la build de producción
npm run preview
```

## Estructura

```
pulsofit/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx        # Punto de entrada
    ├── PulsoFit.tsx    # Aplicación completa
    └── index.css       # Reset de estilos
```

## Aviso

Las cantidades y planes son **orientativos** y con fines informativos. No sustituyen el consejo de un médico o dietista.
