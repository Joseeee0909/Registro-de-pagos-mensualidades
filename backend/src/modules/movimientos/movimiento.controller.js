const movimientoService = require('./movimiento.service');

const createMovimiento = async (req, res) => {
  try { 
    const movimiento = await movimientoService.createMovimiento(req.body);
    res.status(201).json(movimiento);
  } catch (error) {
    res.status(500).json({ error: 'Error creating movimiento' });
  } 
};

const getMovimientos = async (req, res) => {
  try {
    const movimientos = await movimientoService.getMovimientos();
    res.status(200).json(movimientos);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching movimientos' });
  } 
};

module.exports = {
  createMovimiento,
  getMovimientos,
};