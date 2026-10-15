import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h2>💰 FinTrack</h2>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => (isActive ? "active" : "")}>
          Transactions
        </NavLink>
        <NavLink to="/budgets" className={({ isActive }) => (isActive ? "active" : "")}>
          Budgets
        </NavLink>
        <NavLink to="/goals" className={({ isActive }) => (isActive ? "active" : "")}>
          Goals
        </NavLink>
      </nav>
      <div style={{ marginTop: 40, fontSize: 13, color: "#9ca3af" }}>
        Logged in as<br /><strong style={{ color: "#fff" }}>{user?.name}</strong>
      </div>
      <button
        onClick={handleLogout}
        className="btn btn-secondary"
        style={{ marginTop: 16, width: "100%" }}
      >
        Logout
      </button>
    </div>
  );
}
