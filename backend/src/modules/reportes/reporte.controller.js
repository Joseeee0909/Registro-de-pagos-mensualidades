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

module.exports = {
  getCajaGeneral,
};