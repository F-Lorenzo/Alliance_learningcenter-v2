import type { Course, Category } from "@/types";

export const MOCK_CATEGORIES: Category[] = [
  { id: "1", name: "Guardia", slug: "guardia", sort_order: 1, course_count: 8 },
  { id: "2", name: "Pasajes", slug: "pasajes", sort_order: 2, course_count: 6 },
  { id: "3", name: "Escapes", slug: "escapes", sort_order: 3, course_count: 5 },
  { id: "4", name: "Espalda", slug: "espalda", sort_order: 4, course_count: 4 },
  { id: "5", name: "Controles", slug: "controles", sort_order: 5, course_count: 7 },
  { id: "6", name: "Derribos", slug: "derribos", sort_order: 6, course_count: 3 },
  { id: "7", name: "Fundamentos", slug: "fundamentos", sort_order: 7, course_count: 6 },
  { id: "8", name: "Defensa personal", slug: "defensa-personal", sort_order: 8, course_count: 2 },
];

export const MOCK_FREE_COURSES: Course[] = [
  {
    id: "1", slug: "guardia-aranha", title: "Guardia Aranha — Fundamentos",
    description: "Los conceptos básicos de la guardia aranha con Marcelo Garcia.",
    total_duration: 1800, is_free: true, is_published: true, is_new: true,
    categories: ["Guardia"], lessons: Array(6).fill(null), created_at: "2026-04-01",
  },
  {
    id: "2", slug: "half-guard-system", title: "Sistema de Media Guardia",
    description: "El sistema completo de media guardia de Bernardo Faria.",
    total_duration: 2520, is_free: true, is_published: true, is_featured: true,
    categories: ["Guardia"], lessons: Array(8).fill(null), created_at: "2026-03-15",
  },
  {
    id: "3", slug: "back-takes-system", title: "Sistema de Toma de Espalda",
    description: "Cómo sacar la espalda desde cualquier posición.",
    total_duration: 1560, is_free: true, is_published: true,
    categories: ["Espalda"], lessons: Array(5).fill(null), created_at: "2026-02-20",
  },
];

export const MOCK_ALL_COURSES: Course[] = [
  ...MOCK_FREE_COURSES,
  {
    id: "4", slug: "x-guard-system", title: "Sistema X-Guard",
    total_duration: 3000, is_free: false, is_published: true, is_new: true,
    categories: ["Guardia"], lessons: Array(10).fill(null), created_at: "2026-04-10",
  },
  {
    id: "5", slug: "deep-half-guard", title: "Deep Half Guard",
    total_duration: 2100, is_free: false, is_published: true,
    categories: ["Guardia"], lessons: Array(7).fill(null), created_at: "2026-03-20",
  },
  {
    id: "6", slug: "leg-drag-passing", title: "Leg Drag — Pasaje de Guardia",
    total_duration: 1680, is_free: false, is_published: true,
    categories: ["Pasajes"], lessons: Array(6).fill(null), created_at: "2026-03-05",
  },
  {
    id: "7", slug: "knee-slice-passing", title: "Knee Slice — Sistema Completo",
    total_duration: 1440, is_free: false, is_published: true,
    categories: ["Pasajes"], lessons: Array(5).fill(null), created_at: "2026-02-15",
  },
  {
    id: "8", slug: "rear-naked-choke-system", title: "Sistema de Estrangulación desde Espalda",
    total_duration: 2400, is_free: false, is_published: true, is_featured: true,
    categories: ["Espalda"], lessons: Array(8).fill(null), created_at: "2026-02-01",
  },
  {
    id: "9", slug: "upa-escape", title: "Escape UPA — Desde Montada",
    total_duration: 900, is_free: false, is_published: true,
    categories: ["Escapes"], lessons: Array(3).fill(null), created_at: "2026-01-20",
  },
  {
    id: "10", slug: "side-control-escapes", title: "Escapes desde Control Lateral",
    total_duration: 1320, is_free: false, is_published: true,
    categories: ["Escapes"], lessons: Array(4).fill(null), created_at: "2026-01-10",
  },
  {
    id: "11", slug: "mount-control-system", title: "Sistema de Control en Montada",
    total_duration: 1800, is_free: false, is_published: true,
    categories: ["Controles"], lessons: Array(6).fill(null), created_at: "2025-12-15",
  },
  {
    id: "12", slug: "double-leg-takedown", title: "Double Leg — Sistema completo",
    total_duration: 1200, is_free: false, is_published: true,
    categories: ["Derribos"], lessons: Array(4).fill(null), created_at: "2025-12-01",
  },
];

export const MOCK_TESTIMONIALS = [
  {
    id: "1",
    quote: "Desde que empecé con Alliance Learning Center mejoré muchísimo mi guardia. Las explicaciones son claras y puedo volver a ver cada técnica cuantas veces quiero.",
    name: "Martín R.",
    detail: "Alumno hace 2 años",
  },
  {
    id: "2",
    quote: "El contenido es de un nivel increíble. Aprender de los mismos profesores que entrenan los campeones mundiales desde mi casa es algo que no imaginaba posible.",
    name: "Carolina S.",
    detail: "Alumna hace 1 año",
  },
  {
    id: "3",
    quote: "Lo que más valoro es el orden del contenido. Podés seguir una ruta clara desde principiante y ver cómo mejorás semana a semana en el tatami.",
    name: "Diego M.",
    detail: "Alumno hace 6 meses",
  },
];
