import { BrowserRouter, Routes, Route } from "react-router-dom";
import InvoiceGenerator from "./components/InvoiceGenerator";
import { Toaster } from "./components/ui/sonner";
import "@/App.css";

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<InvoiceGenerator />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;