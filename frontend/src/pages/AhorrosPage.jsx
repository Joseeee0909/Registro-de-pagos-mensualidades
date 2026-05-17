import { useMemo, useState } from "react";

import { useData } from "../context/DataContext";
import Modal from "../components/Modal";
import { formatCurrency } from "../utils/formatters";

export default function AhorrosPage() {
  const { ahorros, addAhorro } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [monthFilter, setMonthFilter] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split("T")[0], tipo: "DEPOSITO", monto: "", descripcion: "" });

  const filteredAhorros = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ahorros.filter((ahorro) => {
      const matchTipo = filterTipo === "TODOS" ? true : ahorro.tipo === filterTipo;
      const matchMes =
        monthFilter === "TODOS" ? true : String(new Date(ahorro.fecha).getMonth() + 1) === monthFilter;
      const matchQuery = query
        ? String(ahorro.descripcion || "").toLowerCase().includes(query)
        : true;
      return matchTipo && matchMes && matchQuery;
    });
  }, [ahorros, filterTipo, monthFilter, search]);

  const totalDepositos = ahorros.filter((ahorro) => ahorro.tipo === "DEPOSITO").reduce((sum, ahorro) => sum + Number(ahorro.monto || 0), 0);
  const totalRetiros = ahorros.filter((ahorro) => ahorro.tipo === "RETIRO").reduce((sum, ahorro) => sum + Number(ahorro.monto || 0), 0);
  const saldoTotal = totalDepositos - totalRetiros;
  const countDepositos = ahorros.filter((ahorro) => ahorro.tipo === "DEPOSITO").length;
  const countRetiros = ahorros.filter((ahorro) => ahorro.tipo === "RETIRO").length;

  const handleOpenDialog = () => {
    setFormData({ fecha: new Date().toISOString().split("T")[0], tipo: "DEPOSITO", monto: "", descripcion: "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    addAhorro({
      fecha: formData.fecha,
      tipo: formData.tipo,
      monto: Number(formData.monto),
      descripcion: formData.descripcion,
    });

    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ahorros</h1>
          <p className="mt-1 text-gray-600">Gestiona tus depósitos y retiros de ahorro</p>
        </div>

        <button type="button" onClick={handleOpenDialog} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700">
          Nuevo Movimiento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniCard label="Saldo Total" value={formatCurrency(saldoTotal)} subtitle="Balance actual" valueClassName="text-blue-600" />
        <MiniCard label="Depósitos" value={formatCurrency(totalDepositos)} subtitle={`${countDepositos} operaciones`} valueClassName="text-green-600" />
        <MiniCard label="Retiros" value={formatCurrency(totalRetiros)} subtitle={`${countRetiros} operaciones`} valueClassName="text-red-600" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Historial de Ahorros</h2>
            <p className="text-sm text-gray-500">Todos los movimientos de ahorro</p>
          </div>

          <select value={filterTipo} onChange={(event) => setFilterTipo(event.target.value)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500">
            <option value="TODOS">Todos</option>
            <option value="DEPOSITO">Depósitos</option>
            <option value="RETIRO">Retiros</option>
          </select>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500">
            <option value="TODOS">Todos los meses</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={String(month)}>{month}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descripción..." className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Descripción</th>
                <th className="px-5 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAhorros.map((ahorro) => (
                <tr key={ahorro.id}>
                  <td className="px-5 py-4 text-gray-600">{ahorro.fecha}</td>
                  <td className="px-5 py-4">
                    <span className={ahorro.tipo === "DEPOSITO" ? badgeClassName("DEPOSITO") : badgeClassName("RETIRO")}>
                      {ahorro.tipo}
                    </span>
                  </td>
                  <td className="max-w-md px-5 py-4 text-gray-600">{ahorro.descripcion}</td>
                  <td className="px-5 py-4 text-right font-bold">
                    <span className={ahorro.tipo === "DEPOSITO" ? "text-green-600" : "text-red-600"}>
                      {ahorro.tipo === "DEPOSITO" ? "+" : "-"}{formatCurrency(ahorro.monto)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAhorros.length === 0 ? <div className="py-8 text-center text-gray-500">No hay movimientos de ahorro registrados</div> : null}
        </div>
      </div>

      <Modal open={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Nuevo Movimiento de Ahorro" description="Registra un depósito o retiro de ahorro">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Fecha" type="date" value={formData.fecha} onChange={(value) => setFormData({ ...formData, fecha: value })} required />
            <SelectField label="Tipo" value={formData.tipo} onChange={(value) => setFormData({ ...formData, tipo: value })} options={["DEPOSITO", "RETIRO"]} optionLabels={{ DEPOSITO: "Depósito", RETIRO: "Retiro" }} />
          </div>

          <Field label="Monto" type="number" step="0.01" value={formData.monto} onChange={(value) => setFormData({ ...formData, monto: value })} placeholder="0.00" required />
          <Field label="Descripción" value={formData.descripcion} onChange={(value) => setFormData({ ...formData, descripcion: value })} placeholder="Motivo del movimiento..." multiline rows={3} required />

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Registrar Movimiento</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MiniCard({ label, value, subtitle, valueClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
      </div>
      <div className={`mt-3 text-3xl font-bold ${valueClassName}`}>{value}</div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
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

function SelectField({ label, value, onChange, options, optionLabels = {} }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        {options.map((option) => (
          <option key={option} value={option}>{optionLabels[option] || option}</option>
        ))}
      </select>
    </label>
  );
}

function badgeClassName(tipo) {
  return [
    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
    tipo === "DEPOSITO" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  ].join(" ");
}