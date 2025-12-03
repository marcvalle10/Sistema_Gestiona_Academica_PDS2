import { Pool, type PoolConfig } from "pg"; // Esta importación es la que debe funcionar ahora

// Evitar múltiples pools en desarrollo
declare global {
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined;
}

// Configuración de la conexión
const config: PoolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : false,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
};

// Crear y exportar el pool
export const pool: Pool = global.__pool ?? new Pool(config);

if (process.env.NODE_ENV !== "production") {
  if (!global.__pool) {
    global.__pool = pool;
  }
}