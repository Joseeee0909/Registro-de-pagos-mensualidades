const prisma = require('../../config/prisma');

const createMovimiento = async (data) => {
    return await prisma.movimiento.create({
    data: {
      personaId: data.personaId ? Number(data.personaId) : null,

      conceptoId: Number(data.conceptoId),

      tipo: data.tipo,

      valor: data.valor,

      fecha: data.fecha ? new Date(data.fecha) : undefined,

      mes: data.mes || null,

      anio: data.anio || null,

      observacion: data.observacion || null,
    },

    include: {
      persona: true,
      concepto: true,
    },
  });
};

const getMovimientos = async () => {
  return await prisma.movimiento.findMany({
    include: {
      persona: true,
      concepto: true,
    },

    orderBy: {
      fecha: "desc",
    },
  });
};

const updateMovimiento = async (id, data) => {
  return await prisma.movimiento.update({
    where: { id: Number(id) },
    data: {
      personaId: data.personaId ? Number(data.personaId) : null,
      conceptoId: Number(data.conceptoId),
      tipo: data.tipo,
      valor: data.valor,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      mes: data.mes ?? null,
      anio: data.anio ?? null,
      observacion: data.observacion ?? null,
    },
    include: {
      persona: true,
      concepto: true,
    },
  });
};

const deleteMovimiento = async (id) => {
  return await prisma.movimiento.delete({
    where: { id: Number(id) },
  });
};

module.exports = {
  createMovimiento,
  getMovimientos,
  updateMovimiento,
  deleteMovimiento,
};


