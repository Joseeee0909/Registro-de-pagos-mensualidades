import { useMemo } from "react";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

import { useData } from "../context/DataContext";
import { formatCurrency } from "../utils/formatters";

export default function ReportesPage() {
  const { movimientos, ahorros, caja } = useData();

  const totals = useMemo(() => {
    const totalIngresos = Number(caja?.ingresos ?? movimientos.filter((movimiento) => movimiento.tipo === "INGRESO").reduce((sum, movimiento) => sum + Number(movimiento.valor || 0), 0));
    const totalEgresos = Number(caja?.egresos ?? movimientos.filter((movimiento) => movimiento.tipo === "EGRESO").reduce((sum, movimiento) => sum + Number(movimiento.valor || 0), 0));
    const balance = Number(caja?.cajaActual ?? totalIngresos - totalEgresos);
    const totalAhorros = ahorros.reduce((sum, ahorro) => (ahorro.tipo === "DEPOSITO" ? sum + Number(ahorro.monto || 0) : sum - Number(ahorro.monto || 0)), 0);
    const efectivoDisponible = balance - totalAhorros;

    return { totalIngresos, totalEgresos, balance, totalAhorros, efectivoDisponible };
  }, [movimientos, ahorros]);

  const barData = [
    { name: "Flujo de Efectivo", Ingresos: totals.totalIngresos, Egresos: totals.totalEgresos, Balance: totals.balance },
  ];

  const pieData = [
    { name: "Ingresos", value: totals.totalIngresos, color: "#10b981" },
    { name: "Egresos", value: totals.totalEgresos, color: "#ef4444" },
  ];

  const movimientosPorConcepto = movimientos.reduce((acc, movimiento) => {
    const concepto = typeof movimiento.concepto === "string" ? movimiento.concepto : movimiento.concepto?.nombre || "Sin concepto";
    const existing = acc.find((item) => item.concepto === concepto);

    if (existing) {
      existing.total += Number(movimiento.valor || 0);
      existing.count += 1;
    } else {
      acc.push({ concepto, total: Number(movimiento.valor || 0), count: 1, tipo: movimiento.tipo });
    }

    return acc;
  }, []);

  const topIngresos = movimientosPorConcepto.filter((item) => item.tipo === "INGRESO").sort((a, b) => b.total - a.total).slice(0, 5);
  const topEgresos = movimientosPorConcepto.filter((item) => item.tipo === "EGRESO").sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="mt-1 text-gray-600">Análisis financiero y reporte de caja</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Ingresos" value={formatCurrency(totals.totalIngresos)} icon={TrendingUp} iconClassName="text-green-600" />
        <MetricCard title="Total Egresos" value={formatCurrency(totals.totalEgresos)} icon={TrendingDown} iconClassName="text-red-600" />
        <MetricCard title="Balance Total" value={formatCurrency(totals.balance)} icon={DollarSign} iconClassName={totals.balance >= 0 ? "text-blue-600" : "text-red-600"} />
        <MetricCard title="Efectivo Disponible" value={formatCurrency(totals.efectivoDisponible)} icon={Wallet} iconClassName="text-purple-600" subtitle="Balance - Ahorros" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Comparativo de Flujo" description="Ingresos vs Egresos">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" />
              <Bar dataKey="Egresos" fill="#ef4444" />
              <Bar dataKey="Balance" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución de Fondos" description="Proporción de ingresos y egresos">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard title="Top 5 Ingresos por Concepto" description="Conceptos con mayores ingresos" items={topIngresos} colorClassName="bg-green-50" valueClassName="text-green-600" emptyLabel="No hay datos disponibles" />
        <ListCard title="Top 5 Egresos por Concepto" description="Conceptos con mayores gastos" items={topEgresos} colorClassName="bg-red-50" valueClassName="text-red-600" emptyLabel="No hay datos disponibles" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Reporte de Caja</h2>
          <p className="text-sm text-gray-500">Estado detallado de las finanzas</p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-4 md:grid-cols-2">
            <ValueBox label="Total de Ingresos" value={formatCurrency(totals.totalIngresos)} valueClassName="text-green-600" />
            <ValueBox label="Total de Egresos" value={formatCurrency(totals.totalEgresos)} valueClassName="text-red-600" />
          </div>

          <div className="h-px bg-gray-200" />

          <div className="grid grid-cols-1 gap-4 rounded-2xl bg-blue-50 p-4 md:grid-cols-2">
            <ValueBox label="Balance (Ingresos - Egresos)" value={formatCurrency(totals.balance)} valueClassName={totals.balance >= 0 ? "text-blue-600" : "text-red-600"} />
            <ValueBox label="Ahorros Acumulados" value={formatCurrency(totals.totalAhorros)} valueClassName="text-blue-600" />
          </div>

          <div className="h-px bg-gray-200" />

          <div className="rounded-2xl bg-purple-50 p-4">
            <p className="text-sm text-gray-600">Efectivo Disponible (Balance - Ahorros)</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{formatCurrency(totals.efectivoDisponible)}</p>
            <p className="mt-2 text-xs text-gray-500">Este es el efectivo real disponible después de considerar los ahorros</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, iconClassName }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <Icon className={`h-5 w-5 ${iconClassName || "text-blue-600"}`} />
      </div>
      {subtitle ? <p className="mt-2 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ListCard({ title, description, items, colorClassName, valueClassName, emptyLabel }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-3 p-5">
        {items.map((item) => (
          <div key={item.concepto} className={`flex items-center justify-between rounded-xl p-3 ${colorClassName}`}>
            <div>
              <p className="font-medium text-gray-900">{item.concepto}</p>
              <p className="text-sm text-gray-500">{item.count} movimiento(s)</p>
            </div>
            <div className={`text-lg font-bold ${valueClassName}`}>{formatCurrency(item.total)}</div>
          </div>
        ))}
        {items.length === 0 ? <p className="py-4 text-center text-gray-500">{emptyLabel}</p> : null}
      </div>
    </div>
  );
}

function ValueBox({ label, value, valueClassName }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}