import { describe, it, expect } from "vitest";
import {
  normalizar, youtubeUrl, SEMANA, REPARTO, ALIMENTOS, RECETAS,
  filtrarRecetas, buildDiet, calcularMetricas, migrarDatos,
  resumenCatalogo, resumenUsuario,
} from "./logica";

// Datos completos de un usuario sin ninguna restricción, base de muchos tests.
const datosBase = {
  objetivo: "equilibrio", sexo: "hombre", edad: 30, peso: 80, altura: 180,
  tipoDieta: "omnivora", alergias: [], noGusta: [], comidasDia: 5,
};

describe("calcularMetricas", () => {
  // Hombre 30 años, 80 kg, 180 cm: TMB Mifflin-St Jeor = 1780, TDEE = 2670.
  const hombre = { sexo: "hombre", edad: 30, peso: 80, altura: 180 };

  it("aplica Mifflin-St Jeor para hombre en equilibrio", () => {
    const m = calcularMetricas({ ...hombre, objetivo: "equilibrio" });
    expect(m).toEqual({ kcal: 2670, prot: 144, grasa: 72, carbs: 362 });
  });

  it("aplica Mifflin-St Jeor para mujer (término -161)", () => {
    // TMB = 600 + 1031.25 - 150 - 161 = 1320.25; TDEE = 1980.375 → 1980 kcal.
    const m = calcularMetricas({ sexo: "mujer", edad: 30, peso: 60, altura: 165, objetivo: "equilibrio" });
    expect(m).toEqual({ kcal: 1980, prot: 108, grasa: 54, carbs: 266 });
  });

  it("ajusta las calorías según el objetivo", () => {
    const base = calcularMetricas({ ...hombre, objetivo: "equilibrio" }).kcal;
    expect(calcularMetricas({ ...hombre, objetivo: "perder" }).kcal).toBe(base - 450);
    expect(calcularMetricas({ ...hombre, objetivo: "ganar" }).kcal).toBe(base + 400);
    expect(calcularMetricas({ ...hombre, objetivo: "musculo" }).kcal).toBe(base + 250);
  });

  it("ajusta la proteína por kg según el objetivo", () => {
    expect(calcularMetricas({ ...hombre, objetivo: "musculo" }).prot).toBe(Math.round(80 * 2.2));
    expect(calcularMetricas({ ...hombre, objetivo: "perder" }).prot).toBe(80 * 2);
    expect(calcularMetricas({ ...hombre, objetivo: "ganar" }).prot).toBe(80 * 1.8);
  });

  it("redondea las kcal a múltiplos de 10", () => {
    for (const objetivo of ["perder", "equilibrio", "ganar", "musculo"]) {
      for (const sexo of ["hombre", "mujer"]) {
        const { kcal } = calcularMetricas({ sexo, edad: 47, peso: 73, altura: 171, objetivo });
        expect(kcal % 10).toBe(0);
      }
    }
  });

  it("nunca devuelve carbohidratos negativos", () => {
    // Caso extremo: la proteína y la grasa ya superan las kcal objetivo.
    const m = calcularMetricas({ sexo: "mujer", edad: 90, peso: 100, altura: 140, objetivo: "perder" });
    expect(m.carbs).toBe(0);
  });
});

describe("filtrarRecetas", () => {
  const categorias = ["desayuno", "comida", "cena", "snack"];

  it("sin restricciones devuelve pools no vacíos y de la categoría correcta", () => {
    const pools = filtrarRecetas(datosBase);
    for (const cat of categorias) {
      expect(pools[cat].length).toBeGreaterThanOrEqual(4);
      for (const r of pools[cat]) expect(r.categoria).toBe(cat);
    }
  });

  it("dieta vegana solo deja recetas veganas", () => {
    const pools = filtrarRecetas({ ...datosBase, tipoDieta: "vegana" });
    for (const cat of categorias) {
      for (const r of pools[cat]) expect(r.dietas).toContain("vegana");
    }
  });

  it("dieta vegetariana acepta recetas vegetarianas y veganas", () => {
    const pools = filtrarRecetas({ ...datosBase, tipoDieta: "vegetariana" });
    for (const cat of categorias) {
      for (const r of pools[cat]) {
        expect(r.dietas.includes("vegetariana") || r.dietas.includes("vegana")).toBe(true);
      }
    }
  });

  it("las alergias se excluyen de forma estricta", () => {
    const pools = filtrarRecetas({ ...datosBase, alergias: ["lactosa", "frutosSecos"] });
    for (const cat of categorias) {
      for (const r of pools[cat]) {
        expect(r.alergenos).not.toContain("lactosa");
        expect(r.alergenos).not.toContain("frutosSecos");
      }
    }
  });

  it("la dieta sin gluten / sin lactosa excluye el alérgeno aunque no esté marcado como alergia", () => {
    const sinGluten = filtrarRecetas({ ...datosBase, tipoDieta: "sinGluten" });
    const sinLactosa = filtrarRecetas({ ...datosBase, tipoDieta: "sinLactosa" });
    for (const cat of categorias) {
      for (const r of sinGluten[cat]) expect(r.alergenos).not.toContain("gluten");
      for (const r of sinLactosa[cat]) expect(r.alergenos).not.toContain("lactosa");
    }
  });

  it('respeta los "no me gusta" mientras queden al menos 4 recetas por categoría', () => {
    const pools = filtrarRecetas({ ...datosBase, noGusta: ["pollo"] });
    for (const cat of categorias) {
      expect(pools[cat].length).toBeGreaterThanOrEqual(4);
      for (const r of pools[cat]) expect(r.contiene).not.toContain("pollo");
    }
  });

  it('relaja los "no me gusta" (nunca alergias ni dieta) si una categoría baja de 4 recetas', () => {
    // Con TODOS los alimentos vetados sería imposible cumplir: se relaja y sigue habiendo variedad.
    const pools = filtrarRecetas({ ...datosBase, noGusta: ALIMENTOS.map((a) => a.id) });
    for (const cat of categorias) expect(pools[cat].length).toBeGreaterThanOrEqual(4);
  });

  it("ordena por afinidad con el objetivo sin filtrar ninguna receta", () => {
    const sinObjetivo = filtrarRecetas({ ...datosBase, objetivo: "equilibrio" });
    const pools = filtrarRecetas({ ...datosBase, objetivo: "musculo" });
    for (const cat of ["desayuno", "comida", "cena", "snack"]) {
      // Mismas recetas (solo cambia el orden)…
      expect(pools[cat].map((r) => r.id).sort()).toEqual(sinObjetivo[cat].map((r) => r.id).sort());
      // …y ninguna receta afín aparece después de una no afín.
      const afinidades = pools[cat].map((r) => r.objetivos.includes("musculo"));
      const primeraNoAfin = afinidades.indexOf(false);
      if (primeraNoAfin !== -1) {
        expect(afinidades.slice(primeraNoAfin)).not.toContain(true);
      }
    }
  });
});

describe("buildDiet", () => {
  const kcal = 2500;

  it("genera 7 días con los nombres de la semana", () => {
    const dieta = buildDiet(datosBase, kcal);
    expect(dieta.map((d) => d.dia)).toEqual(SEMANA);
  });

  it("genera tantas comidas al día como pida el usuario", () => {
    for (const n of [3, 4, 5]) {
      const dieta = buildDiet({ ...datosBase, comidasDia: n }, kcal);
      for (const dia of dieta) expect(dia.comidas).toHaveLength(n);
    }
  });

  it("reparte las kcal según los porcentajes de la franja, redondeadas a 10", () => {
    for (const n of [3, 4, 5]) {
      const dieta = buildDiet({ ...datosBase, comidasDia: n }, kcal);
      for (const dia of dieta) {
        dia.comidas.forEach((c, j) => {
          expect(c.kcal).toBe(Math.round((kcal * REPARTO[n][j].pct) / 10) * 10);
        });
        const suma = dia.comidas.reduce((s, c) => s + c.kcal, 0);
        expect(Math.abs(suma - kcal)).toBeLessThanOrEqual(n * 5);
      }
    }
  });

  it("asigna a cada franja una receta de su categoría", () => {
    for (const n of [3, 4, 5]) {
      const dieta = buildDiet({ ...datosBase, comidasDia: n }, kcal);
      for (const dia of dieta) {
        dia.comidas.forEach((c, j) => {
          expect(c.receta.categoria).toBe(REPARTO[n][j].cat);
        });
      }
    }
  });

  it("es determinista: los mismos datos producen el mismo plan", () => {
    expect(buildDiet(datosBase, kcal)).toEqual(buildDiet(datosBase, kcal));
  });

  it("no repite receta en las dos franjas de snack del mismo día (5 comidas)", () => {
    const dieta = buildDiet({ ...datosBase, comidasDia: 5 }, kcal);
    for (const dia of dieta) {
      const snacks = dia.comidas.filter((c) => c.receta.categoria === "snack");
      expect(snacks).toHaveLength(2);
      expect(snacks[0].receta.id).not.toBe(snacks[1].receta.id);
    }
  });

  it("funciona con el pool más restringido (vegana + todas las alergias)", () => {
    const datos = {
      ...datosBase, tipoDieta: "vegana", comidasDia: 5,
      alergias: ["frutosSecos", "marisco", "lactosa", "gluten", "huevo", "pescado", "soja"],
    };
    const dieta = buildDiet(datos, kcal);
    expect(dieta).toHaveLength(7);
    for (const dia of dieta) {
      for (const c of dia.comidas) {
        expect(c.receta).toBeTruthy();
        expect(c.receta.dietas).toContain("vegana");
        expect(c.receta.alergenos).toEqual([]);
      }
    }
  });
});

describe("migrarDatos", () => {
  it("devuelve null si no hay plan guardado", () => {
    expect(migrarDatos(null)).toBeNull();
    expect(migrarDatos(undefined)).toBeNull();
  });

  it("traduce los objetivos del formato antiguo (app de fitness)", () => {
    const casos = { perder: "perder", ganar: "musculo", ambos: "equilibrio", resistencia: "equilibrio" };
    for (const [antiguo, nuevo] of Object.entries(casos)) {
      expect(migrarDatos({ objetivo: antiguo, nivel: "medio", dias: 4 }).objetivo).toBe(nuevo);
    }
  });

  it("elimina los campos de fitness (nivel, dias) y rellena los nuevos con valores por defecto", () => {
    const m = migrarDatos({ objetivo: "ganar", nivel: "avanzado", dias: 5 });
    expect(m).not.toHaveProperty("nivel");
    expect(m).not.toHaveProperty("dias");
    expect(m.tipoDieta).toBe("omnivora");
    expect(m.alergias).toEqual([]);
    expect(m.noGusta).toEqual([]);
    expect(m.comidasDia).toBe(5);
    expect(m.edad).toBe(28);
  });

  it("anula el objetivo si no es reconocible (desactiva el 'retomar plan')", () => {
    expect(migrarDatos({ objetivo: "volar" }).objetivo).toBeNull();
    expect(migrarDatos({ objetivo: "fuerza", nivel: "medio" }).objetivo).toBeNull();
  });

  it("conserva intactos los datos ya migrados", () => {
    const actual = {
      objetivo: "perder", sexo: "mujer", edad: 45, peso: 60, altura: 165,
      tipoDieta: "vegana", alergias: ["gluten"], noGusta: ["pollo"], comidasDia: 3,
    };
    expect(migrarDatos(actual)).toEqual(actual);
  });

  it("sanea valores corruptos o desconocidos", () => {
    const m = migrarDatos({ objetivo: "perder", tipoDieta: "keto", alergias: "gluten", noGusta: null, comidasDia: 7 });
    expect(m.tipoDieta).toBe("omnivora");
    expect(m.alergias).toEqual([]);
    expect(m.noGusta).toEqual([]);
    expect(m.comidasDia).toBe(5);
  });
});

describe("helpers", () => {
  it("normalizar quita tildes y pasa a minúsculas", () => {
    expect(normalizar("Sándwich")).toBe("sandwich");
    expect(normalizar("PLÁTANO")).toBe("platano");
    expect(normalizar("café con leche")).toBe("cafe con leche");
  });

  it("youtubeUrl busca la receta por nombre", () => {
    expect(youtubeUrl("Tortilla de patatas")).toBe(
      `https://www.youtube.com/results?search_query=${encodeURIComponent("Tortilla de patatas receta")}`,
    );
  });

  it("resumenCatalogo incluye todas las recetas en formato compacto", () => {
    const resumen = resumenCatalogo();
    for (const r of RECETAS) expect(resumen).toContain(r.nombre);
    // Sin ingredientes ni pasos: debe ser barato en tokens.
    expect(resumen.length).toBeLessThan(8000);
    expect(resumen).not.toContain("Calienta"); // ningún paso de elaboración
  });

  it("resumenUsuario refleja dieta, objetivo y restricciones", () => {
    const r = resumenUsuario({ objetivo: "perder", tipoDieta: "vegana", alergias: ["gluten"], noGusta: ["pollo"], comidasDia: 3 });
    expect(r).toContain("Vegana");
    expect(r).toContain("Perder peso");
    expect(r).toContain("Gluten");
    expect(r).toContain("Pollo / pavo");
    expect(r).toContain("3 comidas");
    // La dieta omnívora no aporta información: no se menciona.
    expect(resumenUsuario({ tipoDieta: "omnivora", alergias: [], noGusta: [] })).toBe("");
    expect(resumenUsuario(null)).toBe("");
  });

  it("los porcentajes de cada REPARTO suman 1 y las categorías son válidas", () => {
    for (const n of [3, 4, 5]) {
      expect(REPARTO[n]).toHaveLength(n);
      const suma = REPARTO[n].reduce((s, f) => s + f.pct, 0);
      expect(suma).toBeCloseTo(1, 10);
      for (const f of REPARTO[n]) {
        expect(["desayuno", "comida", "cena", "snack"]).toContain(f.cat);
      }
    }
  });
});
