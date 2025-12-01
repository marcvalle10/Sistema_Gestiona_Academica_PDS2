import { AppDataSource } from '../config/data-source';
import { validaFilaBasica, FilaEstructura } from '../utils/parseEstructura';
import { Alumno } from '../entities/Alumno';
import { PlanEstudio } from '../entities/PlanEstudio';
import { AuditoriaCargas } from '../entities/AuditoriaCargas';
import type { DeepPartial } from 'typeorm';

export async function ingestaEstructura(rows: FilaEstructura[], archivoId: number) {
  const repoAlumno = AppDataSource.getRepository(Alumno);
  const repoPlan   = AppDataSource.getRepository(PlanEstudio);
  const repoAud    = AppDataSource.getRepository(AuditoriaCargas); // (se usa en auditoría cada 200 filas)

  let alumnosUpsert = 0;
  let planesUpsert  = 0;
  const warnings: string[] = [];

  const planCache = new Map<string, PlanEstudio>();

  // =========================
  // Helpers (fuera del loop)
  // =========================

  const asNumber = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Normaliza estado académico del XLSX a tu ENUM real en DB
  const normalizeEstado = (v: any): 'ACTIVO' | 'BAJA' | 'EGRESADO' | 'SUSPENDIDO' => {
    if (v == null) return 'ACTIVO';
    const s = String(v).trim().toUpperCase();

    // Códigos comunes
    if (s === 'A' || s === 'ACTIVO' || s === 'INSCRITO') return 'ACTIVO';
    if (s === 'B' || s === 'BAJA' || s === 'BAJA TEMPORAL' || s === 'BAJA DEFINITIVA') return 'BAJA';
    if (s === 'E' || s === 'EGRESADO' || s === 'GRADUADO') return 'EGRESADO';
    if (s === 'S' || s === 'SUSPENDIDO') return 'SUSPENDIDO';

    // Fallback para valores raros
    return 'ACTIVO';
  };

  // Palabras que suelen formar parte de un apellido compuesto
  const PARTICULAS = new Set([
    'DA','DAS','DE','DEL','DELA','DE','LA','LAS','LOS',
    'DE LOS','DE LAS','DE LA','DI','DU','VAN','VON','Y','MAC','MC'
  ]);

  function normalizaEspacios(s: string) {
    return s.replace(/[,\s]+/g, ' ').trim();
  }

  // Une tokens desde el final respetando partículas (para armar un apellido)
  function tomaApellido(tokens: string[]): string | null {
    if (tokens.length === 0) return null;

    const out: string[] = [];
    // Siempre tomamos al menos el último token como base del apellido
    out.unshift(tokens.pop() as string);

    // Si hay partículas pegadas antes, también las incluimos
    while (tokens.length > 0) {
      const prev = tokens[tokens.length - 1].toUpperCase();
      if (PARTICULAS.has(prev)) {
        out.unshift(tokens.pop() as string);
      } else {
        break;
      }
    }
    return out.join(' ');
  }

  /**
   * Divide "NOMBRE(S) APELLIDO PATERNO APELLIDO MATERNO" en partes.
   * - Soporta apellidos compuestos con partículas.
   * - Si sólo hay 2 tokens, asume: Nombres + Apellido Paterno.
   * - Si sólo hay 1 token, se considera inválido (no tenemos apellido paterno para NOT NULL).
   */
  function splitNombreCompleto(raw: any): {
    ok: boolean;
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string | null;
    reason?: string;
  } {
    if (raw == null) return { ok: false, reason: 'vacío' };

    const limpio = normalizaEspacios(String(raw));
    if (!limpio) return { ok: false, reason: 'vacío' };

    const tokens = limpio.split(' ');
    if (tokens.length === 1) {
      // No podemos cumplir NOT NULL de apellido_paterno
      return { ok: false, reason: 'falta apellido' };
    }

    // Tomamos apellido materno (si lo hay) y paterno (obligatorio)
    const t = [...tokens]; // copia
    const apellidoMaterno = tomaApellido(t); // puede ser null si sólo había 1 token (ya controlado)
    const apellidoPaterno = tomaApellido(t);

    // Si por la heurística no quedó paterno, intentamos con el último token remanente
    let apPat = apellidoPaterno;
    let apMat = apellidoMaterno;

    if (!apPat) {
      if (t.length === 0) return { ok: false, reason: 'falta apellido' };
      apPat = t.pop() as string;
    }

    // Lo que quede son los nombres
    const nombres = normalizaEspacios(t.join(' '));
    if (!nombres) {
      // Si no quedaron nombres, reasignamos de forma segura (evita violar NOT NULL de ap_paterno)
      // nombres <- primer token del apellido paterno; ap_paterno mantiene al menos 1 token.
      const pedazosPat = apPat.split(' ');
      const primer = pedazosPat.shift()!;
      const resto = pedazosPat.join(' ').trim();
      return {
        ok: true,
        nombres: primer,
        apellidoPaterno: resto || apPat,
        apellidoMaterno: apMat ?? null,
      };
    }

    return {
      ok: true,
      nombres,
      apellidoPaterno: apPat,
      apellidoMaterno: apMat ?? null,
    };
  }

  // =========================
  // Loop de ingesta
  // =========================
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const errs = validaFilaBasica(r);
    if (errs.length) {
      warnings.push(`Fila ${i + 2}: ${errs.join(' | ')}`);
      continue;
    }

    // =====================================
    // 🔹 UPSERT PLAN_ESTUDIO (nombre + version)
    // =====================================
    const planKey = `${r.clavePrograma}__${r.plan}`;
    let planEntity = planCache.get(planKey);

    if (!planEntity) {
      planEntity = await repoPlan.findOne({
        where: { nombre: `Programa ${r.clavePrograma}`, version: r.plan },
      }) ?? undefined;

      if (!planEntity) {
        const nuevoPlan: DeepPartial<PlanEstudio> = {
          nombre: `Programa ${r.clavePrograma}`,
          version: r.plan,
          totalCreditos: 0,
          semestresSugeridos: 0,
        };
        planEntity = await repoPlan.save(repoPlan.create(nuevoPlan));
        planesUpsert++;
      }

      planCache.set(planKey, planEntity);
    }

    // =====================================
    // 🔹 UPSERT ALUMNO (por expediente)
    // =====================================
    let alumno = await repoAlumno.findOne({ where: { expediente: r.expediente } as any });

    // Split de nombre completo → nombre / apellido_paterno / apellido_materno
    const split = splitNombreCompleto(r.nombre);
    if (!split.ok) {
      warnings.push(`Fila ${i + 2}: nombre inválido o sin apellidos ("${r.nombre}"). Motivo: ${split.reason}`);
      continue; // Evita violar NOT NULL en apellido_paterno
    }

    if (!alumno) {
      const nuevo: DeepPartial<Alumno> = {
        matricula: (r as any).matricula ?? r.expediente, // obligatorio en DB
        expediente: r.expediente,
        nombre: split.nombres!,                   // nombres
        apellidoPaterno: split.apellidoPaterno!,  // NOT NULL
        apellidoMaterno: split.apellidoMaterno ?? null,
        sexo: r.sexo ?? null,
        fechaNacimiento: r.fechaNac ?? null,
        estadoAcademico: normalizeEstado(r.statusAlumno),
        tipoAlumno: r.tipoAlumno ?? null,
        totalCreditos: asNumber(r.credAprob) ?? 0,
        planEstudio: { id: planEntity.id } as any,
        promedioGeneral: asNumber(r.promKdxs),
        promedioPeriodo: asNumber(r.promPeriodo),
        nivelInglesActual: r.nivelIngles ?? null,
        correo: r.correo ?? null,
        aprobadas: r.matAprobadas ?? 0,
        reprobadas: r.matReprobadas ?? 0,
        periodoInicio: r.periodoInicio ?? null,
        actaExamen: r.actaExamen ?? null,
        constanciaExencion: r.constanciaExencion ?? null,
        fechaTitulacion: r.fechaTitulacion ?? null, 
        creditosCulturest: r.creditosCultruest ?? 0,
        creditosDeportes: r.creditosDeportes ?? 0,
      };
      alumno = repoAlumno.create(nuevo);
    } else {
      // Si el Excel trae nombre, intentamos re-split para mejorar datos
      const splitUpd = splitNombreCompleto(r.nombre);
      if (splitUpd.ok) {
        alumno.nombre = splitUpd.nombres ?? alumno.nombre;
        alumno.apellidoPaterno = splitUpd.apellidoPaterno ?? alumno.apellidoPaterno;
        alumno.apellidoMaterno = (splitUpd.apellidoMaterno ?? alumno.apellidoMaterno) ?? null;
      } else {
        // fallback: no tocar apellidos si el split no es válido
        alumno.nombre = r.nombre || alumno.nombre;
      }

      alumno.matricula = (r as any).matricula ?? alumno.matricula ?? r.expediente;
      alumno.sexo = r.sexo ?? alumno.sexo ?? null;
      alumno.fechaNacimiento = r.fechaNac ?? alumno.fechaNacimiento ?? null;
      alumno.estadoAcademico = normalizeEstado(r.statusAlumno ?? alumno.estadoAcademico);
      alumno.tipoAlumno = r.tipoAlumno ?? alumno.tipoAlumno ?? null;
      alumno.totalCreditos = asNumber(r.credAprob) ?? alumno.totalCreditos ?? 0;
      alumno.planEstudio = { id: planEntity.id } as any;
      alumno.promedioGeneral = asNumber(r.promKdxs) ?? alumno.promedioGeneral ?? null;
      alumno.promedioPeriodo = asNumber(r.promPeriodo) ?? alumno.promedioPeriodo ?? null;
      alumno.nivelInglesActual = r.nivelIngles ?? alumno.nivelInglesActual ?? null;
      alumno.correo = r.correo ?? alumno.correo ?? null;
      alumno.aprobadas = r.matAprobadas ?? alumno.aprobadas ?? 0;
      alumno.reprobadas = r.matReprobadas ?? alumno.reprobadas ?? 0;
      alumno.periodoInicio = r.periodoInicio ?? alumno.periodoInicio ?? null;
      alumno.actaExamen = r.actaExamen ?? alumno.actaExamen ?? null;
      alumno.constanciaExencion = r.constanciaExencion ?? alumno.constanciaExencion ?? null;
      alumno.fechaTitulacion = r.fechaTitulacion ?? alumno.fechaTitulacion ?? null;
      alumno.creditosCulturest = r.creditosCultruest ?? alumno.creditosCulturest ?? 0;
      alumno.creditosDeportes = r.creditosDeportes ?? alumno.creditosDeportes ?? 0;
    }

    await repoAlumno.save(alumno);
    alumnosUpsert++;

    // =====================================
    // 🔹 AUDITORÍA CADA 200 FILAS
    // =====================================
    if (i > 0 && i % 200 === 0) {
      await AppDataSource.query(
        `INSERT INTO public.auditoria_cargas (archivo_id, etapa, estado, detalle)
         VALUES ($1, $2, $3, $4)`,
        [archivoId, 'INGESTA', 'OK', `Progreso: ${i}/${rows.length}`],
      );
    }
  }

  return { alumnosUpsert, planesUpsert, warnings };
}
