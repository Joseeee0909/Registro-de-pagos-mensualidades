const express = require('express');
const router = express.Router();
const movimientoController = require('./movimiento.controller');

router.post('/', movimientoController.createMovimiento);
router.get('/', movimientoController.getMovimientos);
router.put('/:id', movimientoController.updateMovimiento);
router.delete('/:id', movimientoController.deleteMovimiento);

module.exports = router;
