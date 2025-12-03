// src/services/ingestaAsistencia.ts
import { AppDataSource } from "../config/data-source";
import { FilaAsistencia, MetaAsistencia } from "../utils/parseAsistencia";

export type IngestaAsistenciaResumen = {
  ok: boolean;
  periodoEtiqueta: string;
  periodoId: number | null;
  grupoId: number | null;
  alumnosVinculados: number;
  alumnosSinAlumno: number;
  alumnosSinGrupo: number;
  inscripcionesCreadas: number;
  warnings: string[];
};

export async function ingestaAsistencia(
  rows: FilaAsistencia[],
  meta: MetaAsistencia,
  archivoId: number,
  periodoEtiqueta: string
): Promise<IngestaAsistenciaResumen> {
  const warnings: string[] = [];

  const etiqueta = (periodoEtiqueta || "").trim();
  if (!etiqueta) {
    throw new Error("periodoEtiqueta vacío en ingestaAsistencia");
  }

  // 1) Resolver periodo_id
  const periodoRes = await AppDataSource.query(
    `SELECT id FROM public.periodo WHERE etiqueta = $1`,
    [etiqueta]
  );

  const periodoId: number | null = periodoRes[0]?.id ?? null;
  if (!periodoId) {
    throw new Error(`No se encontró periodo con etiqueta "${etiqueta}"`);
  }

  // 2) Resolver grupo_id a partir de meta.materiaCodigo + meta.grupoTexto
  let grupoId: number | null = null;

  if (!meta.materiaCodigo) {
    warnings.push(
      "meta.materiaCodigo es nulo; no se puede resolver el grupo desde la lista de asistencia."
    );
  } else {
    const claveGrupo = (meta.grupoTexto || "").trim();

    // 2.1) Intentar encontrar grupo exacto por periodo + materiaCodigo + clave_grupo
    if (claveGrupo) {
      const gRes = await AppDataSource.query(
        `SELECT g.id
         FROM public.grupo g
         JOIN public.materia m ON m.id = g.materia_id
         WHERE g.periodo_id = $1
           AND m.codigo = $2
           AND g.clave_grupo = $3`,
        [periodoId, meta.materiaCodigo, claveGrupo]
      );

      if (gRes[0]?.id) {
        grupoId = gRes[0].id;
      } else {
        warnings.push(
          `No se encontró grupo con periodo="${etiqueta}", materiaCodigo="${meta.materiaCodigo}", clave_grupo="${claveGrupo}".`
        );
      }
    }

    // 2.2) Fallback: si no se encontró por clave_grupo, intentar agarrar
    // el único grupo de esa materia y periodo (si sólo hay uno)
    if (!grupoId) {
      const gRes2 = await AppDataSource.query(
        `SELECT g.id
         FROM public.grupo g
         JOIN public.materia m ON m.id = g.materia_id
         WHERE g.periodo_id = $1
           AND m.codigo = $2
         ORDER BY g.id`,
        [periodoId, meta.materiaCodigo]
      );

      if (gRes2.length === 1) {
        grupoId = gRes2[0].id;
        warnings.push(
          `No se encontró grupo por clave_grupo, se usó el único grupo disponible para la materia ${meta.materiaCodigo} en el periodo ${etiqueta}.`
        );
      } else if (gRes2.length > 1) {
        warnings.push(
          `Hay múltiples grupos para materiaCodigo="${meta.materiaCodigo}" en periodo="${etiqueta}" y no se pudo determinar cuál usar.`
        );
      } else {
        // 2.3) NO HAY NINGÚN GRUPO → crear uno nuevo
        warnings.push(
          `No hay ningún grupo en BD para materiaCodigo="${meta.materiaCodigo}" en periodo="${etiqueta}". Se intentará crear uno automáticamente.`
        );

        // Buscar materia por código
        const matRes = await AppDataSource.query(
          `SELECT id FROM public.materia WHERE codigo = $1`,
          [meta.materiaCodigo]
        );
        const materiaId: number | null = matRes[0]?.id ?? null;

        if (!materiaId) {
          warnings.push(
            `No se encontró materia con codigo="${meta.materiaCodigo}", no se pudo crear el grupo automáticamente.`
          );
        } else {
          const claveGrupoNueva = claveGrupo || "GRUPO_LISTA_ASISTENCIA";

          const nuevoGrupo = await AppDataSource.query(
            `INSERT INTO public.grupo (periodo_id, materia_id, clave_grupo)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [periodoId, materiaId, claveGrupoNueva]
          );

          grupoId = nuevoGrupo[0]?.id ?? null;

          if (grupoId) {
            warnings.push(
              `Se creó automáticamente el grupo con id=${grupoId} para materiaCodigo="${meta.materiaCodigo}", periodo="${etiqueta}", clave_grupo="${claveGrupoNueva}".`
            );
          } else {
            warnings.push(
              `No se pudo crear el grupo automáticamente para materiaCodigo="${meta.materiaCodigo}" en periodo="${etiqueta}".`
            );
          }
        }
      }
    }
  }

  let alumnosVinculados = 0;
  let alumnosSinAlumno = 0;
  let alumnosSinGrupo = 0;
  let inscripcionesCreadas = 0;

  // 3) Procesar cada fila de la lista de asistencia
  for (const fila of rows) {
    const expediente = (fila.expediente || "").trim();

    if (!expediente) {
      warnings.push(`Fila ${fila.rowIndex}: expediente vacío, se omite.`);
      continue;
    }

    // 3.1) Buscar alumno por expediente
    const alumRes = await AppDataSource.query(
      `SELECT id FROM public.alumno WHERE expediente = $1`,
      [expediente]
    );

    const alumnoId: number | null = alumRes[0]?.id ?? null;

    if (!alumnoId) {
      alumnosSinAlumno++;
      warnings.push(
        `Fila ${fila.rowIndex}: no se encontró alumno con expediente "${expediente}".`
      );
      continue;
    }

    // 3.2) Asegurar inscripción del alumno al periodo
    const insRes = await AppDataSource.query(
      `SELECT 1
       FROM public.inscripcion
       WHERE alumno_id = $1 AND periodo_id = $2`,
      [alumnoId, periodoId]
    );

    if (!insRes[0]) {
      await AppDataSource.query(
        `INSERT INTO public.inscripcion (alumno_id, periodo_id, estatus)
         VALUES ($1,$2,'INSCRITO')`,
        [alumnoId, periodoId]
      );
      inscripcionesCreadas++;
    }

    // 3.3) Asociar alumno al grupo (si logramos resolver/crear grupoId)
    if (!grupoId) {
      alumnosSinGrupo++;
      continue;
    }

    // Verificar si ya existe la relación alumno_grupo
    const agRes = await AppDataSource.query(
      `SELECT 1
       FROM public.alumno_grupo
       WHERE alumno_id = $1 AND grupo_id = $2`,
      [alumnoId, grupoId]
    );

    if (!agRes[0]) {
      await AppDataSource.query(
        `INSERT INTO public.alumno_grupo (alumno_id, grupo_id, archivo_id, fuente)
         VALUES ($1,$2,$3,'LISTA_ASISTENCIA')`,
        [alumnoId, grupoId, archivoId]
      );
      alumnosVinculados++;
    }
  }

  return {
    ok: true,
    periodoEtiqueta: etiqueta,
    periodoId,
    grupoId,
    alumnosVinculados,
    alumnosSinAlumno,
    alumnosSinGrupo,
    inscripcionesCreadas,
    warnings,
  };
}
