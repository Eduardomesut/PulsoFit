import { createClient } from "@supabase/supabase-js";

// Las credenciales llegan por variables de entorno (VITE_*).
// La clave "anon" es pública por diseño: la seguridad real la dan las
// políticas RLS de la base de datos, no ocultar esta clave.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Si no hay credenciales, la app funciona igual pero sin login (modo invitado).
export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = isSupabaseConfigured ? createClient(url as string, anon as string) : null;

// URL y clave pública, para llamar a las Edge Functions (Chef IA) con fetch.
export const supabaseUrl = url ?? null;
export const supabaseAnonKey = anon ?? null;
