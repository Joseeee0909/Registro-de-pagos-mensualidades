import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import MainLayout from "./components/layouts/MainLayout";

import DashboardPage from "./pages/DashboardPage";
import PersonasPage from "./pages/PersonasPage";
import MovimientosPage from "./pages/MovimientosPage";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<MainLayout />}>

          <Route
            index
            element={<DashboardPage />}
          />

          <Route
            path="personas"
            element={<PersonasPage />}
          />

          <Route
            path="movimientos"
            element={<MovimientosPage />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;