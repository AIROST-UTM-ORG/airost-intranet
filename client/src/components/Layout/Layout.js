import { Outlet } from "react-router-dom";
import Sidepanel from "../Sidepanel/Sidepanel.js";
import "./Layout.css";
import useAuth from "../../hooks/useAuth";

const Layout = () => {
  const { user } = useAuth();
  return (
    <main className="App">
      {/* Show Sidepanel if user logged in */}
      {user ? <Sidepanel /> : null}
      <div className="outlet">
        <Outlet />
      </div>
    </main>
  );
};

export default Layout;
