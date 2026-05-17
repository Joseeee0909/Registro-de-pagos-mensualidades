const express = require("express");
const cors = require("cors");

const personaRoutes = require("./modules/personas/persona.routes");
const conceptoRoutes = require("./modules/concepto/concepto.routes");
const movimientoRoutes = require("./modules/movimientos/movimiento.routes");
const reporteRoutes = require("./modules/reportes/reporte.routes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/personas", personaRoutes);
app.use("/api/conceptos", conceptoRoutes);
app.use("/api/movimientos", movimientoRoutes);
app.use("/api/reportes", reporteRoutes);

module.exports = app;