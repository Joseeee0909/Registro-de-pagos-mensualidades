const configuracionService = require("./configuracion.service");

const getConfiguracion = async (req, res) => {
  try {
    const configuracion = await configuracionService.getConfiguracion();
    res.json(configuracion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo configuracion" });
  }
};

const updateConfiguracion = async (req, res) => {
  try {
    const mensualidadGeneral = Number(req.body.mensualidadGeneral);

    if (!Number.isFinite(mensualidadGeneral) || mensualidadGeneral <= 0) {
      return res.status(400).json({ error: "La mensualidad general debe ser un número mayor a 0" });
    }

    const configuracion = await configuracionService.updateConfiguracion({ mensualidadGeneral });
    res.json(configuracion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando configuracion" });
  }
};

module.exports = {
  getConfiguracion,
  updateConfiguracion,
};