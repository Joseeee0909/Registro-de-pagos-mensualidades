import { Link, NavLink, Outlet } from "react-router-dom";
import { Home, Users, FileText, CreditCard, PiggyBank, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/personas", icon: Users, label: "Personas" },
  { path: "/movimientos", icon: FileText, label: "Movimientos" },
  { path: "/mensualidades", icon: CreditCard, label: "Mensualidades" },
  { path: "/ahorros", icon: PiggyBank, label: "Ahorros" },
  { path: "/reportes", icon: BarChart3, label: "Reportes" },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Aerorumba
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      [
                        "inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100",
                      ].join(" ")
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 md:hidden">
          <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    [
                      "flex flex-col items-center rounded-xl px-2 py-3 text-xs font-medium transition",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")
                  }
                >
                  <Icon className="mb-1 h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}