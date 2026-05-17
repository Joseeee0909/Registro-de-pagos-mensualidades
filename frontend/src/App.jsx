import { BrowserRouter, Route, Routes } from "react-router-dom";

import { DataProvider } from "./context/DataContext";
import MainLayout from "./components/layouts/MainLayout";

import DashboardPage from "./pages/DashboardPage";
import PersonasPage from "./pages/PersonasPage";
import MovimientosPage from "./pages/MovimientosPage";
import MensualidadesPage from "./pages/MensualidadesPage";
import AhorrosPage from "./pages/AhorrosPage";
import ReportesPage from "./pages/ReportesPage";

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="movimientos" element={<MovimientosPage />} />
            <Route path="mensualidades" element={<MensualidadesPage />} />
            <Route path="ahorros" element={<AhorrosPage />} />
            <Route path="reportes" element={<ReportesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;