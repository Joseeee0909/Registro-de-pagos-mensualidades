import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard } from "lucide-react";

import { useData } from "../context/DataContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";

export default function DashboardPage() {
  const { personas, movimientos, mensualidades, ahorros, caja } = useData();

  const totalIngresos = Number(caja?.ingresos ?? 0);
  const totalEgresos = Number(caja?.egresos ?? 0);
  const balance = Number(caja?.cajaActual ?? totalIngresos - totalEgresos);
  const mensualidadesPagadas = mensualidades.filter((mensualidad) => mensualidad.pagado).length;
  const mensualidadesPendientes = mensualidades.filter((mensualidad) => !mensualidad.pagado).length;
  const totalAhorros = ahorros.reduce((sum, ahorro) => {
    return ahorro.tipo === "DEPOSITO" ? sum + Number(ahorro.monto || 0) : sum - Number(ahorro.monto || 0);
  }, 0);
  const personasActivas = personas.filter((persona) => persona.activa).length;
  const recentMovimientos = movimientos.slice(0, 5);

  const stats = [
    {
      title: "Balance Total",
      value: formatCurrency(balance),
      description: "Ingresos - Egresos",
      icon: DollarSign,
      color: balance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: balance >= 0 ? "bg-green-100" : "bg-red-100",
    },
    {
      title: "Ingresos",
      value: formatCurrency(totalIngresos),
      description: "Total del mes",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Egresos",
      value: formatCurrency(totalEgresos),
      description: "Total del mes",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Ahorros",
      value: formatCurrency(totalAhorros),
      description: "Total acumulado",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Resumen de tu gestión financiera</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-600">{stat.title}</h2>
                <div className={`rounded-xl p-2 ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="mt-1 text-xs text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SimpleCard
          title="Personas Activas"
          description="Total de personas registradas"
          icon={Users}
          iconClassName="text-blue-600"
        >
          <div className="text-4xl font-bold text-blue-600">{personasActivas}</div>
          <p className="mt-2 text-sm text-gray-500">{personas.length - personasActivas} inactivas</p>
        </SimpleCard>

        <SimpleCard
          title="Mensualidades"
          description="Estado de pagos del mes"
          icon={CreditCard}
          iconClassName="text-blue-600"
        >
          <div className="space-y-3">
            <SummaryRow label="Pagadas" value={mensualidadesPagadas} valueClassName="text-green-600" />
            <SummaryRow label="Pendientes" value={mensualidadesPendientes} valueClassName="text-orange-600" />
          </div>
        </SimpleCard>
      </div>

      <SimpleCard title="Movimientos Recientes" description="Últimos 5 movimientos registrados">
        <div className="space-y-3">
          {recentMovimientos.map((movimiento) => (
            <div key={movimiento.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{getConceptLabel(movimiento)}</p>
                <p className="text-sm text-gray-500">
                  {movimiento.persona?.nombre || "Sin persona"} • {formatDateTime(movimiento.fecha)}
                </p>
              </div>
              <div className={`text-lg font-bold ${movimiento.tipo === "INGRESO" ? "text-green-600" : "text-red-600"}`}>
                {movimiento.tipo === "INGRESO" ? "+" : "-"}{formatCurrency(movimiento.valor)}
              </div>
            </div>
          ))}
        </div>
      </SimpleCard>
    </div>
  );
}

function SimpleCard({ title, description, icon: Icon, iconClassName, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className={`h-5 w-5 ${iconClassName || "text-blue-600"}`} /> : null}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description ? <p className="text-sm text-gray-500">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-lg font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function getConceptLabel(movimiento) {
  if (typeof movimiento.concepto === "string") {
    return movimiento.concepto;
  }

  return movimiento.concepto?.nombre || `Concepto ${movimiento.conceptoId || ""}`.trim();
}