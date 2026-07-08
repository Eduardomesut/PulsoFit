import { describe, it, expect } from "vitest";
import {
  RECETAS, RECETAS_CINE, RECETAS_ACTUALIDAD, FOODIMG, TIPOS_DIETA, ALERGENOS, ALIMENTOS, OBJETIVOS,
  filtrarRecetas,
} from "./logica";

/* Invariantes del catálogo de recetas. La regla de autoría (ver CLAUDE.md)
   garantiza que filtrarRecetas nunca deja una categoría vacía; hasta ahora
   solo estaba escrita como convención — aquí se comprueba en cada build. */

const CATEGORIAS = ["desayuno", "comida", "cena", "snack"];
const IDS_ALERGENOS = ALERGENOS.map((a) => a.id);
const IDS_ALIMENTOS = ALIMENTOS.map((a) => a.id);
const IDS_OBJETIVOS = OBJETIVOS.map((o) => o.id);

describe("catálogo RECETAS", () => {
  it("los ids son únicos (también frente a cine y actualidad)", () => {
    const ids = [...RECETAS, ...RECETAS_CINE, ...RECETAS_ACTUALIDAD].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada receta referencia una imagen existente en FOODIMG", () => {
    for (const r of [...RECETAS, ...RECETAS_CINE, ...RECETAS_ACTUALIDAD]) {
      expect(FOODIMG, `receta ${r.id}`).toHaveProperty(r.img);
    }
  });

  it("cada receta está completa y usa vocabularios conocidos", () => {
    for (const r of RECETAS) {
      expect(CATEGORIAS, `categoria de ${r.id}`).toContain(r.categoria);
      expect(r.nombre.length).toBeGreaterThan(0);
      expect(r.kcalAprox).toBeGreaterThan(0);
      expect(r.ingredientes.length).toBeGreaterThan(0);
      expect(r.pasos.length).toBeGreaterThan(0);
      for (const ing of r.ingredientes) {
        expect(ing.nombre.length, `ingrediente de ${r.id}`).toBeGreaterThan(0);
        expect(ing.cantidad.length, `cantidad en ${r.id}`).toBeGreaterThan(0);
      }
      // Un valor fuera de vocabulario (una errata) haría que la receta dejara
      // de casar con los filtros sin dar ningún error: se detecta aquí.
      for (const d of r.dietas) expect(["vegana", "vegetariana"], `dieta de ${r.id}`).toContain(d);
      for (const a of r.alergenos) expect(IDS_ALERGENOS, `alérgeno de ${r.id}`).toContain(a);
      for (const c of r.contiene) expect(IDS_ALIMENTOS, `contiene de ${r.id}`).toContain(c);
      for (const o of r.objetivos) expect(IDS_OBJETIVOS, `objetivo de ${r.id}`).toContain(o);
    }
  });

  it("cumple la regla de autoría: ≥5 veganas, ≥5 sin gluten, ≥5 sin lactosa y ≥4 seguras por categoría", () => {
    for (const cat of CATEGORIAS) {
      const pool = RECETAS.filter((r) => r.categoria === cat);
      const veganas = pool.filter((r) => r.dietas.includes("vegana"));
      const sinGluten = pool.filter((r) => !r.alergenos.includes("gluten"));
      const sinLactosa = pool.filter((r) => !r.alergenos.includes("lactosa"));
      const seguras = pool.filter((r) => r.dietas.includes("vegana") && r.alergenos.length === 0);
      expect(veganas.length, `veganas en ${cat}`).toBeGreaterThanOrEqual(5);
      expect(sinGluten.length, `sin gluten en ${cat}`).toBeGreaterThanOrEqual(5);
      expect(sinLactosa.length, `sin lactosa en ${cat}`).toBeGreaterThanOrEqual(5);
      expect(seguras.length, `seguras en ${cat}`).toBeGreaterThanOrEqual(4);
    }
  });

  it("ninguna combinación de dieta y alergias deja una categoría por debajo de 4 recetas", () => {
    const datosBase = { objetivo: "equilibrio", tipoDieta: "omnivora", alergias: [], noGusta: [], comidasDia: 5 };
    const combinaciones: { tipoDieta: string; alergias: string[] }[] = [];
    for (const dieta of TIPOS_DIETA) {
      combinaciones.push({ tipoDieta: dieta.id, alergias: [] });
      for (const alergia of ALERGENOS) combinaciones.push({ tipoDieta: dieta.id, alergias: [alergia.id] });
      // Peor caso: esta dieta con TODAS las alergias a la vez.
      combinaciones.push({ tipoDieta: dieta.id, alergias: IDS_ALERGENOS });
    }
    for (const combo of combinaciones) {
      const pools = filtrarRecetas({ ...datosBase, ...combo });
      for (const cat of CATEGORIAS) {
        expect(pools[cat].length, `${combo.tipoDieta} + [${combo.alergias}] en ${cat}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe("catálogo RECETAS_CINE", () => {
  it("cada ficha de cine está completa", () => {
    for (const r of RECETAS_CINE) {
      expect(["serie", "peli"], `tipo de ${r.id}`).toContain(r.tipo);
      expect(r.obra.length).toBeGreaterThan(0);
      expect(r.plato.length).toBeGreaterThan(0);
      expect(r.escena.length).toBeGreaterThan(0);
      expect(r.ingredientes.length).toBeGreaterThan(0);
      expect(r.pasos.length).toBeGreaterThan(0);
    }
  });
});

describe("catálogo RECETAS_ACTUALIDAD", () => {
  it("cada ficha de actualidad está completa y bien formada", () => {
    const TEMAS = ["deporte", "cultura", "efemeride", "mundo"];
    for (const r of RECETAS_ACTUALIDAD) {
      expect(TEMAS, `tema de ${r.id}`).toContain(r.categoria);
      expect(r.titular.length, `titular de ${r.id}`).toBeGreaterThan(0);
      expect(r.plato.length, `plato de ${r.id}`).toBeGreaterThan(0);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r.fecha), `fecha de ${r.id}`).toBe(true);
      expect(r.ingredientes.length, `ingredientes de ${r.id}`).toBeGreaterThan(0);
      expect(r.pasos.length, `pasos de ${r.id}`).toBeGreaterThan(0);
    }
  });
});
