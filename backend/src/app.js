const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

const personaRoutes = require("./modules/personas/persona.routes");
const conceptoRoutes = require("./modules/concepto/concepto.routes");
const movimientoRoutes = require("./modules/movimientos/movimiento.routes");
const reporteRoutes = require("./modules/reportes/reporte.routes");
const configuracionRoutes = require("./modules/configuracion/configuracion.routes");

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.REACT_APP_API_BASE_URL,
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  optionsSuccessStatus: 200,
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/personas", personaRoutes);
app.use("/api/conceptos", conceptoRoutes);
app.use("/api/movimientos", movimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/configuracion", configuracionRoutes);

module.exports = app;