import { describe, it, expect } from "vitest";
import {
  RECETAS, INGREDIENTES_WEB, CATEGORIAS_RECETA, ADMIN_EMAIL,
  validarRecetaComunidad, puedeBorrarReceta,
} from "./logica";

/* Lógica de las recetas de la comunidad: la despensa de ingredientes,
   la validación del borrador antes de publicar y quién puede borrar qué.
   Las políticas RLS de supabase/schema.sql imponen lo mismo en el servidor. */

// Borrador correcto, base de los tests de validación (los ingredientes
// tienen que existir en la despensa, así que se cogen de ella).
const borradorValido = {
  nombre: "Bol de prueba",
  categoria: "comida",
  img: "arroz",
  kcalAprox: 450,
  ingredientes: [
    { nombre: INGREDIENTES_WEB[0], cantidad: "150 g" },
    { nombre: INGREDIENTES_WEB[1], cantidad: "1 unidad" },
  ],
  pasos: ["Prepara los ingredientes.", "Mézclalo todo y sirve."],
};

describe("INGREDIENTES_WEB (la despensa)", () => {
  it("contiene todos los ingredientes del catálogo, sin duplicados y ordenados", () => {
    expect(new Set(INGREDIENTES_WEB).size).toBe(INGREDIENTES_WEB.length);
    for (const r of RECETAS) {
      for (const ing of r.ingredientes) expect(INGREDIENTES_WEB).toContain(ing.nombre);
    }
    const reordenada = [...INGREDIENTES_WEB].sort((a, b) => a.localeCompare(b, "es"));
    expect(INGREDIENTES_WEB).toEqual(reordenada);
  });
});

describe("validarRecetaComunidad", () => {
  it("acepta un borrador completo", () => {
    expect(validarRecetaComunidad(borradorValido)).toEqual([]);
  });

  it("rechaza un borrador vacío o sin forma de receta", () => {
    expect(validarRecetaComunidad(null).length).toBeGreaterThan(0);
    expect(validarRecetaComunidad(undefined).length).toBeGreaterThan(0);
  });

  it("exige nombre, categoría válida, tipo de foto y kcal razonables", () => {
    expect(validarRecetaComunidad({ ...borradorValido, nombre: "ab" })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, categoria: "brunch" })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, img: "sushi" })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, kcalAprox: 20 })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, kcalAprox: 5000 })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, kcalAprox: NaN })).toHaveLength(1);
  });

  it("exige al menos 2 ingredientes, todos de la despensa y con cantidad", () => {
    expect(validarRecetaComunidad({ ...borradorValido, ingredientes: [borradorValido.ingredientes[0]] })).toHaveLength(1);
    const fueraDeDespensa = { ...borradorValido, ingredientes: [...borradorValido.ingredientes, { nombre: "Trufa blanca de Alba", cantidad: "10 g" }] };
    expect(validarRecetaComunidad(fueraDeDespensa)).toHaveLength(1);
    const sinCantidad = { ...borradorValido, ingredientes: [borradorValido.ingredientes[0], { nombre: INGREDIENTES_WEB[2], cantidad: "  " }] };
    expect(validarRecetaComunidad(sinCantidad)).toHaveLength(1);
  });

  it("exige al menos 2 pasos con contenido", () => {
    expect(validarRecetaComunidad({ ...borradorValido, pasos: ["Solo uno."] })).toHaveLength(1);
    expect(validarRecetaComunidad({ ...borradorValido, pasos: ["Uno.", "   "] })).toHaveLength(1);
  });

  it("acumula todos los problemas a la vez", () => {
    const errores = validarRecetaComunidad({ nombre: "", categoria: "x", img: "x", kcalAprox: 0, ingredientes: [], pasos: [] });
    expect(errores.length).toBeGreaterThanOrEqual(5);
  });

  it("las categorías publicables son las del plan", () => {
    expect(CATEGORIAS_RECETA).toEqual(["desayuno", "comida", "cena", "snack"]);
    for (const categoria of CATEGORIAS_RECETA) {
      expect(validarRecetaComunidad({ ...borradorValido, categoria })).toEqual([]);
    }
  });
});

describe("puedeBorrarReceta", () => {
  const receta = { id: "abc", user_id: "u1", nombre: "Bol de prueba" };
  const autor = { id: "u1", email: "autor@ejemplo.com" };
  const otro = { id: "u2", email: "otro@ejemplo.com" };
  const admin = { id: "u3", email: ADMIN_EMAIL };

  it("el autor puede borrar su propia receta", () => {
    expect(puedeBorrarReceta(autor, receta)).toBe(true);
  });

  it("el administrador puede borrar recetas de cualquier usuario", () => {
    expect(puedeBorrarReceta(admin, receta)).toBe(true);
  });

  it("otro usuario no puede borrar recetas ajenas", () => {
    expect(puedeBorrarReceta(otro, receta)).toBe(false);
  });

  it("sin sesión no se puede borrar nada", () => {
    expect(puedeBorrarReceta(null, receta)).toBe(false);
  });

  it("las recetas del catálogo fijo (sin user_id) no las borra nadie, ni el admin", () => {
    expect(puedeBorrarReceta(admin, { id: "gachasArroz" })).toBe(false);
  });
});
