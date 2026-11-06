import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import * as aiicon from "react-icons/ai";
import { IconContext } from "react-icons";
import { FiUser } from "react-icons/fi";
import "./Sidepanel.css";
import { Sidebar } from "./Sidebar";
import useAuth from "../../hooks/useAuth";

function Sidepanel() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  const isAdmin =
    user?.positions &&
    (Array.isArray(user.positions) ? user.positions.includes("admin") : user.positions === "admin");

  return (
    <>
      <IconContext.Provider value={{ color: "#fff" }}>
        <aside className="side-menu active">
          <ul className="side-menu-items">
            <li className="side-logo"><img src="/airost-icon.jpg" alt="Airost logo" /></li>
            {Sidebar.map((item, index) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
              return (
                !item.hideNavItem && (
                  <li key={index} className={item.cName}>
                    <Link to={item.path} className={isActive ? "active" : ""}>
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
                <Link
                  to="/admin"
                  className={location.pathname.startsWith("/admin") ? "active" : ""}
                >
                  <aiicon.AiFillSetting />
                  <span>Admin</span>
                </Link>
              </li>
            ) : null}

            {/* Show documentation nav between admin and log out */}
            <li className="side-text">
              <Link
                to="/doc"
                className={
                  location.pathname === "/doc" || location.pathname.startsWith("/doc/")
                    ? "active"
                    : ""
                }
              >
                <aiicon.AiOutlineFileText />
                <span>Documentation</span>
              </Link>
            </li>

            <li className="side-text" onClick={handleLogout}>
              <Link to="#">
                <aiicon.AiOutlineLogout />
                <span>Log Out</span>
              </Link>
            </li>
            <li className="side-profile">
              <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="side-profile-placeholder"><FiUser aria-hidden="true" /></span>
                )}
                <span className="side-profile-copy">
                  <strong>{user?.name || "Airost member"}</strong>
                  <small>{user?.email || ""}</small>
                </span>
              </NavLink>
            </li>
          </ul>
        </aside>
      </IconContext.Provider>
    </>
  );
}

export default Sidepanel;
