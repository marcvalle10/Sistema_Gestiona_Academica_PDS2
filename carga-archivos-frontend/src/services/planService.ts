import { supabase } from "@/lib/supabase";
import { PlanRecord } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  async function safeJson<T>(resp: Response): Promise<T> {
  const data = (await resp.json()) as unknown;
  return data as T;
}

// === RAW TYPES QUE VIENEN DE SUPABASE ===

type PlanRow = {
  id: number;
  nombre: string;
  version: string;
  total_creditos: number | null;
  semestres_sugeridos: number | null;
};

type MateriaRow = {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  tipo: string | null;
  plan_estudio_id: number;
  // Supabase puede devolver la relación como objeto O como arreglo de objetos
  plan?: PlanRow | PlanRow[] | null;
};


// === MAPEO A PlanRecord PARA LA UI ===

function mapMateriaToPlanRecord(row: MateriaRow): PlanRecord {
  // Normalizar: si viene como arreglo, nos quedamos con el primero
  const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan ?? null;

  return {
    id: row.id,
    codigo: row.codigo,
    nombre_materia: row.nombre,
    creditos: row.creditos,
    tipo: row.tipo ?? "OBLIGATORIA",

    plan_id: row.plan_estudio_id,
    plan_nombre: plan?.nombre ?? "Sin plan",
    plan_version: plan?.version ?? "N/A",
    plan_total_creditos: plan?.total_creditos ?? null,
    plan_semestres_sugeridos: plan?.semestres_sugeridos ?? null,
  };
}


export async function getPlanHistorial(
  limit = 50
): Promise<PlanHistorialItem[]> {
  const url = new URL(`${API_BASE}/plan/historial`);
  url.searchParams.set("limit", String(limit));

  const resp = await fetch(url.toString(), {
    method: "GET",
  });

  if (!resp.ok) {
    throw new Error("Error al obtener historial de plan de estudios");
  }

  const json = await safeJson<PlanHistorialResponse>(resp);

  return Array.isArray(json.items) ? json.items : [];
}


export interface PlanHistorialItem {
  id: number;
  fecha: string;          // ISO string
  nombre_archivo: string;
  estado: string;
}

type PlanHistorialResponse = {
  ok?: boolean;
  items?: PlanHistorialItem[];
};



// === CATÁLOGO DE PLANES ===

export interface PlanOption {
  id: number;
  label: string; // "Nombre (versión)"
}

export async function getPlanesCatalog(): Promise<PlanOption[]> {
  const { data, error } = await supabase
    .from("plan_estudio")
    .select("id, nombre, version")
    .order("nombre");

  if (error) {
    console.error("Error al obtener planes:", error);
    throw error;
  }

  const rows = (data ?? []) as { id: number; nombre: string; version: string }[];

  return rows.map((p) => ({
    id: p.id,
    label: `${p.nombre} (v${p.version})`,
  }));
}

// === LISTADO DE MATERIAS POR PLAN ===

export async function getPlanMaterias(): Promise<PlanRecord[]> {
  const { data, error } = await supabase
    .from("materia")
    .select(
      `
      id,
      codigo,
      nombre,
      creditos,
      tipo,
      plan_estudio_id,
      plan:plan_estudio (
        id,
        nombre,
        version,
        total_creditos,
        semestres_sugeridos
      )
    `
    )
    .order("codigo");

  if (error) {
    console.error("Error al obtener materias de plan:", error);
    throw error;
  }

  const rows = (data ?? []) as MateriaRow[];
  return rows.map(mapMateriaToPlanRecord);
}

// === CREAR / EDITAR / ELIMINAR MATERIA ===

export interface PlanMateriaFormData {
  codigo: string;
  nombre_materia: string;
  creditos: number;
  tipo: string;
  plan_id: number;
}

function mapFormToMateriaPayload(form: PlanMateriaFormData) {
  return {
    codigo: form.codigo,
    nombre: form.nombre_materia,
    creditos: form.creditos,
    tipo: form.tipo,
    plan_estudio_id: form.plan_id,
  };
}

export async function createPlanMateria(
  form: PlanMateriaFormData
): Promise<PlanRecord> {
  const payload = mapFormToMateriaPayload(form);

  const { data, error } = await supabase
    .from("materia")
    .insert([payload])
    .select(
      `
      id,
      codigo,
      nombre,
      creditos,
      tipo,
      plan_estudio_id,
      plan:plan_estudio (
        id,
        nombre,
        version,
        total_creditos,
        semestres_sugeridos
      )
    `
    )
    .single();

  if (error) {
    console.error("Error al crear materia de plan:", error);
    throw error;
  }

  return mapMateriaToPlanRecord(data as MateriaRow);
}

export async function updatePlanMateria(
  id: number,
  form: PlanMateriaFormData
): Promise<PlanRecord> {
  const payload = mapFormToMateriaPayload(form);

  const { data, error } = await supabase
    .from("materia")
    .update(payload)
    .eq("id", id)
    .select(
      `
      id,
      codigo,
      nombre,
      creditos,
      tipo,
      plan_estudio_id,
      plan:plan_estudio (
        id,
        nombre,
        version,
        total_creditos,
        semestres_sugeridos
      )
    `
    )
    .single();

  if (error) {
    console.error("Error al actualizar materia de plan:", error);
    throw error;
  }

  return mapMateriaToPlanRecord(data as MateriaRow);
}

export async function deletePlanMateria(id: number): Promise<void> {
  const { error } = await supabase.from("materia").delete().eq("id", id);

  if (error) {
    console.error("Error al eliminar materia de plan:", error);
    throw error;
  }
}

// === INGESTA DESDE PDF (/plan/upload) ===

export interface PlanUploadIngesta {
  planId: number;
  materiasInput: number;
  added: number;
  updated: number;
  unchanged: number;
  warnings: string[];
  action: string;
}

export interface PlanUploadParsedPlan {
  nombre?: string;
  version?: string;
  total_creditos?: number;
  semestres_sugeridos?: number;
}

export interface PlanUploadParsed {
  ok: boolean;
  origen?: string;
  plan?: PlanUploadParsedPlan;
  materias?: {
    codigo: string;
    nombre: string;
    creditos: number;
    tipo?: string | null;
  }[];
  warnings?: string[];
}

export interface PlanUploadResponse {
  ok: boolean;
  action: string;
  archivoId: number;
  parsed?: PlanUploadParsed;
  ingesta?: PlanUploadIngesta;
}

export async function uploadPlanPdf(
  file: File,
  opts?: { force?: boolean; debug?: boolean; ocr?: boolean }
): Promise<PlanUploadResponse> {
  const form = new FormData();
  form.append("pdf", file); // nombre de campo según planMiddleware

  const params = new URLSearchParams();
  if (opts?.force) params.append("force", "1");
  if (opts?.debug) params.append("debug", "1");
  if (opts?.ocr) params.append("ocr", "1");

  const url = `${API_BASE}/plan/upload${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const resp = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Error al subir plan (${resp.status}): ${text || resp.statusText}`
    );
  }

  const json = (await resp.json()) as PlanUploadResponse;
  return json;
}
