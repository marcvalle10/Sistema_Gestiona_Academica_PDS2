import { ScheduleRecord } from "@/types";

export interface ScheduleFilters {
  periodo?: string;
}

// Coincide con la vista vista_horarios_grupos
type RawScheduleRow = {
  id: number; 
  periodo: string;
  codigo_materia: string;
  nombre_materia: string;
  grupo: string;
  dia_semana: number;
  hora_inicio: string; // HH:MM:SS
  hora_fin: string;    // HH:MM:SS
  aula: string;
  num_empleado: number | null;
  profesor_nombre: string | null;
  profesor_apellido_paterno: string | null;
  profesor_apellido_materno: string | null;
  cupo: number | null;
};

// IMPORTANTE: aquí NO metemos `/api`
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * GET /horarios/resumen
 *
 * Soporta varios formatos de respuesta:
 *  - [ { ... } ]
 *  - { items: [ { ... } ] }
 *  - { data: { items: [ { ... } ] } }
 */
export async function getHorarios(
  filters: ScheduleFilters = {}
): Promise<ScheduleRecord[]> {
  const params = new URLSearchParams();

  if (filters.periodo) {
    params.append("periodo", filters.periodo);
  }

  const url = `${API_BASE}/horarios/resumen${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error al obtener resumen de horarios (${res.status})`);
  }

  const json: unknown = await res.json();

  let raw: RawScheduleRow[] = [];

  if (Array.isArray(json)) {
    raw = json as RawScheduleRow[];
  } else if (Array.isArray((json as { items?: RawScheduleRow[] }).items)) {
    raw = (json as { items?: RawScheduleRow[] }).items ?? [];
  } else if (
    Array.isArray(
      (json as { data?: { items?: RawScheduleRow[] } }).data?.items
    )
  ) {
    raw =
      (json as { data?: { items?: RawScheduleRow[] } }).data?.items ?? [];
  }

  // Adaptamos el row crudo de la vista a tu ScheduleRecord
  return raw.map(
    (row): ScheduleRecord => ({
      id: row.id,
      periodo: row.periodo,
      codigo_materia: row.codigo_materia,
      nombre_materia: row.nombre_materia,
      grupo: row.grupo,
      dia_semana: row.dia_semana,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      aula: row.aula,
      // OJO: aquí respetamos el tipo number | null, nada de undefined
      num_empleado: row.num_empleado,
      profesor_nombre: row.profesor_nombre,
      profesor_apellido_paterno: row.profesor_apellido_paterno,
      profesor_apellido_materno: row.profesor_apellido_materno,
      cupo: row.cupo,
    })
  );
}

/**
 * POST /horarios
 * Crea un nuevo registro de horario.
 */
export async function createHorario(
  data: Partial<ScheduleRecord>
): Promise<ScheduleRecord> {
  const res = await fetch(`${API_BASE}/horarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error al crear horario (${res.status}): ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as ScheduleRecord;
  return json;
}

/**
 * PUT /horarios/:id
 * Actualiza un horario existente.
 */
export async function updateHorario(
  id: number,
  data: Partial<ScheduleRecord>
): Promise<ScheduleRecord> {
  const res = await fetch(`${API_BASE}/horarios/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error al actualizar horario (${res.status}): ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as ScheduleRecord;
  return json;
}

/**
 * DELETE /horarios/:id
 * Elimina un horario.
 */
export async function deleteHorario(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/horarios/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error al eliminar horario (${res.status}): ${text || res.statusText}`
    );
  }
}
