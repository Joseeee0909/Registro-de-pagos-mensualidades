import { useCallback, useEffect, useState } from "react";

import Modal from "../components/Modal";
import { useData } from "../context/DataContext";
import { formatCurrency } from "../utils/formatters";

const DEFAULT_YEAR = 2026;

export default function MensualidadesPage() {
  const { getMensualidadesResumen, addMensualidad, updateMensualidad, deleteMovimiento } = useData();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMensualidad, setEditingMensualidad] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm(DEFAULT_YEAR));

  const loadResumen = useCallback(
    async (targetYear = year) => {
      setLoadingResumen(true);
      setErrorResumen("");

      try {
        const data = await getMensualidadesResumen(targetYear);
        setResumen(data);
      } catch (error) {
        setErrorResumen(error?.message || "No se pudo cargar el resumen de mensualidades");
      } finally {
        setLoadingResumen(false);
      }
    },
    [getMensualidadesResumen, year],
  );

  useEffect(() => {
    loadResumen(year);
  }, [loadResumen, year]);

  const openDialog = (persona, month, latestPayment = null) => {
    setSelectedCell({ persona, month });
    setEditingMensualidad(latestPayment);
    setFormData({
      personaId: String(persona.id),
      mes: String(month.key),
      anio: String(year),
      monto: latestPayment ? String(latestPayment.valor ?? latestPayment.monto ?? "") : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      personaId: Number(formData.personaId),
      mes: Number(formData.mes),
      anio: Number(formData.anio),
      monto: Number(formData.monto),
      observacion: `Mensualidad ${monthLabel(Number(formData.mes))} ${formData.anio}`,
    };

    try {
      if (editingMensualidad) {
        await updateMensualidad(editingMensualidad.id, payload);
      } else {
        await addMensualidad(payload);
      }

      await loadResumen(year);
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMensualidad) return;

    await deleteMovimiento(editingMensualidad.id);
    await loadResumen(year);
    setIsDialogOpen(false);
  };

  if (loadingResumen) {
    return <StatusState title="Cargando mensualidades..." description="Leyendo el resumen calculado en el backend." />;
  }

  if (errorResumen) {
    return <StatusState title="No se pudieron cargar las mensualidades" description={errorResumen} />;
  }

  const months = resumen?.months || [];
  const rows = resumen?.rows || [];
  const monthlyFee = Number(resumen?.monthlyFee || 25000);
  const stats = resumen?.stats || { paidCount: 0, pendingCount: 0, totalPaid: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mensualidades</h1>
          <p className="mt-1 text-gray-600">Vista tipo Excel calculada por el backend</p>
        </div>

        <label className="grid gap-1 text-sm font-medium text-gray-700">
          <span>Año</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value || DEFAULT_YEAR))}
            className="w-28 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniCard label="Pagadas" value={stats.paidCount} valueClassName="text-green-600" />
        <MiniCard label="Pendientes" value={Math.max(stats.pendingCount, 0)} valueClassName="text-orange-600" />
        <MiniCard label="Monto pagado" value={formatCurrency(stats.totalPaid)} valueClassName="text-blue-600" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Pagos por mes</h2>
          <p className="text-sm text-gray-500">Verde = completado, ámbar = parcial, gris = pendiente</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold">Persona</th>
                {months.map((month) => (
                  <th key={month.key} className="border-b border-gray-200 px-3 py-3 text-center font-semibold">
                    {month.label}
                  </th>
                ))}
                <th className="border-b border-l border-gray-200 px-4 py-3 text-center font-semibold">Total</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.persona.id} className="hover:bg-gray-50/60">
                  <td className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-4 py-3 font-medium text-gray-900">
                    {row.persona.nombre}
                  </td>

                  {row.cells.map((cell) => {
                    const paid = Number(cell.totalPaid || 0);
                    const remaining = Number(cell.remaining || monthlyFee) || 0;
                    const latestPayment = cell.latestPayment || null;
                    const isPartial = paid > 0 && paid < monthlyFee;
                    const isComplete = paid >= monthlyFee;

                    return (
                      <td key={`${row.persona.id}-${cell.month.key}`} className="border-b border-gray-200 px-2 py-2">
                        <button
                          type="button"
                          onClick={() => openDialog(row.persona, cell.month, latestPayment)}
                          className={[
                            "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition",
                            isComplete
                              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              : isPartial
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-dashed border-gray-200 bg-white text-gray-400 hover:border-blue-300 hover:text-blue-600",
                          ].join(" ")}
                        >
                          {paid > 0 ? (
                            <>
                              <span>Abonado {formatCurrency(paid)}</span>
                              <span className={isComplete ? "text-green-700/80" : "text-amber-700/80"}>
                                Falta {formatCurrency(remaining)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span>Pendiente</span>
                              <span className="text-gray-400">Falta {formatCurrency(monthlyFee)}</span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}

                  <td className="border-b border-l border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">
                    {formatCurrency(row.rowTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            <Field label="Monto" value={formData.monto} onChange={(value) => setFormData({ ...formData, monto: value })} type="number" step="0.01" required />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              {editingMensualidad ? (
                <button type="button" onClick={handleDelete} className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? "Guardando..." : editingMensualidad ? "Guardar cambios" : "Registrar"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function createEmptyForm(year) {
  return { personaId: "", mes: "", anio: String(year), monto: "" };
}

function monthLabel(monthNumber) {
  const months = {
    1: "Ene",
    2: "Feb",
    3: "Mar",
    4: "Abr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Ago",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dic",
  };

  return months[Number(monthNumber)] || "";
}

function MiniCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", step, disabled = false, required = false }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        disabled={disabled}
        required={required}
        className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </label>
  );
}

function StatusState({ title, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}