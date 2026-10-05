import React from "react";
import { Link } from "react-router-dom";
import * as aiicon from "react-icons/ai";
import { IconContext } from "react-icons";
import "./Sidepanel.css";
import { Sidebar } from "./Sidebar";
import useAuth from "../../hooks/useAuth";

function Sidepanel() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  const isAdmin =
    user?.position &&
    (Array.isArray(user.position) ? user.position.includes("admin") : user.position === "admin");

  return (
    <>
      <IconContext.Provider value={{ color: "#fff" }}>
        <sidebar className="side-menu active">
          <ul className="side-menu-items">
            <img src="airost-icon.jpg" alt="Airost logo" />
            {Sidebar.map((item, index) => {
              return (
                !item.hideNavItem && (
                  <li key={index} className={item.cName}>
                    <Link to={item.path}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </li>
                )
              );
            })}

            {/* Show admin menu item if user is admin */}
            {isAdmin ? (
              <li className="side-text">
                <Link to="/admin">
                  <aiicon.AiFillSetting />
                  <span>Admin</span>
                </Link>
              </li>
            ) : null}
            <li className="side-text" onClick={handleLogout}>
              <Link to="#">
                <aiicon.AiOutlineLogout />
                <span>Log Out</span>
              </Link>
            </li>
          </ul>
        </sidebar>
      </IconContext.Provider>
    </>
  );
}

export default Sidepanel;
