import { Link, Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-white shadow p-4 flex gap-4">

        <Link to="/">
          Dashboard
        </Link>

        <Link to="/personas">
          Personas
        </Link>

        <Link to="/movimientos">
          Movimientos
        </Link>

      </nav>

      <main className="p-6">
        <Outlet />
      </main>

    </div>
  );
}