import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { RetroBoard } from "./pages/RetroBoard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/retro/:sessionId" element={<RetroBoard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
