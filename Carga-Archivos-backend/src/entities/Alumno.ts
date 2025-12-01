// src/entities/Alumno.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn
} from "typeorm";
import { PlanEstudio } from "./PlanEstudio";

@Entity({ name: "alumno" })
export class Alumno {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  matricula!: string;

  @Column({ type: "text" })
  expediente!: string;

  @Column({ type: "text" })
  nombre!: string;

  @Column({ name: "apellido_paterno", type: "text" })
  apellidoPaterno!: string;

  @Column({ name: "apellido_materno", type: "text", nullable: true })
  apellidoMaterno!: string | null;

  @Column({ type: "text", nullable: true })
  correo!: string | null;

  // Estado académico (texto o enum en DB; aquí lo dejamos como text nullable)
  @Column({ name: "estado_academico", type: "text", nullable: true })
  estadoAcademico!: string | null;

  @Column({ name: "nivel_ingles_actual", type: "text", nullable: true })
  nivelInglesActual!: string | null;

  // Créditos totales (usa el nombre de la columna real)
  @Column({ name: "total_creditos", type: "int", default: 0 })
  totalCreditos!: number;

  @Column({ type: "char", length: 1, nullable: true })
  sexo!: "M" | "F" | null;

  @Column({ name: "fecha_nacimiento", type: "date", nullable: true })
  fechaNacimiento!: Date | null;

  @Column({ name: "tipo_alumno", type: "text", nullable: true })
  tipoAlumno!: string | null;

  @Column({ name: "promedio_general", type: "numeric", precision: 5, scale: 2, nullable: true })
  promedioGeneral!: number | null;

  @Column({ name: "promedio_periodo", type: "numeric", precision: 5, scale: 2, nullable: true })
  promedioPeriodo!: number | null;

  // Nuevos campos añadidos
  @Column({ name: "materias_aprobadas", type: "int", default: 0 })
  aprobadas!: number;

  @Column({ name: "materias_reprobadas" ,type: "int", default: 0 })
  reprobadas!: number;

  @Column({ name: "periodo_inicio", type: "text", nullable: true })
  periodoInicio!: string | null;

  @Column({ name: "acta_examen_profesional", type: "text", nullable: true })
  actaExamen!: string | null;

  @Column({ name: "constancia_exencion_examen_profesional", type: "text", nullable: true })
  constanciaExencion!: string | null;

  @Column({ name: "fecha_titulacion", type: "date", nullable: true })
  fechaTitulacion!: Date | null;

  @Column({ name: "creditos_culturest", type: "numeric", precision: 5, scale:2, nullable: true })
  creditosCulturest!: number | null;

  
  @Column({ name: "creditos_deportes", type: "numeric", precision: 5, scale:2, nullable: true })
  creditosDeportes!: number | null;

  // Relación con PlanEstudio: NO declares plan_estudio_id como columna aparte.
  @ManyToOne(() => PlanEstudio, { nullable: true })
  @JoinColumn({ name: "plan_estudio_id" })
  planEstudio!: PlanEstudio | null;
}
