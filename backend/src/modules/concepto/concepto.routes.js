const express = require("express");

const controller = require("./concepto.controller");

const router = express.Router();

router.get("/", controller.getConceptos);

module.exports = router;