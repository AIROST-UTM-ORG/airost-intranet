import React from "react";
import { Link, NavLink } from "react-router-dom";
import * as aiicon from "react-icons/ai";
import { IconContext } from "react-icons";
import { FiUser } from "react-icons/fi";
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
        <aside className="side-menu active">
          <ul className="side-menu-items">
            <li className="side-logo"><img src="airost-icon.jpg" alt="Airost logo" /></li>
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
            <li className="side-profile">
              <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
                {user?.photo ? (
                  <img src={user.photo} alt="" referrerPolicy="no-referrer" />
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
