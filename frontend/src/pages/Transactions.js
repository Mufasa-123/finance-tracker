import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import TransactionModal from "../components/TransactionModal";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterType, setFilterType] = useState(""); // "" | "income" | "expense"
  const [dateFilterMode, setDateFilterMode] = useState("all"); // "all" | "date" | "month"
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filterType) params.type = filterType;

      if (dateFilterMode === "date" && selectedDate) {
        params.from = selectedDate;
        params.to = selectedDate;
      } else if (dateFilterMode === "month" && selectedMonth) {
        const [yearStr, monthStr] = selectedMonth.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const firstDayStr = `${yearStr}-${monthStr}-01`;
        const lastDayObj = new Date(year, month, 0);
        const lastDayNum = String(lastDayObj.getDate()).padStart(2, "0");
        const lastDayStr = `${yearStr}-${monthStr}-${lastDayNum}`;

        params.from = firstDayStr;
        params.to = lastDayStr;
      }

      const { data } = await api.get("/transactions", { params });
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, dateFilterMode, selectedDate, selectedMonth]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleResetFilters = () => {
    setFilterType("");
    setDateFilterMode("all");
    setSelectedDate("");
    setSelectedMonth("");
  };

  const handleAddClick = () => {
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      alert("Failed to delete transaction");
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  // Calculations for filtered items
  const totalFilteredIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <div className="topbar">
        <h1>Transactions</h1>
        <button className="btn" onClick={handleAddClick}>
          + Add Transaction
        </button>
      </div>

      {/* Filter Control Panel */}
      <div className="card" style={{ marginBottom: 20, padding: "18px 20px" }}>
        <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "12px", color: "#374151" }}>
          🔍 Filter Transactions
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
          {/* Date Filter Selection Mode */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Date Filter</label>
            <select
              value={dateFilterMode}
              onChange={(e) => {
                setDateFilterMode(e.target.value);
                if (e.target.value === "all") {
                  setSelectedDate("");
                  setSelectedMonth("");
                }
              }}
            >
              <option value="all">All Dates</option>
              <option value="date">Particular Date</option>
              <option value="month">Particular Month</option>
            </select>
          </div>

          {/* Input for Particular Date */}
          {dateFilterMode === "date" && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Input for Particular Month */}
          {dateFilterMode === "month" && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label>Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          )}

          {/* Type Filter */}
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          {/* Clear / Show All Button */}
          <button
            className="btn btn-secondary"
            onClick={handleResetFilters}
            style={{ padding: "10px 16px", height: "40px" }}
          >
            🔄 Show All / Reset
          </button>
        </div>

        {/* Filter Summary Ribbon */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            gap: "20px",
            fontSize: "13px",
            color: "#4b5563",
          }}
        >
          <span>
            Records Found: <strong>{transactions.length}</strong>
          </span>
          <span style={{ color: "#059669" }}>
            Total Income: <strong>+₹{totalFilteredIncome.toLocaleString()}</strong>
          </span>
          <span style={{ color: "#e11d48" }}>
            Total Expense: <strong>-₹{totalFilteredExpense.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="card">
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
            No transactions found for the selected filters.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Account</th>
                <th>Note</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{t.category}</td>
                  <td>{t.account}</td>
                  <td>{t.note || "-"}</td>
                  <td>
                    <span className={`badge ${t.type}`}>{t.type}</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => handleEditClick(t)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => handleDelete(t._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
