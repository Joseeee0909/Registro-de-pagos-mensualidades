const express = require("express");

const controller = require("./configuracion.controller");

const router = express.Router();

router.get("/", controller.getConfiguracion);
router.put("/", controller.updateConfiguracion);

module.exports = router;