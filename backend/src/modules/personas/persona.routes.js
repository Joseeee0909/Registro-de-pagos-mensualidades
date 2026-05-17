const express = require('express');
const router = express.Router();
const personaController = require('./persona.controller');

router.post('/', personaController.createPersona);
router.get('/', personaController.getPersonas);
router.get('/:id', personaController.getPersonaById);
router.put('/:id', personaController.updatePersona);

module.exports = router;