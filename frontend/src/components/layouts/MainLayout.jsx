import { Link, Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#0f172a]">

      <nav className="bg-[#111827] shadow p-5 flex text-white justify-center gap-x-20">

        <Link to="/" className="text-xl font-bold border-b-2 border-transparent hover:border-white transition">
          Dashboard
        </Link>

        <Link to="/personas" className="text-xl font-bold border-b-2 border-transparent hover:border-white transition">
          Personas
        </Link>

        <Link to="/movimientos" className="text-xl font-bold border-b-2 border-transparent hover:border-white  transition">
          Movimientos
        </Link>

      </nav>

      <main className="p-6">
        <Outlet />
      </main>

    </div>
  );
}