import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const RequireAuth = ({ allowedPosition }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const hasPosition = user?.position && (
    Array.isArray(user.position)
      ? user.position.some((p) => allowedPosition.includes(p))
      : allowedPosition.includes(user.position)
  );

  return hasPosition ? (
    <Outlet />
  ) : user ? (
    <Navigate to="/unauthorized" />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default RequireAuth;
