import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LearnReady from "./pages/LearnReady";
import LearnRaw from "./pages/LearnRaw";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/learn-ready" element={<LearnReady />} />
        <Route path="/learn-raw" element={<LearnRaw />} />
      </Routes>
    </BrowserRouter>
  );
}
