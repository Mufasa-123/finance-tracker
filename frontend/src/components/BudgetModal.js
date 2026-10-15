import React, { useState } from "react";
import api from "../api/axios";

const CATEGORIES = ["Food", "Travel", "Bills", "Shopping", "Health", "Entertainment", "Other"];
const now = new Date();

export default function BudgetModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    category: "Food",
    limitAmount: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.limitAmount || Number(form.limitAmount) <= 0) {
      setError("Budget limit must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      await api.post("/budgets", {
        ...form,
        limitAmount: Number(form.limitAmount),
        month: Number(form.month),
        year: Number(form.year),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Set a Budget</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Monthly Limit (₹)</label>
            <input
              type="number"
              name="limitAmount"
              value={form.limitAmount}
              onChange={handleChange}
              placeholder="e.g. 5000"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Month</label>
            <select name="month" value={form.month} onChange={handleChange}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <input type="number" name="year" value={form.year} onChange={handleChange} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Saving..." : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
