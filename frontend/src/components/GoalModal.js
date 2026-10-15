import React, { useState } from "react";
import api from "../api/axios";

export default function GoalModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", targetAmount: "", targetDate: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.targetAmount || !form.targetDate) {
      setError("All fields are required");
      return;
    }
    if (Number(form.targetAmount) <= 0) {
      setError("Target amount must be greater than 0");
      return;
    }
    if (new Date(form.targetDate) <= new Date()) {
      setError("Target date must be in the future");
      return;
    }

    try {
      setLoading(true);
      await api.post("/goals", { ...form, targetAmount: Number(form.targetAmount) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Create Savings Goal</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Goal Title</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Trip to Goa" />
          </div>
          <div className="form-group">
            <label>Target Amount (₹)</label>
            <input
              type="number"
              name="targetAmount"
              value={form.targetAmount}
              onChange={handleChange}
              placeholder="e.g. 20000"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Target Date</label>
            <input
              type="date"
              name="targetDate"
              value={form.targetDate}
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              onChange={handleChange}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Saving..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
