// src/services/estructuraService.ts

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface EstructuraResumen {
  alumnosUpsert: number;
  planesUpsert: number;
  warnings: string[];
}

type UploadEstructuraResponse = {
  ok?: boolean;
  archivoId?: number;
  estado_proceso?: string;
  error?: string;
};

type ProcesarEstructuraResponse = {
  ok?: boolean;
  resumen?: EstructuraResumen;
  error?: string;
};

/**
 * 1) Sube el Excel de estructura
 *    -> POST /estructura/upload
 *    <- { ok: true, archivoId, estado_proceso }
 */
export async function uploadEstructura(file: File): Promise<number> {
  const formData = new FormData();
  formData.append("file", file); // 👈 coincide con uploadEstructura.single('file')

  const resp = await fetch(`${API_BASE}/estructura/upload`, {
    method: "POST",
    body: formData,
  });

  const json = (await resp.json().catch(() => ({}))) as UploadEstructuraResponse;

  if (!resp.ok || !json.ok || !json.archivoId) {
    const msg =
      json.error ||
      `Error al subir estructura (${resp.status} ${resp.statusText})`;
    throw new Error(msg);
  }

  return json.archivoId;
}

/**
 * 2) Procesa el archivo de estructura ya subido
 *    -> POST /estructura/process/:archivoId
 *    <- { ok: true, resumen: { alumnosUpsert, planesUpsert, warnings } }
 */
export async function procesarEstructura(
  archivoId: number
): Promise<EstructuraResumen> {
  const resp = await fetch(
    `${API_BASE}/estructura/process/${archivoId}`,
    {
      method: "POST",
    }
  );

  const json =
    (await resp.json().catch(() => ({}))) as ProcesarEstructuraResponse;

  if (!resp.ok || !json.ok || !json.resumen) {
    const msg =
      json.error ||
      `Error al procesar estructura (${resp.status} ${resp.statusText})`;
    throw new Error(msg);
  }

  return json.resumen;
}
