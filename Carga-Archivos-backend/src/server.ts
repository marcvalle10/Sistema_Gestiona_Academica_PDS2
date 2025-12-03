// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { AppDataSource } from "./data-source";

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares base
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Aquí van tus rutas:
// app.use("/api/...", routerX);

AppDataSource.initialize()
  .then(() => {
    console.log("✅ Conectado a PostgreSQL (sga_pds2)");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar con la BD:", err);
    process.exit(1);
  });
