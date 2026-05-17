const express = require("express");
const cors = require("cors");

const personaRoutes = require("./modules/personas/persona.routes");
const movimientoRoutes = require("./modules/movimientos/movimiento.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/personas", personaRoutes);
app.use("/api/movimientos", movimientoRoutes);

module.exports = app;