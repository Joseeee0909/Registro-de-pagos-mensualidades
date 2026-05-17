const express = require('express');
const router = express.Router();
const personaController = require('./persona.controller');

router.post('/', personaController.createPersona);
router.get('/', personaController.getPersonas);

router.get("/:id/estado", personaController.getEstadoPersona);
router.get('/:id', personaController.getPersonaById);
router.put('/:id', personaController.updatePersona);

module.exports = router;