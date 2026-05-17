const express = require("express");

const controller = require("./reporte.controller");

const router = express.Router();

router.get("/caja", controller.getCajaGeneral);

module.exports = router;