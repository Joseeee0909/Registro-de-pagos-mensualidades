const prisma = require('../../config/prisma');

const createMovimiento = async (data) => {
    return await prisma.movimiento.create({
    data: {
      personaId: data.personaId || null,

      conceptoId: data.conceptoId,

      tipo: data.tipo,

      valor: data.valor,

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

module.exports = {
  createMovimiento,
  getMovimientos,
};


