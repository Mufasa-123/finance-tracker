import React, { useState, useEffect } from "react";
import api from "../api/axios";

const CATEGORIES = ["Food", "Travel", "Bills", "Shopping", "Health", "Entertainment", "Salary", "Freelance", "Other"];

export default function TransactionModal({ transaction, onClose, onSaved }) {
  const isEditing = Boolean(transaction && transaction._id);

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: "Food",
    account: "Cash",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type || "expense",
        amount: transaction.amount !== undefined ? transaction.amount : "",
        category: transaction.category || "Food",
        account: transaction.account || "Cash",
        note: transaction.note || "",
        date: transaction.date
          ? new Date(transaction.date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      });
    }
  }, [transaction]);

  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setWarning("");

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (form.category === "Other" && (!form.note || !form.note.trim())) {
      setError("Please provide a reason/description when selecting the 'Other' category.");
      return;
    }
    if (new Date(form.date) > new Date()) {
      setError("Date cannot be in the future");
      return;
    }

    try {
      setLoading(true);
      const payload = { ...form, amount: Number(form.amount) };

      if (isEditing) {
        await api.put(`/transactions/${transaction._id}`, payload);
      } else {
        const { data } = await api.post("/transactions", payload);
        if (data.duplicateWarning) {
          setWarning(data.duplicateWarning);
        }
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const isOtherSelected = form.category === "Other";

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>{isEditing ? "Edit Transaction" : "Add Transaction"}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {warning && <div className="alert alert-warning">{warning}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="e.g. 500"
              min="0.01"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Account</label>
            <select name="account" value={form.account} onChange={handleChange}>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
              <option value="Wallet">Wallet</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              {isOtherSelected ? "Reason / Description for 'Other' (Mandatory) *" : "Note (optional)"}
            </label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              placeholder={isOtherSelected ? "Please describe what this 'Other' transaction is for..." : "e.g. Lunch with friends"}
              style={isOtherSelected ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb" } : {}}
            />
            {isOtherSelected && (
              <small style={{ color: "#d97706", fontSize: 12, marginTop: 4, display: "block" }}>
                ⚠️ A reason is required when category is set to 'Other'.
              </small>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Transaction" : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
