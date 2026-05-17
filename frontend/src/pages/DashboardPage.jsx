import { useEffect, useState } from "react";

import api from "../api/api";

export default function DashboardPage() {

  const [caja, setCaja] = useState(null);

  useEffect(() => {

    const fetchCaja = async () => {

      try {

        const response =
          await api.get("/reportes/caja");

        setCaja(response.data);

      } catch (error) {

        console.error(error);
      }
    };

    fetchCaja();

  }, []);

  if (!caja) {
    return <p>Cargando...</p>;
  }

  return (
    <div className="p-6 bg-[#1e293b] rounded-xl shadow">

      <h1 className="text-3xl font-bold mb-6 text-zinc-100">
        Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-5">

        <div className="bg-[#D6F2E4] p-6 rounded-xl shadow hover:bg-green-200 transition">

          <h2 className="text-gray-700">
            Ingresos
          </h2>

          <p className="text-2xl font-bold">
            ${caja.ingresos}
          </p>

        </div>

        <div className="bg-[#FBD9E1] p-6 rounded-xl shadow hover:bg-red-200 transition">

          <h2 className="text-gray-700">
            Egresos
          </h2>

          <p className="text-2xl font-bold">
            ${caja.egresos}
          </p>

        </div>

        <div className="bg-[#FFF2B2] p-6 rounded-xl shadow hover:bg-yellow-200 transition">

          <h2 className="text-gray-700">
            Caja Actual
          </h2>

          <p className="text-2xl font-bold">
            ${caja.cajaActual}
          </p>

        </div>

      </div>

    </div>
  );
}