import { useMemo, useState } from "react";

import Modal from "../components/Modal";
import { useData } from "../context/DataContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = new Date().getMonth() + 1;

const MONTH_OPTIONS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export default function MovimientosPage() {
  const { movimientos, personas, conceptos, addMovimiento, updateMovimiento, deleteMovimiento, loading, error } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [ordenFecha, setOrdenFecha] = useState("FECHA_DESC");
  const [formData, setFormData] = useState(createEmptyForm());

  const filteredMovimientos = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = movimientos.filter((movimiento) => {
      const matchTipo = filterTipo === "TODOS" ? true : movimiento.tipo === filterTipo;
      if (!matchTipo) return false;
      if (!query) return true;
      return [movimiento.concepto?.nombre, movimiento.observacion, movimiento.persona?.nombre].some((value) =>
        String(value || "").toLowerCase().includes(query),
      );
    });

    return filtered.sort((a, b) => {
      const aDate = new Date(a.fecha).getTime();
      const bDate = new Date(b.fecha).getTime();
      return ordenFecha === "FECHA_ASC" ? aDate - bDate : bDate - aDate;
    });
  }, [movimientos, filterTipo, search, ordenFecha]);

  const totalIngresos = movimientos.filter((movimiento) => movimiento.tipo === "INGRESO").reduce((sum, movimiento) => sum + Number(movimiento.valor || 0), 0);
  const totalEgresos = movimientos.filter((movimiento) => movimiento.tipo === "EGRESO").reduce((sum, movimiento) => sum + Number(movimiento.valor || 0), 0);
  const balance = totalIngresos - totalEgresos;

  const availableConceptos = useMemo(() => {
    if (formData.tipo === "INGRESO") {
      return conceptos.filter((concepto) => concepto.tipo !== "EGRESO");
    }

    return conceptos.filter((concepto) => concepto.tipo !== "MENSUALIDAD");
  }, [conceptos, formData.tipo]);

  const selectedConcepto = useMemo(
    () => conceptos.find((concepto) => String(concepto.id) === String(formData.conceptoId)) || null,
    [conceptos, formData.conceptoId],
  );

  const isMensualidadConcept = Boolean(selectedConcepto && (selectedConcepto.tipo === "MENSUALIDAD" || selectedConcepto.esMensualidad));

  const handleConceptoChange = (value) => {
    const concepto = conceptos.find((item) => String(item.id) === String(value));
    const isMensualidadSelected = Boolean(concepto && (concepto.tipo === "MENSUALIDAD" || concepto.esMensualidad));

    setFormData((current) => ({
      ...current,
      conceptoId: value,
      mes: isMensualidadSelected ? current.mes || String(DEFAULT_MONTH) : "",
      anio: isMensualidadSelected ? current.anio || String(DEFAULT_YEAR) : "",
    }));
  };

  const handleOpenDialog = (movimiento) => {
    setFormError("");
    if (movimiento) {
      setEditingMovimiento(movimiento);
      setFormData({
        fecha: movimiento.fecha ? movimiento.fecha.split("T")[0] : new Date().toISOString().split("T")[0],
        tipo: movimiento.tipo,
        monto: String(movimiento.valor ?? ""),
        conceptoId: getConceptId(movimiento),
        personaId: movimiento.personaId ? String(movimiento.personaId) : "",
        mes: movimiento.mes ? String(movimiento.mes) : "",
        anio: movimiento.anio ? String(movimiento.anio) : "",
        observacion: movimiento.observacion || "",
      });
    } else {
      setEditingMovimiento(null);
      setFormData(createEmptyForm());
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.fecha || !formData.tipo || !formData.conceptoId || !formData.monto) {
      setFormError("Completa los campos obligatorios antes de guardar");
      return;
    }

    if (isMensualidadConcept && (!formData.mes || !formData.anio || !formData.personaId)) {
      setFormError("Para mensualidad debes elegir persona, mes y año");
      return;
    }

    setIsSaving(true);

    const payload = {
      fecha: `${formData.fecha}T12:00:00.000Z`,
      tipo: formData.tipo,
      valor: Number(formData.monto),
      conceptoId: Number(formData.conceptoId),
      personaId: formData.personaId ? Number(formData.personaId) : null,
      mes: isMensualidadConcept ? Number(formData.mes || DEFAULT_MONTH) : null,
      anio: isMensualidadConcept ? Number(formData.anio || DEFAULT_YEAR) : null,
      observacion: formData.observacion,
    };

    try {
      if (editingMovimiento) {
        await updateMovimiento(editingMovimiento.id, payload);
      } else {
        await addMovimiento(payload);
      }

      setIsDialogOpen(false);
    } catch (submitError) {
      setFormError(submitError?.response?.data?.error || submitError?.message || "No se pudo guardar el movimiento");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <StatusState title="Cargando movimientos..." description="Obteniendo datos reales desde el backend." />;
  }

  if (error) {
    return <StatusState title="No se pudo cargar movimientos" description={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
          <p className="mt-1 text-gray-600">Registra y gestiona movimientos reales del backend</p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenDialog()}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700"
        >
          Nuevo Movimiento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniCard label="Ingresos" value={formatCurrency(totalIngresos)} valueClassName="text-green-600" />
        <MiniCard label="Egresos" value={formatCurrency(totalEgresos)} valueClassName="text-red-600" />
        <MiniCard label="Balance" value={formatCurrency(balance)} valueClassName={balance >= 0 ? "text-blue-600" : "text-red-600"} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lista de Movimientos</h2>
            <p className="text-sm text-gray-500">Todos los movimientos almacenados en el backend</p>
          </div>

          <select
            value={filterTipo}
            onChange={(event) => setFilterTipo(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos</option>
            <option value="INGRESO">Ingresos</option>
            <option value="EGRESO">Egresos</option>
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar concepto/persona..." className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500" />
          <select value={ordenFecha} onChange={(event) => setOrdenFecha(event.target.value)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500">
            <option value="FECHA_DESC">Más recientes</option><option value="FECHA_ASC">Más antiguos</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Concepto</th>
                <th className="px-5 py-3 font-medium">Persona</th>
                <th className="px-5 py-3 font-medium">Observación</th>
                <th className="px-5 py-3 text-right font-medium">Monto</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredMovimientos.map((movimiento) => {
                const persona = personas.find((item) => String(item.id) === String(movimiento.personaId));

                return (
                  <tr key={movimiento.id}>
                    <td className="px-5 py-4 text-gray-600">{formatDateTime(movimiento.fecha)}</td>
                    <td className="px-5 py-4">
                      <span className={badgeClassName(movimiento.tipo)}>{movimiento.tipo}</span>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">{movimiento.concepto?.nombre || "Sin concepto"}</td>
                    <td className="px-5 py-4 text-gray-600">{persona?.nombre || movimiento.persona?.nombre || "N/A"}</td>
                    <td className="max-w-xs px-5 py-4 text-gray-600 truncate">{movimiento.observacion || "-"}</td>
                    <td className="px-5 py-4 text-right font-bold">
                      <span className={movimiento.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}>
                        {movimiento.tipo === "INGRESO" ? "+" : "-"}{formatCurrency(movimiento.valor)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <ActionButton onClick={() => handleOpenDialog(movimiento)}>Editar</ActionButton>
                        <ActionButton onClick={() => deleteMovimiento(movimiento.id)}>Eliminar</ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingMovimiento ? "Editar Movimiento" : "Nuevo Movimiento"}
        description={editingMovimiento ? "Modifica los datos del movimiento" : "Registra un movimiento real en el backend"}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Fecha" type="date" value={formData.fecha} onChange={(value) => setFormData({ ...formData, fecha: value })} required />
            <SelectField
              label="Tipo"
              value={formData.tipo}
              onChange={(value) => setFormData({ ...formData, tipo: value, conceptoId: "" })}
              options={["INGRESO", "EGRESO"]}
              optionLabels={{ INGRESO: "INGRESO", EGRESO: "EGRESO" }}
            />
          </div>

          <Field label="Monto" type="number" value={formData.monto} onChange={(value) => setFormData({ ...formData, monto: value })} placeholder="0.00" step="0.01" required />

          <SelectField
            label="Concepto"
            value={formData.conceptoId}
              onChange={handleConceptoChange}
            options={availableConceptos.map((concepto) => String(concepto.id))}
            optionLabels={Object.fromEntries(availableConceptos.map((concepto) => [String(concepto.id), `${concepto.nombre} (${concepto.tipo})`]))}
            placeholder="Selecciona un concepto"
          />

          {isMensualidadConcept ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Mes pagado"
                value={formData.mes}
                onChange={(value) => setFormData({ ...formData, mes: value })}
                options={MONTH_OPTIONS.map((month) => month.value)}
                optionLabels={Object.fromEntries(MONTH_OPTIONS.map((month) => [month.value, month.label]))}
                placeholder="Selecciona el mes"
              />
              <Field
                label="Año pagado"
                type="number"
                value={formData.anio || String(DEFAULT_YEAR)}
                onChange={(value) => setFormData({ ...formData, anio: value || String(DEFAULT_YEAR) })}
                placeholder={String(DEFAULT_YEAR)}
                required
              />
            </div>
          ) : null}

          <SelectField
            label="Persona"
            value={formData.personaId}
            onChange={(value) => setFormData({ ...formData, personaId: value })}
            options={[
              "",
              ...personas.filter((persona) => persona.activa).map((persona) => String(persona.id)),
            ]}
            optionLabels={{
              "": "Sin persona",
              ...Object.fromEntries(personas.map((persona) => [String(persona.id), persona.nombre])),
            }}
          />

          <Field label="Observación" value={formData.observacion} onChange={(value) => setFormData({ ...formData, observacion: value })} placeholder="Detalles adicionales..." multiline rows={3} />

          {formError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div> : null}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Guardando..." : editingMovimiento ? "Guardar Cambios" : "Registrar Movimiento"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function createEmptyForm() {
  return {
    fecha: new Date().toISOString().split("T")[0],
    tipo: "INGRESO",
    monto: "",
    conceptoId: "",
    personaId: "",
    mes: String(DEFAULT_MONTH),
    anio: String(DEFAULT_YEAR),
    observacion: "",
  };
}

function getConceptId(movimiento) {
  return movimiento.conceptoId ? String(movimiento.conceptoId) : movimiento.concepto?.id ? String(movimiento.concepto.id) : "";
}

function MiniCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required = false, type = "text", step, multiline = false, rows = 3 }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options, optionLabels = {}, placeholder = "Seleccione" }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
      {children}
    </button>
  );
}

function badgeClassName(tipo) {
  return ["inline-flex rounded-full px-3 py-1 text-xs font-semibold", tipo === "INGRESO" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"].join(" ");
}

function StatusState({ title, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
