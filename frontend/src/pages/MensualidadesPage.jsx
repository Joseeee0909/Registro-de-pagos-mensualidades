import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, Search, Smartphone, Upload, Zap } from "lucide-react";

import api from "../api/api";
import Modal from "../components/Modal";
import { useData } from "../context/DataContext";
import { formatCurrency } from "../utils/formatters";

const DEFAULT_YEAR = 2026;

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

const MONTH_ALIASES = {
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  mar: 3,
  marzo: 3,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  jul: 7,
  julio: 7,
  ago: 8,
  agosto: 8,
  sep: 9,
  set: 9,
  septiembre: 9,
  setiembre: 9,
  oct: 10,
  octubre: 10,
  nov: 11,
  noviembre: 11,
  dic: 12,
  diciembre: 12,
};

const NON_PAYMENT_STATES = new Set([
  "viaje",
  "incapacidad",
  "incp",
  "inc",
  "exento",
  "excento",
  "vacaciones",
  "suspendido",
  "exonerado",
  "licencia",
]);

const NON_PAYMENT_DISPLAY = {
  incp: "Incapacidad",
  inc: "Incapacidad",
  incapacidad: "Incapacidad",
  exento: "Exento",
  excento: "Exento",
  viaje: "Viaje",
  vacaciones: "Vacaciones",
  suspendido: "Suspendido",
  exonerado: "Exonerado",
  licencia: "Licencia",
};

function extractNonPaymentStateFromObservacion(observacion) {
  if (!observacion) return null;
  const match = String(observacion || "").match(/Estado:\s*(.+)/i);
  const raw = match ? match[1].trim() : String(observacion).trim();
  const key = normalizeHeader(raw);
  if (!key) return null;
  if (NON_PAYMENT_STATES.has(key)) {
    return NON_PAYMENT_DISPLAY[key] || raw.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return null;
}

export default function MensualidadesPage() {
  const {
    movimientosVersion,
    getMensualidadesResumen,
    getConfiguracion,
    updateConfiguracion,
    addMensualidad,
    updateMensualidad,
    deleteMovimiento,
    personas,
    movimientos,
    getConceptosByType,
    reloadData,
  } = useData();
  const importInputRef = useRef(null);
  const clickTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const [year, setYear] = useState(DEFAULT_YEAR);
  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState("");
  const [formError, setFormError] = useState("");
  const [monthlyFeeForm, setMonthlyFeeForm] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportReviewOpen, setIsImportReviewOpen] = useState(false);
  const [importState, setImportState] = useState(null);
  const [editingMensualidad, setEditingMensualidad] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm(DEFAULT_YEAR));
  const [searchPersona, setSearchPersona] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [monthFilter, setMonthFilter] = useState("TODOS");
  const [sortBy, setSortBy] = useState("NOMBRE_ASC");

  const loadResumen = useCallback(
    async (targetYear = year, options = {}) => {
      const silent = Boolean(options.silent);

      if (!silent) {
        setLoadingResumen(true);
      }
      setErrorResumen("");

      try {
        const data = await getMensualidadesResumen(targetYear);
        setResumen(data);
      } catch (error) {
        setErrorResumen(error?.message || "No se pudo cargar el resumen de mensualidades");
      } finally {
        if (!silent) {
          setLoadingResumen(false);
        }
      }
    },
    [getMensualidadesResumen, year],
  );

  const refreshResumen = useCallback(
    (targetYear = year) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void loadResumen(targetYear, { silent: true });
      }, 180);
    },
    [loadResumen, year],
  );

  useEffect(() => {
    loadResumen(year);
  }, [loadResumen, year]);

  useEffect(() => {
    if (movimientosVersion > 0) {
      refreshResumen(year);
    }
  }, [movimientosVersion, refreshResumen, year]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConfiguracion();
        setMonthlyFeeForm(String(config?.mensualidadGeneral || ""));
      } catch {
        setMonthlyFeeForm("");
      }
    };

    loadConfig();
  }, [getConfiguracion]);

  useEffect(() => () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const months = resumen?.months || MONTHS;
  const rows = resumen?.rows || [];
  const monthlyFee = Number(resumen?.monthlyFee || 25000);
  const stats = resumen?.stats || { paidCount: 0, pendingCount: 0, exemptCount: 0, totalPaid: 0 };
  const monthlyConceptId = Number(getConceptosByType("MENSUALIDAD")?.[0]?.id || 0);

  const filteredRows = useMemo(() => {
    const query = searchPersona.trim().toLowerCase();
    const selectedMonth = monthFilter === "TODOS" ? null : Number(monthFilter);

    return rows.filter((row) => {
      if (query && !String(row.persona.nombre || "").toLowerCase().includes(query)) return false;
      if (statusFilter === "TODOS" && !selectedMonth) return true;

      const cells = selectedMonth ? row.cells.filter((cell) => Number(cell.month.key) === selectedMonth) : row.cells;
      if (!cells.length) return false;
      if (statusFilter === "TODOS") return true;

      return cells.some((cell) => {
        const isExempt = String(cell.status || "").toUpperCase() === "EXCENTO";
        const paid = Number(cell.totalPaid || 0);
        const isPartial = paid > 0 && paid < monthlyFee;
        const isComplete = paid >= monthlyFee;

        if (statusFilter === "PAGADO") return isComplete;
        if (statusFilter === "PARCIAL") return isPartial;
        if (statusFilter === "EXCENTO") return isExempt;
        return paid === 0;
      });
    });
  }, [rows, searchPersona, statusFilter, monthFilter, monthlyFee]);

  const visibleRows = useMemo(() => {
    const rowsCopy = [...filteredRows];

    const sorters = {
      NOMBRE_ASC: (left, right) => left.persona.nombre.localeCompare(right.persona.nombre, "es"),
      NOMBRE_DESC: (left, right) => right.persona.nombre.localeCompare(left.persona.nombre, "es"),
      TOTAL_DESC: (left, right) => Number(right.rowTotal || 0) - Number(left.rowTotal || 0),
      TOTAL_ASC: (left, right) => Number(left.rowTotal || 0) - Number(right.rowTotal || 0),
      PENDIENTES_DESC: (left, right) => countCellsByStatus(right, "PENDIENTE") - countCellsByStatus(left, "PENDIENTE"),
      EXENTAS_DESC: (left, right) => countCellsByStatus(right, "EXCENTO") - countCellsByStatus(left, "EXCENTO"),
    };

    rowsCopy.sort(sorters[sortBy] || sorters.NOMBRE_ASC);
    return rowsCopy;
  }, [filteredRows, sortBy]);

  const totalDeTotales = useMemo(() => visibleRows.reduce((sum, row) => sum + Number(row.rowTotal || 0), 0), [visibleRows]);

  const openDialog = useCallback(
    (persona, month, latestPayment = null) => {
      setFormError("");
      setSelectedCell({ persona, month });
      setEditingMensualidad(latestPayment);
      const existingExemptState = extractNonPaymentStateFromObservacion(latestPayment?.observacion);
      setFormData({
        personaId: String(persona.id),
        mes: String(month.key),
        anio: String(year),
        monto: latestPayment ? String(latestPayment.valor ?? latestPayment.monto ?? "") : String(monthlyFee || ""),
        exentoPago: Boolean(existingExemptState),
        motivoExento: existingExemptState ? normalizeHeader(existingExemptState) : "viaje",
      });
      setIsDialogOpen(true);
    },
    [monthlyFee, year],
  );

  const handleQuickPay = useCallback(
    async (persona, month, latestPayment = null) => {
      setFormError("");

      if (!monthlyConceptId) {
        setFormError("No hay conceptos de mensualidad disponibles");
        return;
      }

      const payload = {
        personaId: Number(persona.id),
        mes: Number(month.key),
        anio: Number(year),
        monto: monthlyFee,
        observacion: `Pago automático de mensualidad ${monthLabel(month.key)} ${year}`,
      };

      try {
        if (latestPayment) {
          await updateMensualidad(latestPayment.id, payload);
        } else {
          await addMensualidad(payload);
        }

        refreshResumen(year);
      } catch (error) {
        setFormError(error?.response?.data?.error || error?.message || "No se pudo registrar el pago automático");
      }
    },
    [addMensualidad, monthlyConceptId, monthlyFee, refreshResumen, updateMensualidad, year],
  );

  const handleCellClick = useCallback(
    (persona, month, latestPayment = null) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }

      clickTimerRef.current = setTimeout(() => {
        openDialog(persona, month, latestPayment);
        clickTimerRef.current = null;
      }, 220);
    },
    [openDialog],
  );

  const handleCellDoubleClick = useCallback(
    (persona, month, latestPayment = null) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      handleQuickPay(persona, month, latestPayment);
    },
    [handleQuickPay],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.personaId || !formData.mes || !formData.anio || (!formData.exentoPago && !formData.monto)) {
      setFormError("Completa persona, mes, año y monto antes de guardar");
      return;
    }

    setIsSaving(true);

    const payload = {
      personaId: Number(formData.personaId),
      mes: Number(formData.mes),
      anio: Number(formData.anio),
      monto: formData.exentoPago ? 0 : Number(formData.monto),
      observacion: formData.exentoPago
        ? `EXENTO: ${String(formData.motivoExento || "viaje").toUpperCase()}`
        : `Mensualidad ${monthLabel(Number(formData.mes))} ${formData.anio}`,
    };

    try {
      if (editingMensualidad) {
        await updateMensualidad(editingMensualidad.id, payload);
      } else {
        await addMensualidad(payload);
      }

      refreshResumen(year);
      setIsDialogOpen(false);
    } catch (submitError) {
      setFormError(submitError?.response?.data?.error || submitError?.message || "No se pudo guardar la mensualidad");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMensualidad) return;

    try {
      await deleteMovimiento(editingMensualidad.id);
      refreshResumen(year);
      setIsDialogOpen(false);
    } catch (error) {
      setFormError(error?.response?.data?.error || error?.message || "No se pudo eliminar la mensualidad");
    }
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    setIsConfigSaving(true);

    if (!monthlyFeeForm || Number(monthlyFeeForm) <= 0) {
      setFormError("El precio de la mensualidad debe ser mayor a 0");
      setIsConfigSaving(false);
      return;
    }

    try {
      const config = await updateConfiguracion({ mensualidadGeneral: Number(monthlyFeeForm) });
      setMonthlyFeeForm(String(config?.mensualidadGeneral || monthlyFeeForm));
      refreshResumen(year);
      setIsConfigOpen(false);
      setFormError("");
    } finally {
      setIsConfigSaving(false);
    }
  };

  const handleExportExcel = () => {
    const workbook = buildMensualidadesWorkbook({
      year,
      rows,
      monthlyFee,
      stats,
    });

    downloadWorkbook(workbook, `mensualidades-${year}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const workbook = buildMensualidadesTemplateWorkbook();
    downloadWorkbook(workbook, "plantilla-importacion-mensualidades.xlsx");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    setFormError("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("El archivo no contiene hojas para importar");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const sheetMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!sheetRows.length) {
        throw new Error("La hoja seleccionada está vacía");
      }

      if (!monthlyConceptId) {
        throw new Error("No hay un concepto de mensualidad configurado");
      }

      const plan = buildMensualidadImportPlan({
        sheetRows,
        sheetMatrix,
        sheetName: firstSheetName,
        personas,
        movimientos,
        defaultYear: year,
        monthlyFee,
      });

      setImportState({
        fileName: file.name,
        sheetName: firstSheetName,
        ...plan,
      });
      setIsImportReviewOpen(true);
    } catch (error) {
      setFormError(error?.response?.data?.error || error?.message || "No se pudo leer el archivo de Excel");
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importState?.records?.length) {
      setFormError("No hay filas válidas para importar");
      return;
    }

    setIsImporting(true);
    setFormError("");

    try {
        // Create any missing personas first on-the-fly, reusing created IDs to avoid duplicates.
        const createdPersonByName = new Map();

        for (const record of importState.records) {
          if (record.newPersona) {
            const nameKey = normalizeHeader(record.newPersona.nombre);
            if (createdPersonByName.has(nameKey)) {
              record.payload.personaId = createdPersonByName.get(nameKey);
            } else {
              // create persona with empty telefono
              const resp = await api.post("/personas", {
                nombre: record.newPersona.nombre,
                telefono: record.newPersona.telefono || null,
                activa: true,
              });
              const created = resp.data;
              const createdId = created?.id ?? created?.data?.id ?? null;
              if (!createdId) {
                throw new Error(`No se pudo crear persona ${record.newPersona.nombre}`);
              }

              record.payload.personaId = Number(createdId);
              createdPersonByName.set(nameKey, Number(createdId));
            }
          }

          // Ensure payload has conceptoId for mensualidad imports and a default tipo.
          if (!record.payload.conceptoId) {
            record.payload.conceptoId = monthlyConceptId || record.payload.conceptoId || null;
          }
          if (!record.payload.tipo) {
            record.payload.tipo = record.payload.tipo || "INGRESO";
          }

          if (!record.payload.conceptoId) {
            throw new Error("Debes seleccionar un concepto de mensualidad en la configuración antes de importar.");
          }

          const payloadToSend = {
            ...record.payload,
            valor: Number(record.payload.valor ?? record.payload.monto ?? record.amount ?? 0),
          };
          delete payloadToSend.monto;

          if (record.method === "update") {
            await api.put(`/movimientos/${record.id}`, payloadToSend);
          } else {
            await api.post("/movimientos", payloadToSend);
          }
        }

      await reloadData();
      refreshResumen(year);
      setIsImportReviewOpen(false);
      setImportState(null);
    } catch (error) {
      setFormError(error?.response?.data?.error || error?.message || "No se pudo importar el Excel");
    } finally {
      setIsImporting(false);
    }
  };

  if (loadingResumen) {
    return <StatusState title="Cargando mensualidades..." description="Leyendo el resumen calculado en el backend." />;
  }

  if (errorResumen) {
    return <StatusState title="No se pudieron cargar las mensualidades" description={errorResumen} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-700">Mensualidades</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Control grande, simple y rápido</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Vista pensada para usarse sin esfuerzo en celular o computadora. Un clic abre el detalle y un doble clic registra el pago automático del mes.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
              <Zap className="h-4 w-4" />
              Doble clic en un mes = pago automático completo
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MiniCard label="Pagadas" value={stats.paidCount} valueClassName="text-emerald-600" />
            <MiniCard label="Pendientes" value={Math.max(stats.pendingCount, 0)} valueClassName="text-amber-600" />
            <MiniCard label="Exentas" value={stats.exemptCount || 0} valueClassName="text-sky-600" />
            <MiniCard label="Monto pagado" value={formatCurrency(stats.totalPaid)} valueClassName="text-sky-600" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            <span>Año</span>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value || DEFAULT_YEAR))}
              className="w-40 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-2xl font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={handleExportExcel} icon={Download}>
              Exportar Excel
            </ActionButton>
            <ActionButton onClick={handleDownloadTemplate} icon={CheckCircle2}>
              Descargar plantilla
            </ActionButton>
            <ActionButton onClick={handleImportClick} icon={Upload} disabled={isImporting}>
              {isImporting ? "Procesando..." : "Importar Excel"}
            </ActionButton>
            <ActionButton onClick={() => setIsConfigOpen(true)} icon={Smartphone}>
              Configuración
            </ActionButton>
          </div>
        </div>

        <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileChange} />
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5 md:gap-4 md:p-5">
        <input
          value={searchPersona}
          onChange={(event) => setSearchPersona(event.target.value)}
          placeholder="Buscar persona..."
          ref={searchInputRef}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PAGADO">Pagado</option>
          <option value="PARCIAL">Parcial</option>
          <option value="EXCENTO">Exento</option>
          <option value="PENDIENTE">No pagado</option>
        </select>
        <select
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <option value="TODOS">Todos los meses</option>
          {months.map((month) => (
            <option key={month.key} value={String(month.key)}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <option value="NOMBRE_ASC">Orden: nombre A-Z</option>
          <option value="NOMBRE_DESC">Orden: nombre Z-A</option>
          <option value="TOTAL_DESC">Orden: total mayor</option>
          <option value="TOTAL_ASC">Orden: total menor</option>
          <option value="PENDIENTES_DESC">Orden: más pendientes</option>
          <option value="EXENTAS_DESC">Orden: más exentas</option>
        </select>
        <div className="flex items-center justify-end rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 md:text-base">
          {filteredRows.length} persona(s)
        </div>
      </section>

      {formError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pagos por mes</h2>
              <p className="text-sm text-slate-500">Doble clic paga automáticamente. Un clic abre el detalle.</p>
            </div>
            <p className="text-sm font-medium text-slate-500">Verde = completado, ámbar = parcial, gris = pendiente</p>
          </div>
        </div>

        <div className="md:hidden">
          <div className="space-y-4 p-4 sm:p-5">
            {visibleRows.map((row) => (
              <article key={row.persona.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Persona</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">{row.persona.nombre}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Total</p>
                    <div className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(row.rowTotal)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {row.cells.map((cell) => {
                    const paid = Number(cell.totalPaid || 0);
                    const remaining = Number(cell.remaining ?? monthlyFee) || 0;
                    const latestPayment = cell.latestPayment || null;
                    const cellStatus = String(cell.status || "").toUpperCase();
                    const isExempt = cellStatus === "EXCENTO";
                    const isPartial = paid > 0 && paid < monthlyFee;
                    const isComplete = paid >= monthlyFee;
                    const nonPaymentState = extractNonPaymentStateFromObservacion(latestPayment?.observacion || cell.status);

                    return (
                      <button
                        key={`${row.persona.id}-${cell.month.key}`}
                        type="button"
                        title="Un clic abre el detalle. Doble clic paga automáticamente."
                        onClick={() => handleCellClick(row.persona, cell.month, latestPayment)}
                        onDoubleClick={() => handleCellDoubleClick(row.persona, cell.month, latestPayment)}
                        className={[
                          "flex min-h-24 w-full flex-col justify-between rounded-2xl border p-3 text-left transition",
                          isComplete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isExempt
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                            : isPartial
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-dashed border-slate-200 bg-white text-slate-500",
                        ].join(" ")}
                      >
                          <div className="flex items-start justify-between gap-2">
                          <span className="text-base font-black">{cell.month.label}</span>
                          {nonPaymentState ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                              {nonPaymentState}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                              {isComplete ? "OK" : isPartial ? "Parcial" : "Pend."}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-1 text-xs font-semibold">
                          {nonPaymentState ? (
                            <p className="text-rose-700 font-semibold">Estado: {nonPaymentState}</p>
                          ) : isExempt ? (
                            <>
                              <p className="font-semibold">Exento de pago</p>
                              <p className="text-sky-700/80">No genera saldo pendiente</p>
                            </>
                          ) : paid > 0 ? (
                            <>
                              <p>Abonado {formatCurrency(paid)}</p>
                              <p className={isComplete ? "text-emerald-700/80" : "text-amber-700/80"}>Falta {formatCurrency(remaining)}</p>
                            </>
                          ) : (
                            <>
                              <p>Pendiente</p>
                              <p className="text-slate-400">Falta {formatCurrency(monthlyFee)}</p>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Total de totales</p>
              <div className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(totalDeTotales)}</div>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] border-separate border-spacing-0 text-base">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left font-bold">Persona</th>
                  {months.map((month) => (
                    <th key={month.key} className="border-b border-slate-200 px-3 py-4 text-center font-bold">
                      {month.label}
                    </th>
                  ))}
                  <th className="border-b border-l border-slate-200 px-5 py-4 text-center font-bold">Total</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.persona.id} className="hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-4 font-semibold text-slate-900">
                      {row.persona.nombre}
                    </td>

                    {row.cells.map((cell) => {
                      const paid = Number(cell.totalPaid || 0);
                      const remaining = Number(cell.remaining ?? monthlyFee) || 0;
                      const latestPayment = cell.latestPayment || null;
                      const cellStatus = String(cell.status || "").toUpperCase();
                      const isExempt = cellStatus === "EXCENTO";
                      const isPartial = paid > 0 && paid < monthlyFee;
                      const isComplete = paid >= monthlyFee;
                      const nonPaymentState = extractNonPaymentStateFromObservacion(latestPayment?.observacion || cell.status);

                      return (
                        <td key={`${row.persona.id}-${cell.month.key}`} className="border-b border-slate-200 px-2 py-2">
                          <button
                            type="button"
                            title="Un clic abre el detalle. Doble clic paga automáticamente."
                            onClick={() => handleCellClick(row.persona, cell.month, latestPayment)}
                            onDoubleClick={() => handleCellDoubleClick(row.persona, cell.month, latestPayment)}
                            className={[
                              "flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-3 text-center text-sm font-bold transition",
                              isComplete
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : isExempt
                                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                : isPartial
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-dashed border-slate-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-700",
                            ].join(" ")}
                          >
                            <span className="text-base font-black">{cell.month.label}</span>
                            {nonPaymentState ? (
                              <span className="text-xs font-semibold uppercase rounded-full bg-rose-50 px-2 py-1 text-rose-700">{nonPaymentState}</span>
                            ) : isExempt ? (
                              <span className="text-xs font-semibold uppercase rounded-full bg-sky-50 px-2 py-1 text-sky-700">Exento</span>
                            ) : paid > 0 ? (
                              <>
                                <span>Abonado {formatCurrency(paid)}</span>
                                <span className={isComplete ? "text-emerald-700/80" : "text-amber-700/80"}>Falta {formatCurrency(remaining)}</span>
                              </>
                            ) : (
                              <>
                                <span>Pendiente</span>
                                <span className="text-slate-400">Falta {formatCurrency(monthlyFee)}</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    <td className="border-b border-l border-slate-200 px-5 py-4 text-center text-lg font-black text-slate-900">
                      {formatCurrency(row.rowTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100">
                  <td className="sticky left-0 z-10 border-t border-r border-slate-200 bg-slate-100 px-5 py-4 text-left text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                    Total de totales
                  </td>
                  {months.map((month) => (
                    <td key={month.key} className="border-t border-slate-200 px-2 py-4 text-center text-slate-400">
                      ·
                    </td>
                  ))}
                  <td className="border-t border-l border-slate-200 px-5 py-4 text-center text-xl font-black text-slate-900">
                    {formatCurrency(totalDeTotales)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-700 md:hidden"
      >
        <Search className="h-4 w-4" />
        Buscar
      </button>

      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingMensualidad ? "Editar mensualidad" : "Registrar mensualidad"}
        description={selectedCell ? `${selectedCell.persona.nombre} · ${monthLabel(selectedCell.month.key)} ${year}` : ""}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Persona" value={selectedCell?.persona.nombre || ""} disabled />
            <Field label="Mes" value={monthLabel(Number(formData.mes))} disabled />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Año" value={formData.anio} onChange={(value) => setFormData({ ...formData, anio: value })} type="number" required />
            <Field
              label="Monto"
              value={formData.exentoPago ? "0" : formData.monto}
              onChange={(value) => setFormData({ ...formData, monto: value })}
              type="number"
              step="0.01"
              required={!formData.exentoPago}
              disabled={formData.exentoPago}
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(formData.exentoPago)}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  exentoPago: event.target.checked,
                  monto: event.target.checked ? "0" : current.monto || String(monthlyFee || ""),
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Exento de pago
          </label>

          {formData.exentoPago ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Motivo</span>
              <select
                value={formData.motivoExento}
                onChange={(event) => setFormData({ ...formData, motivoExento: event.target.value })}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="viaje">Viaje</option>
                <option value="incapacidad">Incapacidad</option>
              </select>
            </label>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div>{editingMensualidad ? <DangerButton onClick={handleDelete}>Eliminar</DangerButton> : null}</div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">
                {isSaving ? "Guardando..." : editingMensualidad ? "Guardar cambios" : "Registrar"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configuración de mensualidad" description="Ajusta el precio base de la mensualidad">
        <form onSubmit={handleSaveConfig} className="grid gap-4">
          <Field label="Precio mensualidad" type="number" step="0.01" value={monthlyFeeForm} onChange={(value) => setMonthlyFeeForm(value)} required />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsConfigOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={isConfigSaving} className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">
              {isConfigSaving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isImportReviewOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportReviewOpen(false);
          }
        }}
        title="Revisar importación de Excel"
        description={importState ? `${importState.fileName} · ${importState.sheetName}` : ""}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryPill label="Filas leídas" value={importState?.totalRows || 0} />
            <SummaryPill label="Importables" value={importState?.records?.length || 0} />
            <SummaryPill label="Con error" value={importState?.errors?.length || 0} />
          </div>

          {importState?.errors?.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Algunas filas no se importarán
              </div>
              <ul className="mt-3 space-y-1">
                {importState.errors.slice(0, 6).map((error) => (
                  <li key={`${error.rowNumber}-${error.message}`}>Fila {error.rowNumber}: {error.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {importState?.skippedStates?.length ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Algunos estados se importarán como exentos de pago
              </div>
              <p className="mt-2 text-xs text-sky-700">Las filas marcadas como viaje/incapacidad se crearán con monto 0 y observación EXENTO. También puedes marcarlas manualmente desde el mes.</p>
              <ul className="mt-3 space-y-1">
                {importState.skippedStates.slice(0, 12).map((s, idx) => (
                  <li key={`${s.rowNumber || idx}-${s.personaName || s.monthLabel}`}>Fila {s.rowNumber || "?"}: {s.personaName} · {s.monthLabel || ""} — {s.state}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <span>Vista previa</span>
              <span>{importState?.records?.length || 0} registro(s)</span>
            </div>

            <div className="max-h-72 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Persona</th>
                    <th className="px-4 py-3 text-left font-semibold">Mes</th>
                    <th className="px-4 py-3 text-left font-semibold">Año</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                    <th className="px-4 py-3 text-left font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(importState?.records || []).slice(0, 8).map((record) => (
                    <tr key={`${record.personaName}-${record.year}-${record.monthNumber}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{record.personaName}</td>
                      <td className="px-4 py-3 text-slate-600">{record.monthLabel}</td>
                      <td className="px-4 py-3 text-slate-600">{record.year}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(record.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{record.method === "update" ? "Actualizar" : "Crear"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsImportReviewOpen(false)} disabled={isImporting} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmImport} disabled={isImporting || !importState?.records?.length} className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">
              {isImporting ? "Importando..." : "Importar filas válidas"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function createEmptyForm(year) {
  return { personaId: "", mes: "", anio: String(year), monto: "", exentoPago: false, motivoExento: "viaje" };
}

function monthLabel(monthNumber) {
  const month = MONTHS.find((entry) => Number(entry.key) === Number(monthNumber));
  return month?.label || "";
}

function countCellsByStatus(row, status) {
  return (row?.cells || []).filter((cell) => String(cell.status || "").toUpperCase() === String(status || "").toUpperCase()).length;
}

function MiniCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className={`mt-2 text-3xl font-black tracking-tight ${valueClassName}`}>{value}</div>
    </div>
  );
}

function ActionButton({ children, onClick, icon: Icon, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function DangerButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-rose-200 px-4 py-3 font-semibold text-rose-600 transition hover:bg-rose-50">
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text", step, disabled = false, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        disabled={disabled}
        required={required}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function StatusState({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

function buildMensualidadesWorkbook({ year, rows, monthlyFee, stats }) {
  const workbook = XLSX.utils.book_new();

  const exportRows = rows.flatMap((row) =>
    row.cells.map((cell) => {
      const paid = Number(cell.totalPaid || 0);
      const remaining = Number(cell.remaining ?? monthlyFee) || 0;

      return {
        Persona: row.persona.nombre,
        Mes: cell.month.label,
        MesNumero: cell.month.key,
        Año: year,
        Estado: cell.status,
        Pagado: paid,
        Falta: remaining,
        Mensualidad: monthlyFee,
        TotalAnual: row.rowTotal,
        Observacion: cell.latestPayment?.observacion || "",
      };
    }),
  );

  const exportSheet = XLSX.utils.json_to_sheet(exportRows);
  exportSheet["!cols"] = [
    { wch: 28 },
    { wch: 10 },
    { wch: 11 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(workbook, exportSheet, "Mensualidades");

  const statsSheet = XLSX.utils.json_to_sheet([
    { Concepto: "Año", Valor: year },
    { Concepto: "Mensualidad base", Valor: monthlyFee },
    { Concepto: "Pagadas", Valor: stats.paidCount },
    { Concepto: "Pendientes", Valor: stats.pendingCount },
    { Concepto: "Monto pagado", Valor: stats.totalPaid },
    { Concepto: "Monto esperado", Valor: stats.totalExpected },
  ]);
  statsSheet["!cols"] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, statsSheet, "Resumen");

  const formatSheet = createWideMensualidadesSheet({ year, rows, monthlyFee });
  XLSX.utils.book_append_sheet(workbook, formatSheet, `AERORUMBA ${year}`);

  const templateSheet = createTemplateSheet();
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Plantilla_Importar");

  return workbook;
}

function buildMensualidadesTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, createTemplateSheet(), "Plantilla_Importar");
  return workbook;
}

function createTemplateSheet() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Persona", "Mes", "Año", "Monto", "Observacion"],
    ["Maria Perez", "Ene", DEFAULT_YEAR, 25000, "Pago de mensualidad"],
    ["Maria Perez", 2, DEFAULT_YEAR, 25000, "Pago de mensualidad"],
  ]);

  sheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 28 }];
  return sheet;
}

function createWideMensualidadesSheet({ year, rows, monthlyFee }) {
  const headerRows = [
    ["♫  AERORUMBA  ♫"],
    [`SINTRAMUNICIPIO YUMBO ${year}`],
    ["N°", "APELLIDO", "NOMBRES", ...MONTHS.map((month) => monthHeaderLabel(month.key)), "TOTAL AÑO"],
  ];

  const bodyRows = rows.map((row, index) => {
    const nameParts = splitPersonName(row.persona.nombre);
    const rowByMonth = new Map(row.cells.map((cell) => [Number(cell.month.key), cell]));

    return [
      index + 1,
      nameParts.apellido,
      nameParts.nombres,
      ...MONTHS.map((month) => {
        const cell = rowByMonth.get(month.key);
        const paid = Number(cell?.totalPaid || 0);
        return paid > 0 ? paid : "";
      }),
      row.rowTotal || 0,
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([...headerRows, ...bodyRows]);
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 26 },
    ...MONTHS.map(() => ({ wch: 11 })),
    { wch: 14 },
  ];

  return sheet;
}

function downloadWorkbook(workbook, filename) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMensualidadImportPlan({ sheetRows, sheetMatrix, sheetName, personas, movimientos, defaultYear, monthlyFee }) {
  const recordsByKey = new Map();
  const errors = [];
  const skippedStates = [];

  const wideSheetPlan = buildMensualidadImportPlanFromWideSheet({
    sheetMatrix,
    sheetName,
    personas,
    movimientos,
    defaultYear,
    monthlyFee,
    recordsByKey,
    errors,
    skippedStates,
  });

  if (wideSheetPlan.detected) {
    const plan = finalizeImportPlan(recordsByKey, errors, sheetRows.length);
    plan.skippedStates = skippedStates;
    return plan;
  }

  sheetRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = normalizeSheetRow(rawRow);

    const personaName = pickRowValue(row, ["persona", "nombre", "nombrecompleto", "persona completo", "persona completa"]);
    const monthValue = pickRowValue(row, ["mes", "month"]);
    const yearValue = pickRowValue(row, ["anio", "año", "year"]);
    const amountValue = pickRowValue(row, ["monto", "valor", "importe", "pago", "abono"]);
    const noteValue = pickRowValue(row, ["observacion", "observaciones", "nota", "detalle"]);
    const stateValue = normalizeHeader(pickRowValue(row, ["estado", "status"]));

    if (!personaName) {
      errors.push({ rowNumber, message: "Falta la persona" });
      return;
    }

    const persona = resolvePersonaByName(personas, personaName);
    if (!persona) {
      errors.push({ rowNumber, message: `No encontré a ${personaName}` });
      return;
    }

    const monthNumber = parseMonthValue(monthValue);
    if (!monthNumber) {
      errors.push({ rowNumber, message: "Mes inválido" });
      return;
    }

    const year = Number(yearValue || defaultYear);
    if (!Number.isFinite(year)) {
      errors.push({ rowNumber, message: "Año inválido" });
      return;
    }

    const amount = parseMoneyValue(amountValue);
    const normalizedAmount = Number.isFinite(amount) ? amount : monthlyFee;
    const statusIsPaid = ["pagado", "completo", "completado", "cancelado"].includes(stateValue);
    const isNonPayment = NON_PAYMENT_STATES.has(stateValue);

    if (isNonPayment) {
      const exemptLabel = NON_PAYMENT_DISPLAY[stateValue] || stateValue;
      const currentPayment = findMensualidadMovimiento({ movimientos, personaId: persona.id, month: monthNumber, year });
      const key = `${persona.id}-${monthNumber}-${year}`;

      recordsByKey.set(key, {
        method: currentPayment ? "update" : "create",
        id: currentPayment?.id || null,
        personaName: persona.nombre,
        monthNumber,
        monthLabel: monthLabel(monthNumber),
        year,
        amount: 0,
        payload: {
          personaId: Number(persona.id),
          mes: monthNumber,
          anio: year,
          monto: 0,
          observacion: `EXENTO: ${exemptLabel.toUpperCase()}${noteValue ? ' · ' + noteValue : ''}`,
        },
      });

      skippedStates.push({ rowNumber, personaName, state: exemptLabel });
      return;
    }

    const finalAmount = amount ?? (statusIsPaid ? monthlyFee : normalizedAmount);
    const currentPayment = findMensualidadMovimiento({ movimientos, personaId: persona.id, month: monthNumber, year });
    const key = `${persona.id}-${monthNumber}-${year}`;

    recordsByKey.set(key, {
      method: currentPayment ? "update" : "create",
      id: currentPayment?.id || null,
      personaName: persona.nombre,
      monthNumber,
      monthLabel: monthLabel(monthNumber),
      year,
      amount: finalAmount,
      payload: {
        personaId: Number(persona.id),
        mes: monthNumber,
        anio: year,
        monto: finalAmount,
        observacion: noteValue || `Importado desde Excel: ${monthLabel(monthNumber)} ${year}`,
      },
    });
  });

  const records = Array.from(recordsByKey.values()).sort((left, right) => {
    const personComparison = left.personaName.localeCompare(right.personaName, "es");
    if (personComparison !== 0) {
      return personComparison;
    }

    if (left.year !== right.year) {
      return left.year - right.year;
    }

    return left.monthNumber - right.monthNumber;
  });

  return {
    records,
    errors,
    skippedStates,
    totalRows: sheetRows.length,
    validRows: records.length,
    invalidRows: errors.length,
  };
}

function buildMensualidadImportPlanFromWideSheet({ sheetMatrix, sheetName, personas, movimientos, defaultYear, monthlyFee, recordsByKey, errors, skippedStates }) {
  const headerRowIndex = findWideHeaderRowIndex(sheetMatrix);

  if (headerRowIndex === -1) {
    return { detected: false };
  }

  const headerRow = sheetMatrix[headerRowIndex].map((value) => normalizeHeader(value));
  const apellidoIndex = headerRow.indexOf("apellido");
  const nombresIndex = headerRow.indexOf("nombres");
  if (apellidoIndex === -1 || nombresIndex === -1) {
    return { detected: false };
  }

  const monthColumns = headerRow
    .map((header, columnIndex) => ({ header, columnIndex }))
    .map((entry) => ({ ...entry, monthNumber: parseMonthHeader(entry.header) }))
    .filter((entry) => Boolean(entry.monthNumber));

  if (!monthColumns.length) {
    return { detected: false };
  }

  const yearFromSheet = extractYearFromText(sheetName) || defaultYear;

  for (let rowIndex = headerRowIndex + 1; rowIndex < sheetMatrix.length; rowIndex += 1) {
    const rawRow = sheetMatrix[rowIndex] || [];
    const rowNumber = rowIndex + 1;
    const apellido = String(rawRow[apellidoIndex] ?? "").trim();
    const nombres = String(rawRow[nombresIndex] ?? "").trim();

    if (!apellido && !nombres) {
      continue;
    }

    const fullName = `${apellido} ${nombres}`.trim();
    const swappedName = `${nombres} ${apellido}`.trim();

    let persona =
      resolvePersonaByName(personas, fullName) ||
      resolvePersonaByName(personas, swappedName) ||
      resolvePersonaByName(personas, nombres) ||
      resolvePersonaByName(personas, apellido);

    // If still not found, we'll create the persona during import. Build a normalized "nombre" with
    // first names followed by last names (the app expects `nombre` as "Nombres Apellidos").
    const newPersonaName = swappedName || fullName || nombres || apellido;

    monthColumns.forEach(({ columnIndex, monthNumber }) => {
      const cellValue = rawRow[columnIndex];
      if (cellValue === null || cellValue === undefined || String(cellValue).trim() === "") {
        return;
      }

      const amount = parseMoneyValue(cellValue);
      // If amount is not numeric, check if cell contains a recognized non-payment state.
      if (!Number.isFinite(amount)) {
        const normalized = normalizeHeader(String(cellValue));
        if (NON_PAYMENT_STATES.has(normalized)) {
          const exemptLabel = NON_PAYMENT_DISPLAY[normalized] || normalized;
          const currentPayment = persona ? findMensualidadMovimiento({ movimientos, personaId: persona.id, month: monthNumber, year: yearFromSheet }) : null;
          const personaIdForKey = persona ? String(persona.id) : `new-${rowIndex}`;
          const key = `${personaIdForKey}-${monthNumber}-${yearFromSheet}`;

          recordsByKey.set(key, {
            method: currentPayment ? "update" : "create",
            id: currentPayment?.id || null,
            personaName: persona ? persona.nombre : newPersonaName,
            monthNumber,
            monthLabel: monthLabel(monthNumber),
            year: yearFromSheet,
            amount: 0,
            payload: {
              personaId: persona ? Number(persona.id) : null,
              mes: monthNumber,
              anio: yearFromSheet,
              monto: 0,
              observacion: `EXENTO: ${exemptLabel.toUpperCase()}`,
            },
            newPersona: persona ? null : { nombre: newPersonaName, telefono: "" },
          });

          skippedStates.push({ rowNumber, personaName: persona ? persona.nombre : newPersonaName, monthLabel: monthLabel(monthNumber), state: exemptLabel });
          return;
        }

        errors.push({ rowNumber, message: `Monto inválido en ${monthLabel(monthNumber)}` });
        return;
      }

      // If persona was not found, create a temporary entry that indicates a new persona must be created
      // before posting the movimiento. Use a unique temp key to avoid collisions.
      const personaIdForKey = persona ? String(persona.id) : `new-${rowIndex}`;
      const currentPayment = persona ? findMensualidadMovimiento({ movimientos, personaId: persona.id, month: monthNumber, year: yearFromSheet }) : null;
      const key = `${personaIdForKey}-${monthNumber}-${yearFromSheet}`;

      recordsByKey.set(key, {
        method: currentPayment ? "update" : "create",
        id: currentPayment?.id || null,
        personaName: persona ? persona.nombre : newPersonaName,
        monthNumber,
        monthLabel: monthLabel(monthNumber),
        year: yearFromSheet,
        amount,
        // If persona exists, payload contains personaId; otherwise we'll create the persona when
        // importing and fill `payload.personaId` with the created id.
        payload: {
          personaId: persona ? Number(persona.id) : null,
          mes: monthNumber,
          anio: yearFromSheet,
          monto: amount,
          observacion: `Importado desde ${sheetName || "Excel"} · ${monthLabel(monthNumber)} ${yearFromSheet}`,
        },
        newPersona: persona ? null : { nombre: newPersonaName, telefono: "" },
      });
    });
  }

  return { detected: true };
}

function finalizeImportPlan(recordsByKey, errors, totalRows) {
  const records = Array.from(recordsByKey.values()).sort((left, right) => {
    const personComparison = left.personaName.localeCompare(right.personaName, "es");
    if (personComparison !== 0) {
      return personComparison;
    }

    if (left.year !== right.year) {
      return left.year - right.year;
    }

    return left.monthNumber - right.monthNumber;
  });

  return {
    records,
    errors,
    totalRows,
    validRows: records.length,
    invalidRows: errors.length,
  };
}

function normalizeSheetRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
}

function pickRowValue(row, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const value = row[normalizedAlias];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function resolvePersonaByName(personas, name) {
  const normalizedName = normalizeHeader(name);
  if (!normalizedName) {
    return null;
  }

  const exactMatches = personas.filter((persona) => normalizeHeader(persona.nombre) === normalizedName);
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const partialMatches = personas.filter((persona) => {
    const normalizedPersona = normalizeHeader(persona.nombre);
    return normalizedPersona.includes(normalizedName) || normalizedName.includes(normalizedPersona);
  });

  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function findMensualidadMovimiento({ movimientos, personaId, month, year }) {
  const matches = movimientos.filter((movimiento) => {
    const isMensualidad = Boolean(
      movimiento.concepto && (movimiento.concepto.tipo === "MENSUALIDAD" || movimiento.concepto.esMensualidad),
    );

    return (
      isMensualidad &&
      Number(movimiento.personaId) === Number(personaId) &&
      Number(movimiento.mes) === Number(month) &&
      Number(movimiento.anio) === Number(year)
    );
  });

  if (!matches.length) {
    return null;
  }

  return matches.sort((left, right) => {
    const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightDate - leftDate;
  })[0];
}

function parseMonthValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }

  const normalized = normalizeHeader(value);
  return MONTH_ALIASES[normalized] || null;
}

function parseMoneyValue(value) {
  if (typeof value === "number") {
    return value;
  }

  const cleaned = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) {
    return null;
  }

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  let normalized = cleaned;

  if (commaCount > 0 && dotCount > 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (commaCount > 0) {
    const parts = cleaned.split(",");
    normalized = parts.length === 2 && parts[1].length === 3 ? parts.join("") : cleaned.replace(",", ".");
  } else if (dotCount > 0) {
    const parts = cleaned.split(".");
    normalized = parts.length === 2 && parts[1].length === 3 ? parts.join("") : cleaned;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function findWideHeaderRowIndex(sheetMatrix) {
  for (let rowIndex = 0; rowIndex < Math.min(sheetMatrix.length, 12); rowIndex += 1) {
    const row = (sheetMatrix[rowIndex] || []).map((value) => normalizeHeader(value));
    if (row.includes("apellido") && row.includes("nombres")) {
      return rowIndex;
    }
  }

  return -1;
}

function parseMonthHeader(value) {
  const normalized = normalizeHeader(value);
  const aliasMap = {
    enero: 1,
    ene: 1,
    febrero: 2,
    feb: 2,
    marzo: 3,
    mar: 3,
    abril: 4,
    abr: 4,
    mayo: 5,
    may: 5,
    junio: 6,
    jun: 6,
    julio: 7,
    jul: 7,
    agosto: 8,
    ago: 8,
    sept: 9,
    sep: 9,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    oct: 10,
    noviembre: 11,
    nov: 11,
    diciembre: 12,
    dic: 12,
  };

  return aliasMap[normalized] || null;
}

function monthHeaderLabel(monthNumber) {
  const labels = {
    1: "ENERO",
    2: "FEBRERO",
    3: "MARZO",
    4: "ABRIL",
    5: "MAYO",
    6: "JUNIO",
    7: "JULIO",
    8: "AGOSTO",
    9: "SEPT.",
    10: "OCTUBRE",
    11: "NOV.",
    12: "DIC",
  };

  return labels[Number(monthNumber)] || "";
}

function extractYearFromText(value) {
  const match = String(value || "").match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function splitPersonName(fullName) {
  const normalized = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { apellido: "", nombres: "" };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { apellido: parts[0], nombres: "" };
  }

  if (parts.length === 2) {
    return { apellido: parts[0], nombres: parts[1] };
  }

  return {
    apellido: parts.slice(0, parts.length - 2).join(" ") || parts[0],
    nombres: parts.slice(-2).join(" "),
  };
}