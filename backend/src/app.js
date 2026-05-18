const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

const personaRoutes = require("./modules/personas/persona.routes");
const conceptoRoutes = require("./modules/concepto/concepto.routes");
const movimientoRoutes = require("./modules/movimientos/movimiento.routes");
const reporteRoutes = require("./modules/reportes/reporte.routes");
const configuracionRoutes = require("./modules/configuracion/configuracion.routes");


const app = express();

app.use(cors(corsOptions));
app.use(express.json());
const corsOptions = {
  origin: process.env.REACT_APP_API_BASE_URL, // <--- AQUÍ PONES LA URL DE TU FRONTEND DESPLEGADO
  optionsSuccessStatus: 200
};

app.use("/api/personas", personaRoutes);
app.use("/api/conceptos", conceptoRoutes);
app.use("/api/movimientos", movimientoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/configuracion", configuracionRoutes);

module.exports = app;