import React, { useEffect, useState } from "react";
import api from "../api/axios";
import BudgetModal from "../components/BudgetModal";

const STATUS_COLOR = {
  safe: "#10b981",
  warning: "#f59e0b",
  exceeded: "#ef4444",
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/budgets");
      setBudgets(data);
    } catch (err) {
      console.error("Failed to fetch budgets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`);
    fetchBudgets();
  };

  const exceededCount = budgets.filter((b) => b.status === "exceeded").length;

  return (
    <>
      <div className="topbar">
        <h1>Budgets</h1>
        <button className="btn" onClick={() => setShowModal(true)}>+ Set Budget</button>
      </div>

      {exceededCount > 0 && (
        <div className="alert alert-error">
          ⚠️ You have exceeded {exceededCount} budget{exceededCount > 1 ? "s" : ""} this month!
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : budgets.length === 0 ? (
        <div className="card"><p style={{ color: "#9ca3af" }}>No budgets set for this month yet.</p></div>
      ) : (
        <div className="card-grid">
          {budgets.map((b) => (
            <div className="card" key={b._id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{b.category}</strong>
                <span className={`badge ${b.status}`}>{b.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                ₹{b.spent.toLocaleString()} of ₹{b.limitAmount.toLocaleString()} spent ({b.percentUsed}%)
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, b.percentUsed)}%`,
                    background: STATUS_COLOR[b.status],
                  }}
                />
              </div>
              <button
                className="btn btn-danger"
                style={{ marginTop: 14, padding: "4px 10px", fontSize: 12 }}
                onClick={() => handleDelete(b._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchBudgets(); }}
        />
      )}
    </>
  );
}
