const personaService = require('./persona.service');

const createPersona = async (req, res) => {
  try {
    const persona = await personaService.createPersona(req.body);

    res.status(201).json(persona);
    } catch (error) { 
    res.status(500).json({ error: 'Error creating persona' });
  }
};

const getPersonas = async (req, res) => {
  try {
    const personas = await personaService.getPersonas();
    res.status(200).json(personas);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching personas' });
  } 
};

const getPersonaById = async (req, res) => {    
    try {   
    const persona = await personaService.getPersonaById(req.params.id);
    if (persona) {
      res.status(200).json(persona);
    } else {
      res.status(404).json({ error: 'Persona not found' });
    }
    } catch (error) {
    res.status(500).json({ error: 'Error fetching persona' });
  }
};

const updatePersona = async (req, res) => {
    try {
    const updatedPersona = await personaService.updatePersona(req.params.id, req.body);
    if (updatedPersona) {
      res.status(200).json(updatedPersona);
    } else {
        res.status(404).json({ error: 'Persona not found' });
    }
    } catch (error) {
    res.status(500).json({ error: 'Error updating persona' });
  } 
};

module.exports = {
  createPersona,
  getPersonas,
  getPersonaById,
  updatePersona
};