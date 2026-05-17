const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "long" });

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

export function formatMonthYear(month, year) {
  if (!month || !year) return "-";
  const monthName = monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
}