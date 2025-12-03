import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";

import { ArchivoCargado } from "../entities/ArchivoCargado";
import { AuditoriaCargas } from "../entities/AuditoriaCargas";
import { Alumno } from "../entities/Alumno";
import { PlanEstudio } from "../entities/PlanEstudio";
import { Periodo } from "../entities/Periodo";
import { Materia } from "../entities/Materia";
import { Kardex } from "../entities/Kardex";

const isTrue = (v?: string) => (v ?? "").toLowerCase() === "true";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  synchronize: isTrue(process.env.TYPEORM_SYNCHRONIZE),
  logging: isTrue(process.env.TYPEORM_LOGGING),
  ssl: isTrue(process.env.DB_SSL)
    ? { rejectUnauthorized: isTrue(process.env.DB_SSL_REJECT_UNAUTHORIZED) }
    : undefined,
  entities: [
    ArchivoCargado,
    AuditoriaCargas,
    Alumno,
    PlanEstudio,
    Periodo,
    Materia,
    Kardex,
  ],
});
