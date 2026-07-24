import { BrowserRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "./lib/i18n";
import HomePage from "./pages/HomePage";
import TripPage from "./pages/TripPage";

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/t/:id" element={<TripPage />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
