const prisma = require("../../config/prisma");

const getConceptos = async () => {
  return prisma.concepto.findMany({
    orderBy: {
      id: "asc",
    },
  });
};

module.exports = {
  getConceptos,
};