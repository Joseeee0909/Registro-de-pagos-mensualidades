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

const updateMovimiento = async (req, res) => {
  try {
    const movimiento = await movimientoService.updateMovimiento(req.params.id, req.body);
    res.status(200).json(movimiento);
  } catch (error) {
    res.status(500).json({ error: 'Error updating movimiento' });
  }
};

const deleteMovimiento = async (req, res) => {
  try {
    await movimientoService.deleteMovimiento(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting movimiento' });
  }
};

module.exports = {
  createMovimiento,
  getMovimientos,
  updateMovimiento,
  deleteMovimiento,
};