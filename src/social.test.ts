import { describe, it, expect } from "vitest";
import {
  normalizarUsuario, validarUsuario, MENSAJE_SOLICITUD, recetaSnapshot, FOODIMG,
} from "./logica";

/* Lógica pura de la Fase 3 (amigos y chat): normalización y validación del
   @usuario público, los mensajes de la RPC enviar_solicitud y la instantánea
   de receta que se comparte por chat. Las políticas RLS y las RPC de
   supabase/schema.sql imponen las mismas reglas en el servidor. */

describe("normalizarUsuario", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(normalizarUsuario("EDuArdo")).toBe("eduardo");
    expect(normalizarUsuario("Núñez")).toBe("nunez");
  });
  it("elimina espacios y caracteres no permitidos", () => {
    expect(normalizarUsuario("chef pulso!")).toBe("chefpulso");
    expect(normalizarUsuario("a-b.c@d")).toBe("abcd");
  });
  it("conserva números y guion bajo", () => {
    expect(normalizarUsuario("chef_99")).toBe("chef_99");
  });
  it("tolera entradas vacías o nulas", () => {
    expect(normalizarUsuario("")).toBe("");
    expect(normalizarUsuario(null)).toBe("");
    expect(normalizarUsuario(undefined)).toBe("");
  });
});

describe("validarUsuario", () => {
  it("acepta un handle correcto", () => {
    expect(validarUsuario("chef_pulso")).toBeNull();
    expect(validarUsuario("abc")).toBeNull();
    expect(validarUsuario("a1b2c3d4e5f6g7h8i9j0")).toBeNull(); // 20 caracteres
  });
  it("rechaza por longitud", () => {
    expect(validarUsuario("ab")).toMatch(/al menos 3/);
    expect(validarUsuario("a".repeat(21))).toMatch(/20/);
  });
  it("rechaza caracteres inválidos", () => {
    expect(validarUsuario("Chef")).toMatch(/minúsculas/);
    expect(validarUsuario("chef pulso")).toMatch(/minúsculas/);
    expect(validarUsuario("chef-pulso")).toMatch(/minúsculas/);
  });
});

describe("MENSAJE_SOLICITUD", () => {
  it("cubre todos los códigos que devuelve la RPC", () => {
    for (const codigo of ["enviada", "aceptada", "ya_amigos", "ya_pendiente", "no_existe", "uno_mismo", "error"]) {
      expect(typeof MENSAJE_SOLICITUD[codigo]).toBe("string");
      expect(MENSAJE_SOLICITUD[codigo].length).toBeGreaterThan(0);
    }
  });
});

describe("recetaSnapshot", () => {
  const base = {
    id: "des1", nombre: "Avena con frutos rojos", img: "avena", kcal: 350,
    ingredientes: [{ nombre: "Avena", cantidad: "60 g" }],
    pasos: ["Mezclar", "Servir"],
  };
  it("copia los campos esenciales de la ficha", () => {
    const s = recetaSnapshot(base);
    expect(s).toMatchObject({ id: "des1", nombre: "Avena con frutos rojos", img: "avena", kcal: 350 });
    expect(s?.ingredientes).toHaveLength(1);
    expect(s?.pasos).toHaveLength(2);
  });
  it("cae a la imagen 'otro' si la clave no está en FOODIMG", () => {
    expect(recetaSnapshot({ ...base, img: "inexistente" })?.img).toBe("otro");
    expect("otro" in FOODIMG).toBe(true);
  });
  it("acepta kcalAprox como alias de kcal y arrays ausentes", () => {
    const s = recetaSnapshot({ nombre: "X", kcalAprox: 200 });
    expect(s?.kcal).toBe(200);
    expect(s?.ingredientes).toEqual([]);
    expect(s?.pasos).toEqual([]);
  });
  it("devuelve null sin receta o sin nombre", () => {
    expect(recetaSnapshot(null)).toBeNull();
    expect(recetaSnapshot({ img: "avena" })).toBeNull();
  });
});
