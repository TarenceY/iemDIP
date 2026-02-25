import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LearnReady from "./pages/LearnReady";
import LearnRaw from "./pages/LearnRaw";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ScanMeal from "./pages/ScanMeal";
import ScanIngredients from "./pages/ScanIngredients";
import EditProfile from "./pages/EditProfile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/learn-ready" element={<LearnReady />} />
        <Route path="/learn-raw" element={<LearnRaw />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/scan-meal" element={<ScanMeal />} />
        <Route path="/scan-ingredients" element={<ScanIngredients />} />
        <Route path="/profile/edit" element={<EditProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
