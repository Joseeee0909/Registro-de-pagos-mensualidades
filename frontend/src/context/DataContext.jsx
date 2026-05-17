import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/api";

const DataContext = createContext(undefined);

const mapPersona = (persona) => ({
  id: String(persona.id),
  nombre: persona.nombre,
  telefono: persona.telefono || "",
  activa: Boolean(persona.activa),
  createdAt: persona.createdAt,
  updatedAt: persona.updatedAt,
});

const mapConcepto = (concepto) => ({
  id: String(concepto.id),
  nombre: concepto.nombre,
  tipo: concepto.tipo,
  esMensualidad: Boolean(concepto.esMensualidad),
  createdAt: concepto.createdAt,
});

const mapMovimiento = (movimiento) => ({
  id: String(movimiento.id),
  personaId: movimiento.personaId != null ? String(movimiento.personaId) : null,
  conceptoId: String(movimiento.conceptoId),
  tipo: movimiento.tipo,
  valor: Number(movimiento.valor || 0),
  fecha: movimiento.fecha,
  mes: movimiento.mes ?? null,
  anio: movimiento.anio ?? null,
  observacion: movimiento.observacion || "",
  createdAt: movimiento.createdAt,
  persona: movimiento.persona ? mapPersona(movimiento.persona) : null,
  concepto: movimiento.concepto ? mapConcepto(movimiento.concepto) : null,
});

const getNormalizedError = (error) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  return error?.message || "No se pudo conectar con el backend";
};

export function DataProvider({ children }) {
  const [personas, setPersonas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [personasResponse, movimientosResponse, conceptosResponse, cajaResponse] = await Promise.all([
        api.get("/personas"),
        api.get("/movimientos"),
        api.get("/conceptos"),
        api.get("/reportes/caja"),
      ]);

      setPersonas((personasResponse.data || []).map(mapPersona));
      setMovimientos((movimientosResponse.data || []).map(mapMovimiento));
      setConceptos((conceptosResponse.data || []).map(mapConcepto));
      setCaja(cajaResponse.data || null);
    } catch (requestError) {
      setError(getNormalizedError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    document.title = "Aerorumba";
  }, []);

  const conceptoIndex = useMemo(() => new Map(conceptos.map((concepto) => [concepto.id, concepto])), [conceptos]);

  const movimientosMensualidad = useMemo(
    () => movimientos.filter((movimiento) => isMensualidadConcepto(movimiento.concepto)),
    [movimientos],
  );

  const movimientosAhorro = useMemo(
    () => movimientos.filter((movimiento) => isAhorroConcepto(movimiento.concepto)),
    [movimientos],
  );

  const mensualidades = useMemo(
    () =>
      movimientosMensualidad.map((movimiento) => ({
        id: movimiento.id,
        movimientoId: movimiento.id,
        personaId: movimiento.personaId,
        persona: movimiento.persona,
        mes: movimiento.mes,
        anio: movimiento.anio,
        monto: Number(movimiento.valor || 0),
        pagado: true,
        fechaPago: movimiento.fecha ? movimiento.fecha.split("T")[0] : null,
        concepto: movimiento.concepto,
      })),
    [movimientosMensualidad],
  );

  const ahorros = useMemo(
    () =>
      movimientosAhorro.map((movimiento) => ({
        id: movimiento.id,
        movimientoId: movimiento.id,
        fecha: movimiento.fecha ? movement.fecha.split("T")[0] : "",
        monto: Number(movimiento.valor || 0),
        tipo: movimiento.tipo === "INGRESO" ? "DEPOSITO" : "RETIRO",
        descripcion: movimiento.observacion || movimiento.concepto?.nombre || "",
        concepto: movimiento.concepto,
        persona: movimiento.persona,
      })),
    [movimientosAhorro],
  );

  const reloadData = async () => {
    await loadData();
  };

  const getMensualidadesResumen = async (anio) => {
    const response = await api.get("/reportes/mensualidades", {
      params: { anio },
    });

    return response.data;
  };

  const addPersona = async (persona) => {
    await api.post("/personas", {
      nombre: persona.nombre,
      telefono: persona.telefono || null,
      activa: persona.activa ?? true,
    });
    await loadData();
  };

  const updatePersona = async (id, updates) => {
    await api.put(`/personas/${id}`, {
      nombre: updates.nombre,
      telefono: updates.telefono || null,
      activa: updates.activa ?? true,
    });
    await loadData();
  };

  const deletePersona = async (id) => {
    await api.put(`/personas/${id}`, { activa: false });
    await loadData();
  };

  const addMovimiento = async (movimiento) => {
    await api.post("/movimientos", normalizeMovimientoPayload(movimiento));
    await loadData();
  };

  const updateMovimiento = async (id, updates) => {
    await api.put(`/movimientos/${id}`, normalizeMovimientoPayload(updates));
    await loadData();
  };

  const deleteMovimiento = async (id) => {
    await api.delete(`/movimientos/${id}`);
    await loadData();
  };

  const addMensualidad = async (mensualidad) => {
    const conceptoId = getConceptoIdByType(conceptoIndex, "MENSUALIDAD");

    if (!conceptoId) {
      throw new Error("No hay conceptos de mensualidad disponibles");
    }

    await addMovimiento({
      fecha: mensualidad.fecha || new Date().toISOString(),
      tipo: "INGRESO",
      valor: mensualidad.monto,
      conceptoId,
      personaId: mensualidad.personaId,
      mes: mensualidad.mes ? monthNameToNumber(mensualidad.mes) : new Date().getMonth() + 1,
      anio: Number(mensualidad.anio || 2026),
      observacion: mensualidad.observacion || "Pago de mensualidad",
    });
  };

  const updateMensualidad = async (id, updates) => {
    await updateMovimiento(id, {
      fecha: updates.fecha,
      tipo: "INGRESO",
      valor: updates.monto,
      conceptoId: updates.conceptoId,
      personaId: updates.personaId,
      mes: updates.mes ? monthNameToNumber(updates.mes) : updates.mes,
      anio: updates.anio,
      observacion: updates.observacion || "Pago de mensualidad",
    });
  };

  const addAhorro = async (ahorro) => {
    const conceptoId = getConceptoIdByType(conceptoIndex, "AHORRO");

    if (!conceptoId) {
      throw new Error("No hay conceptos de ahorro disponibles");
    }

    await addMovimiento({
      fecha: ahorro.fecha || new Date().toISOString(),
      tipo: ahorro.tipo === "DEPOSITO" ? "INGRESO" : "EGRESO",
      valor: ahorro.monto,
      conceptoId,
      observacion: ahorro.descripcion || "Movimiento de ahorro",
    });
  };

  const updateAhorro = async (id, updates) => {
    await updateMovimiento(id, {
      fecha: updates.fecha,
      tipo: updates.tipo === "DEPOSITO" ? "INGRESO" : "EGRESO",
      valor: updates.monto,
      conceptoId: updates.conceptoId,
      observacion: updates.descripcion || "Movimiento de ahorro",
    });
  };

  return (
    <DataContext.Provider
      value={{
        personas,
        movimientos,
        conceptos,
        caja,
        mensualidades,
        ahorros,
        loading,
        error,
        reloadData,
        getMensualidadesResumen,
        getConceptosByType: (tipo) => conceptos.filter((concepto) => concepto.tipo === tipo),
        addPersona,
        updatePersona,
        deletePersona,
        addMovimiento,
        updateMovimiento,
        deleteMovimiento,
        addMensualidad,
        updateMensualidad,
        addAhorro,
        updateAhorro,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }

  return context;
}

function normalizeMovimientoPayload(movimiento) {
  return {
    fecha: movimiento.fecha,
    personaId: movimiento.personaId ? Number(movimiento.personaId) : null,
    conceptoId: movimiento.conceptoId ? Number(movimiento.conceptoId) : null,
    tipo: movimiento.tipo,
    valor: Number(movimiento.valor || movimiento.monto || 0),
    mes: movimiento.mes ? Number(movimiento.mes) : null,
    anio: movimiento.anio ? Number(movimiento.anio) : null,
    observacion: movimiento.observacion || movimiento.descripcion || null,
  };
}

function getConceptoIdByType(conceptosMap, tipo) {
  for (const concepto of conceptosMap.values()) {
    if (concepto.tipo === tipo) {
      return Number(concepto.id);
    }
  }

  return null;
}

function isMensualidadConcepto(concepto) {
  return Boolean(concepto && (concepto.tipo === "MENSUALIDAD" || concepto.esMensualidad));
}

function isAhorroConcepto(concepto) {
  return Boolean(concepto && concepto.tipo === "AHORRO");
}

function monthNameToNumber(monthName) {
  const months = {
    Enero: 1,
    Febrero: 2,
    Marzo: 3,
    Abril: 4,
    Mayo: 5,
    Junio: 6,
    Julio: 7,
    Agosto: 8,
    Septiembre: 9,
    Octubre: 10,
    Noviembre: 11,
    Diciembre: 12,
  };

  return months[monthName] || Number(monthName) || null;
}