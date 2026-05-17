const conceptoService = require("./concepto.service");

const getConceptos = async (req, res) => {
  try {
    const conceptos = await conceptoService.getConceptos();
    res.status(200).json(conceptos);
  } catch (error) {
    res.status(500).json({ error: "Error fetching conceptos" });
  }
};

module.exports = {
  getConceptos,
};