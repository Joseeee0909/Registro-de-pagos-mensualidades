const prisma = require("../../config/prisma");

const DEFAULT_MONTHLY_FEE = 25000;

const getConfiguracion = async () => {
  const configuracion = await prisma.configuracion.findFirst({
    orderBy: { id: "asc" },
  });

  if (configuracion) {
    return configuracion;
  }

  return prisma.configuracion.create({
    data: {
      mensualidadGeneral: DEFAULT_MONTHLY_FEE,
    },
  });
};

const updateConfiguracion = async (data) => {
  const current = await prisma.configuracion.findFirst({
    orderBy: { id: "asc" },
  });

  if (current) {
    return prisma.configuracion.update({
      where: { id: current.id },
      data: {
        mensualidadGeneral: data.mensualidadGeneral,
      },
    });
  }

  return prisma.configuracion.create({
    data: {
      mensualidadGeneral: data.mensualidadGeneral,
    },
  });
};

module.exports = {
  getConfiguracion,
  updateConfiguracion,
};