import * as XLSX from 'xlsx';

export type FilaEstructura = {
  clavePrograma: string;
  plan: string;
  expediente: string;
  nombre: string;
  sexo: 'M'|'F'|null;
  fechaNac: Date|null;
  statusAlumno: string|null;
  tipoAlumno: string|null;
  credPasante: number|null;
  credAprob: number|null;
  promKdxs: number|null;
  promPeriodo: number|null;
  nivelIngles: string|null;    // ej. "4-2121", "5-2202", "N-0"
  correo?: string|null;        // opcional si lo quieres mapear ahora
  matAprobadas?: number|null;
  matReprobadas?: number|null;
  periodoInicio?: string|null;
  actaExamen?: string|null;
  constanciaExencion?: string|null;
  fechaTitulacion?: Date|null;
  creditosCultruest?: number|null;
  creditosDeportes?: number|null;
};

const normalizaHeader = (h?: string) => (h || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase();

export function leerExcelEstructura(filePath: string): { rows: FilaEstructura[]; headers: string[] } {
  const wb = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  // Map flexible: acepta variantes (por ejemplo NAMBRF)
  const mapCampos: Record<string,string[]> = {
    CLAVE_PROGRAMA: ['CLAVE PROGRAMA'],
    PLAN: ['PLAN'],
    EXPEDIENTE: ['EXPEDIENTE'],
    NOMBRE: ['NOMBRE','NAMBRF','NOMBRE COMPLETO','NOMBRE_ALUMNO','NAMBRF '],
    SEXO: ['SEXO'],
    FECHA_NAC: ['FECHA NAC','FECHA_NAC','FECHA DE NACIMIENTO'],
    STATUS_ALUMNO: ['STATUS ALUMNO','ESTATUS ALUMNO'],
    TIPO_ALUMNO: ['TIPO ALUMNO'],
    CRED_PASANTE: ['CRED.PASANTE','CRED PASANTE'],
    CRED_APROB: ['CRED.APROB.','CRED APROB'],
    PROM_KDXS: ['PROM.KDXS','PROM KDXS'],
    PROM_PERIODO: ['PROM.PERIODO','PROM PERIODO'],
    NIVEL_INGLES: ['NIVEL Y CICLO INGLÉS','NIVEL Y CICLO INGLES','NIVEL INGLES'],
    CORREO: ['CORREO','CORREO INSTITUCIONAL','EMAIL']
  };

  // Construye un índice de headers reales -> claves internas
  const headersEjemplo = Object.values(json[0] || {}).map(v => String(v));
  const headers = Object.keys(json[0] || {});
  const headerRealAClave: Record<string,string|null> = {};
  headers.forEach((hr) => {
    const H = normalizaHeader(hr);
    const key = Object.keys(mapCampos).find(k => mapCampos[k].some(c => normalizaHeader(c) === H)) || null;
    headerRealAClave[hr] = key;
  });

  const rows: FilaEstructura[] = json.map((r) => {
    const get = (alias: string[]): any => {
      for (const a of alias) if (r[a] !== undefined && r[a] !== null) return r[a];
      return null;
    };
    const toNum = (x: any) => x === null || x === '' ? null : Number(String(x).replace(',', '.'));
    const toInt = (x: any) => x === null || x === '' ? null : parseInt(String(x), 10);
    const toDate = (x: any): Date|null => {
      if (x instanceof Date) return x;
      if (!x) return null;
      // intenta dd/mm/aa o dd/mm/aaaa
      const s = String(x).trim();
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3].length === 2 ? ('19'+m[3]) : m[3]);
        return new Date(y, mo, d);
      }
      const t = Date.parse(s);
      return isNaN(t) ? null : new Date(t);
    };

    const sexoRaw = get(mapCampos.SEXO);
    let sexo: 'M'|'F'|null = null;
    if (typeof sexoRaw === 'string') {
      const s = sexoRaw.trim().toUpperCase();
      if (s.startsWith('M')) sexo = 'M';
      else if (s.startsWith('F')) sexo = 'F';
    }

    return {
      clavePrograma: String(get(mapCampos.CLAVE_PROGRAMA) ?? '').trim(),
      plan: String(get(mapCampos.PLAN) ?? '').trim(),
      expediente: String(get(mapCampos.EXPEDIENTE) ?? '').trim(),
      nombre: String(get(mapCampos.NOMBRE) ?? '').trim(),
      sexo,
      fechaNac: toDate(get(mapCampos.FECHA_NAC)),
      statusAlumno: get(mapCampos.STATUS_ALUMNO) ? String(get(mapCampos.STATUS_ALUMNO)).trim() : null,
      tipoAlumno: get(mapCampos.TIPO_ALUMNO) ? String(get(mapCampos.TIPO_ALUMNO)).trim() : null,
      credPasante: toInt(get(mapCampos.CRED_PASANTE)),
      credAprob: toInt(get(mapCampos.CRED_APROB)),
      promKdxs: toNum(get(mapCampos.PROM_KDXS)),
      promPeriodo: toNum(get(mapCampos.PROM_PERIODO)),
      nivelIngles: get(mapCampos.NIVEL_INGLES) ? String(get(mapCampos.NIVEL_INGLES)).trim() : null,
      correo: get(mapCampos.CORREO) ? String(get(mapCampos.CORREO)).trim() : null
    };
  });

  return { rows, headers: headersEjemplo };
}

export function validaFilaBasica(f: FilaEstructura): string[] {
  const errs: string[] = [];
  if (!f.expediente) errs.push('EXPEDIENTE vacío');
  if (!f.clavePrograma) errs.push('CLAVE PROGRAMA vacía');
  if (!f.plan) errs.push('PLAN vacío');
  if (!f.nombre) errs.push('NOMBRE vacío');
  return errs;
}
