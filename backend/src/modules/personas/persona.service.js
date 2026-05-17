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

module.exports = {
  createPersona,
  getPersonas,
  getPersonaById, 
  updatePersona
};