import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Registration";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";
import { getToken } from "./api/client";

function Private({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/studio"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <Private>
              <Project />
            </Private>
          }
        />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
