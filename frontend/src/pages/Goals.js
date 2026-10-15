import React, { useEffect, useState } from "react";
import api from "../api/axios";
import GoalModal from "../components/GoalModal";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contributeId, setContributeId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/goals");
      setGoals(data);
    } catch (err) {
      console.error("Failed to fetch goals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    fetchGoals();
  };

  const handleContribute = async (id) => {
    if (!contributeAmount || Number(contributeAmount) <= 0) {
      alert("Enter a valid contribution amount");
      return;
    }
    try {
      await api.put(`/goals/${id}/contribute`, { amount: Number(contributeAmount) });
      setContributeId(null);
      setContributeAmount("");
      fetchGoals();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add contribution");
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <>
      <div className="topbar">
        <h1>Savings Goals</h1>
        <button className="btn" onClick={() => setShowModal(true)}>+ New Goal</button>
      </div>

      {loading ? (
        <p>Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="card">
          <p style={{ color: "#9ca3af" }}>No savings goals yet. Set one to start tracking!</p>
        </div>
      ) : (
        <div className="card-grid">
          {goals.map((g) => {
            const isAchieved = g.percentComplete >= 100;
            const targetDateObj = new Date(g.targetDate);
            const isOverdue = !isAchieved && targetDateObj < todayStart;

            return (
              <div
                className="card"
                key={g._id}
                style={{
                  border: isOverdue
                    ? "1px solid #ef4444"
                    : isAchieved
                    ? "1px solid #10b981"
                    : "1px solid #e5e7eb",
                  boxShadow: isOverdue ? "0 2px 8px rgba(239, 68, 68, 0.15)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <strong>{g.title}</strong>
                  {isAchieved && <span className="badge safe">🎉 Achieved</span>}
                  {isOverdue && <span className="badge exceeded">⚠️ Overdue</span>}
                </div>

                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                  ₹{g.savedAmount.toLocaleString()} of ₹{g.targetAmount.toLocaleString()} ({g.percentComplete}%)
                </div>

                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${g.percentComplete}%`,
                      background: isAchieved ? "#10b981" : isOverdue ? "#ef4444" : "#3b82f6",
                    }}
                  />
                </div>

                <div style={{ fontSize: 12, color: isOverdue ? "#ef4444" : "#9ca3af", marginTop: 8, fontWeight: isOverdue ? "600" : "normal" }}>
                  Target Date: {targetDateObj.toLocaleDateString()}
                </div>

                {/* Overdue Warning Alert Box */}
                {isOverdue && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      background: "#fee2e2",
                      color: "#991b1b",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>⚠️ Target date passed! Goal target incomplete.</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {contributeId === g._id ? (
                    <div style={{ display: "flex", gap: 8, flex: 1 }}>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={contributeAmount}
                        onChange={(e) => setContributeAmount(e.target.value)}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
                      />
                      <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => handleContribute(g._id)}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => setContributeId(g._id)}
                    >
                      + Contribute
                    </button>
                  )}

                  <button
                    className="btn btn-danger"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                    onClick={() => handleDelete(g._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <GoalModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchGoals(); }}
        />
      )}
    </>
  );
}
