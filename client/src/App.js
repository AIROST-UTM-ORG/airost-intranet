import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard.js";
import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/Projects/ProjectDetails";
import Login from "./pages/Login/Login";
import Layout from "./components/Layout/Layout";
import RequireAuth from "./components/RequireAuth";
import { useState } from "react";
import { AuthProvider } from "./context/authContext";
import useAuth from "./hooks/useAuth";
import Admin from "./pages/Admin/Admin.js";
import Unauthorized from "./pages/Unauthorized/Unauthorized";
import Doc from "./pages/Documentation/Doc";
import DocBlog from "./pages/Documentation/component/Doc-blog";
import Events from "./pages/Events/Events";
import ProjectTracking from "./pages/ProjectTracking/ProjectTracking.js";
import Board from "./pages/ProjectTracking/components/Board.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreateDoc from "./pages/Documentation/component/create-documentation/CreateDoc.js";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const [path, setPath] = useState("/");

  const getPath = (p) => {
    setPath(p);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Navigate to the previous intended path(if any) if user logged in */}
        <Route
          path="/login"
          element={user ? <Navigate to={path} replace={true} /> : <Login getPath={getPath} />}
        />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* accessible routes by admin */}
        <Route element={<RequireAuth allowedPosition={["admin"]} />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Accessible routes by all members */}
        <Route element={<RequireAuth allowedPosition={["member", "admin"]} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/events" element={<Events />} />
          <Route path="/doc" element={<Doc />} />
          <Route path="/doc/:id" element={<DocBlog />} />
          <Route path="/doc/create/:id" element={<CreateDoc />} />
          <Route path="/projects/tracking" element={<ProjectTracking />} />
          <Route path="/projects/tracking/:projectId" element={<Board />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
