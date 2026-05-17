const prisma = require('../../config/prisma'); 


const createPersona = async (data) => {
    return await prisma.persona.create({
    data,
  });
};

const getPersonas = async () => {
  return await prisma.persona.findMany({
    orderBy: {
      id: 'asc',
    },
  });
}

const getPersonaById = async (id) => {
  return await prisma.persona.findUnique({
    where: { id: parseInt(id) },
  });
}

const updatePersona = async (id, data) => {
  return await prisma.persona.update({
    where: { id: parseInt(id) },
    data,
  });
}

const getEstadoPersona = async (personaId) => {

  const persona = await prisma.persona.findUnique({
    where: {
      id: Number(personaId),
    },

    include: {
      movimientos: {
        include: {
          concepto: true,
        },
      },
    },
  });

  if (!persona) {
    throw new Error("Persona no encontrada");
  }

  const mensualidad = 25000;

  const resumenMensualidades = {};

  persona.movimientos.forEach((movimiento) => {

    if (
      movimiento.tipo === "INGRESO" &&
      movimiento.concepto.esMensualidad &&
      movimiento.mes &&
      movimiento.anio
    ) {

      const key = `${movimiento.mes}-${movimiento.anio}`;

      if (!resumenMensualidades[key]) {
        resumenMensualidades[key] = 0;
      }

      resumenMensualidades[key] += Number(movimiento.valor);
    }
  });

  return {
    id: persona.id,
    nombre: persona.nombre,


    mensualidades: Object.entries(resumenMensualidades).map(
      ([periodo, totalPagado]) => ({
        periodo,
        totalPagado,

        deuda: mensualidad - totalPagado,

        estado:
          totalPagado >= mensualidad
            ? "PAGADO"
            : "PENDIENTE",
      })
    ),
  };
};
module.exports = {
  createPersona,
  getPersonas,
  getPersonaById, 
  updatePersona,
  getEstadoPersona,
};