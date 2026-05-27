const prisma = require('../../config/prisma');

function normalizeMovimientoData(data) {
  return {
    personaId: data.personaId ? Number(data.personaId) : null,
    conceptoId: Number(data.conceptoId),
    tipo: data.tipo,
    valor: Number(data.valor),
    fecha: data.fecha ? new Date(data.fecha) : undefined,
    mes: data.mes !== undefined && data.mes !== null && data.mes !== "" ? Number(data.mes) : null,
    anio: data.anio !== undefined && data.anio !== null && data.anio !== "" ? Number(data.anio) : null,
    observacion: data.observacion || null,
  };
}

function validateMovimientoPayload(data) {
  if (!data) {
    throw createValidationError("El movimiento no puede estar vacío");
  }

  if (!data.conceptoId) {
    throw createValidationError("Debes seleccionar un concepto");
  }

  if (!data.tipo) {
    throw createValidationError("Debes seleccionar un tipo de movimiento");
  }

  const valor = Number(data.valor);
  const isExemptMonthly = isMensualidadPayload(data) && isExentoMovimiento(data);

  if (!Number.isFinite(valor) || valor < 0 || (!isExemptMonthly && valor <= 0)) {
    throw createValidationError("El monto debe ser mayor a 0");
  }

  if (isMensualidadPayload(data)) {
    if (!data.personaId) {
      throw createValidationError("Debes seleccionar una persona para la mensualidad");
    }

    if (!data.mes || !data.anio) {
      throw createValidationError("Debes seleccionar mes y año de la mensualidad");
    }
  }
}

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function ensureNoDuplicateMensualidad(data, excludeId = null) {
  if (!isMensualidadPayload(data)) {
    return;
  }

  const existing = await prisma.movimiento.findFirst({
    where: {
      personaId: Number(data.personaId),
      mes: Number(data.mes),
      anio: Number(data.anio),
      concepto: {
        OR: [{ tipo: "MENSUALIDAD" }, { esMensualidad: true }],
      },
      ...(excludeId ? { NOT: { id: Number(excludeId) } } : {}),
    },
  });

  if (existing) {
    throw createValidationError("Ya existe una mensualidad para esa persona en ese mes y año");
  }
}

function isMensualidadPayload(data) {
  return Boolean(data && data.mes !== undefined && data.mes !== null && data.anio !== undefined && data.anio !== null);
}

function isExentoMovimiento(data) {
  const observacion = String(data?.observacion || "").trim().toUpperCase();
  return observacion.startsWith("EXENTO:") || observacion.startsWith("EXCENTO:");
}

const createMovimiento = async (data) => {
    validateMovimientoPayload(data);
    await ensureNoDuplicateMensualidad(data);

    return await prisma.movimiento.create({
    data: {
      ...normalizeMovimientoData(data),
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
  validateMovimientoPayload(data);
  await ensureNoDuplicateMensualidad(data, id);

  return await prisma.movimiento.update({
    where: { id: Number(id) },
    data: normalizeMovimientoData(data),
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


