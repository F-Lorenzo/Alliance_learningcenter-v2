import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

/**
 * Construye la URL pública de una imagen almacenada en R2.
 * Soporta rutas relativas ("thumbnails/x-guard.jpg") y URLs absolutas
 * (las deja pasar tal cual para retrocompatibilidad).
 */
export function getPublicImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path; // ya es URL absoluta
  return `${R2_PUBLIC}/${path}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatMinutes(seconds: number): string {
  return `${Math.ceil(seconds / 60)} min`;
}
