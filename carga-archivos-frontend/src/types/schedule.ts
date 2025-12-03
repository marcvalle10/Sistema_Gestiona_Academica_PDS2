// ScheduleRecord que llega desde la BD
export interface ScheduleRecord {
  id: number;
  periodo: string;
  codigo_materia: string;
  nombre_materia: string;
  grupo: string;
  dia_semana: number | null;
  aula: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  num_empleado: number | null;
  profesor_nombre: string | null;
  profesor_apellido_paterno: string | null;
  profesor_apellido_materno: string | null;
  cupo: number | null;
}

// Datos para crear (sin id)
export type CreateHorarioInput = Omit<ScheduleRecord, "id">;
