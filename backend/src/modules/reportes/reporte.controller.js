const reporteService = require("./reporte.service");

const getCajaGeneral = async (req, res) => {
  try {

    const caja =
      await reporteService.getCajaGeneral();

    res.json(caja);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error obteniendo caja",
    });
  }
};

const getMensualidadesResumen = async (req, res) => {
  try {
    const anio = req.query.anio;
    const resumen = await reporteService.getMensualidadesResumen(anio);

    res.json(resumen);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error obteniendo mensualidades",
    });
  }
};

module.exports = {
  getCajaGeneral,
  getMensualidadesResumen,
};