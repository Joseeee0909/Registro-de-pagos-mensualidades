const prisma = require("../../config/prisma");

const DEFAULT_MONTHLY_FEE = 25000;

const MONTHS = [
  { key: 1, label: "Ene" },
  { key: 2, label: "Feb" },
  { key: 3, label: "Mar" },
  { key: 4, label: "Abr" },
  { key: 5, label: "May" },
  { key: 6, label: "Jun" },
  { key: 7, label: "Jul" },
  { key: 8, label: "Ago" },
  { key: 9, label: "Sep" },
  { key: 10, label: "Oct" },
  { key: 11, label: "Nov" },
  { key: 12, label: "Dic" },
];

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

const getMensualidadesResumen = async (anio) => {
  const year = Number(anio || 2026);
  const mensualidadBase = await getMensualidadGeneral();

  const [personas, movimientos] = await Promise.all([
    prisma.persona.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.movimiento.findMany({
      where: {
        tipo: "INGRESO",
        anio: year,
      },
      include: {
        persona: true,
        concepto: true,
      },
      orderBy: [
        { personaId: "asc" },
        { mes: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  const paymentsByPerson = new Map();

  movimientosToCells(movimientos)
    .filter((entry) => isMensualidadMovimiento(entry))
    .forEach((entry) => {
      if (!paymentsByPerson.has(entry.personaId)) {
        paymentsByPerson.set(entry.personaId, new Map());
      }

      const personMonths = paymentsByPerson.get(entry.personaId);
      allocateMensualidadPayment(personMonths, entry, mensualidadBase);
    });

  const rows = personas.map((persona) => {
    const personMonths = paymentsByPerson.get(persona.id) || new Map();

    const cells = MONTHS.map((month) => {
      const summary = personMonths.get(month.key) || createCellSummary(mensualidadBase);

      return {
        month,
        ...summary,
      };
    });

    const rowTotal = cells.reduce((sum, cell) => sum + Number(cell.totalPaid || 0), 0);

    return {
      persona: {
        id: persona.id,
        nombre: persona.nombre,
        activa: persona.activa,
      },
      cells,
      rowTotal,
    };
  });

  const totalPaid = rows.reduce((sum, row) => sum + Number(row.rowTotal || 0), 0);
  const paidCount = rows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.totalPaid >= Number(mensualidadBase)).length, 0);
  const pendingCount = rows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.totalPaid < Number(mensualidadBase)).length, 0);

  return {
    year,
    monthlyFee: Number(mensualidadBase),
    months: MONTHS,
    rows,
    stats: {
      paidCount,
      pendingCount,
      totalPaid,
      totalExpected: rows.length * 12 * Number(mensualidadBase),
    },
  };
};

const getMensualidadGeneral = async () => {
  const configuracion = await prisma.configuracion.findFirst({
    orderBy: { id: "asc" },
  });

  return Number(configuracion?.mensualidadGeneral || DEFAULT_MONTHLY_FEE);
};

function createCellSummary(monthlyFee = DEFAULT_MONTHLY_FEE) {
  return {
    totalPaid: 0,
    remaining: Number(monthlyFee),
    status: "PENDIENTE",
    latestPayment: null,
    payments: [],
  };
}

function allocateMensualidadPayment(personMonths, entry, monthlyFee) {
  let remaining = Number(entry.valor || 0);
  const startMonth = clampMonth(entry.mes || 1);

  for (let month = startMonth; month <= 12 && remaining > 0; month += 1) {
    const current = personMonths.get(month) || createCellSummary(monthlyFee);
    const available = Math.max(Number(monthlyFee) - Number(current.totalPaid || 0), 0);

    if (available <= 0) {
      continue;
    }

    const applied = Math.min(available, remaining);

    current.totalPaid += applied;
    current.remaining = Math.max(Number(monthlyFee) - current.totalPaid, 0);
    current.status = current.totalPaid >= Number(monthlyFee) ? "PAGADO" : current.totalPaid > 0 ? "PARCIAL" : "PENDIENTE";
    current.latestPayment = pickLatestPayment(current.latestPayment, entry);
    current.payments.push({
      ...entry,
      appliedAmount: applied,
      allocatedMonth: month,
    });

    personMonths.set(month, current);
    remaining -= applied;
  }
}

function clampMonth(month) {
  const value = Number(month);

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 12);
}

function pickLatestPayment(previous, current) {
  if (!previous) {
    return current;
  }

  const previousDate = previous.createdAt ? new Date(previous.createdAt).getTime() : 0;
  const currentDate = current.createdAt ? new Date(current.createdAt).getTime() : 0;

  return currentDate >= previousDate ? current : previous;
}

function movimientosToCells(movimientos) {
  return movimientos.map((movimiento) => ({
    id: movimiento.id,
    personaId: Number(movimiento.personaId),
    mes: Number(movimiento.mes),
    anio: Number(movimiento.anio),
    valor: Number(movimiento.valor || 0),
    fecha: movimiento.fecha,
    createdAt: movimiento.createdAt,
    observacion: movimiento.observacion || "",
    persona: movimiento.persona,
    concepto: movimiento.concepto,
  }));
}

function isMensualidadMovimiento(movimiento) {
  return Boolean(
    movimiento.concepto &&
      (movimiento.concepto.tipo === "MENSUALIDAD" || movimiento.concepto.esMensualidad)
  );
}

module.exports = {
  getCajaGeneral,
  getMensualidadesResumen,
};