import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";

import Builder from "./pages/Builder";
import { getToken } from "./api/client";
import Register from "./pages/Registration";

function Private({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
          <Private>
            <Builder />
          </Private>
        }
      />
    </Routes>
  );
}
