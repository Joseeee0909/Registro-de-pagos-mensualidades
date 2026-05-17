const express = require('express');
const router = express.Router();
const movimientoController = require('./movimiento.controller');

router.post('/', movimientoController.createMovimiento);
router.get('/', movimientoController.getMovimientos);

module.exports = router;
