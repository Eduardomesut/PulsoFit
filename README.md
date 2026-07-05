# PULSO

**Web de entrenamiento y nutrición** con estilo editorial cinematográfico (inspiración Tesla / Nike). Dile a la app tu objetivo, edad y peso y en segundos genera tu **dieta semanal completa** y tus **entrenamientos personalizados**, con cada ejercicio ilustrado y explicado paso a paso.

> Aplicación para gestión de entreno y salud personalizada.

## Características

- **4 objetivos**: perder peso, ganar músculo, recomposición y resistencia.
- **Cálculo de calorías y macros** (fórmula Mifflin-St Jeor) según sexo, edad, peso, altura y objetivo.
- **Entrenamientos a medida**: 2 o 3 días por semana, con series, repeticiones y descansos ajustados a tu nivel (principiante / intermedio / avanzado).
- **16 ejercicios** con foto y guía paso a paso.
- **Dieta semanal** de 7 días con 5 comidas diarias.
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
