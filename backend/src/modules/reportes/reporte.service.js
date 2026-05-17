const prisma = require("../../config/prisma");

const getCajaGeneral = async () => {

  const ingresos = await prisma.movimiento.aggregate({
    where: {
      tipo: "INGRESO",
    },

    _sum: {
      valor: true,
    },
  });

  const egresos = await prisma.movimiento.aggregate({
    where: {
      tipo: "EGRESO",
    },

    _sum: {
      valor: true,
    },
  });

  const totalIngresos =
    Number(ingresos._sum.valor || 0);

  const totalEgresos =
    Number(egresos._sum.valor || 0);

  return {
    ingresos: totalIngresos,

    egresos: totalEgresos,

    cajaActual:
      totalIngresos - totalEgresos,
  };
};

module.exports = {
  getCajaGeneral,
};