import React, { useEffect, useState, useCallback } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import api from "../api/axios";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316",
];

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const today = getTodayStr();
    return { from: firstDay, to: today };
  };

  const [dateRange, setDateRange] = useState(getDefaultDates());
  const [activePreset, setActivePreset] = useState("thisMonth");
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { from: dateRange.from, to: dateRange.to };
      const [summaryRes, categoryRes, dailyRes] = await Promise.all([
        api.get("/dashboard/summary", { params }),
        api.get("/dashboard/category-breakdown", { params }),
        api.get("/dashboard/daily-trend", { params }),
      ]);

      if (activePreset === "today") {
        // Fetch current month's income to display in Income card & subtract today's expense from it
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const todayStr = getTodayStr();
        const monthParams = { from: monthStart, to: todayStr };

        const monthSummaryRes = await api.get("/dashboard/summary", { params: monthParams });
        const currentMonthIncome = monthSummaryRes.data.income || 0;
        const todayExpense = summaryRes.data.expense || 0;

        setSummary({
          income: currentMonthIncome,
          expense: todayExpense,
          balance: currentMonthIncome - todayExpense,
        });
      } else {
        setSummary(summaryRes.data);
      }

      setCategoryData(categoryRes.data);
      setDailyTrend(dailyRes.data);
    } catch (err) {
      console.error("Failed to load date-wise dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, activePreset]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = getTodayStr();
    let fromDate = todayStr;
    let toDate = todayStr;

    if (preset === "today") {
      fromDate = todayStr;
      toDate = todayStr;
    } else if (preset === "thisMonth") {
      fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      toDate = todayStr;
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      fromDate = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
      toDate = todayStr;
    } else if (preset === "thisYear") {
      fromDate = `${now.getFullYear()}-01-01`;
      toDate = todayStr;
    }
    setDateRange({ from: fromDate, to: toDate });
  };

  const handleDownloadExcel = async () => {
    try {
      const params = {};
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;

      const { data: transactions } = await api.get("/transactions", { params });

      if (!transactions || transactions.length === 0) {
        alert("No transaction records found for the selected date range to export.");
        return;
      }

      const headers = ["Date", "Type", "Category", "Account", "Amount (INR)", "Note"];

      const rows = transactions.map((t) => [
        `"${new Date(t.date).toISOString().split("T")[0]}"`,
        `"${t.type}"`,
        `"${t.category.replace(/"/g, '""')}"`,
        `"${(t.account || "Cash").replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.note || "").replace(/"/g, '""')}"`,
      ]);

      rows.push([]);
      rows.push(["Summary Statistics"]);
      rows.push(["Total Income", summary.income]);
      rows.push(["Total Expense", summary.expense]);
      rows.push(["Net Balance", summary.balance]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const todayStr = getTodayStr();
      link.href = url;
      link.setAttribute("download", `dashboard_report_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export dashboard data", err);
      alert("Failed to export data");
    }
  };

  const pieData = {
    labels: categoryData.map((c) => c.category),
    datasets: [
      {
        data: categoryData.map((c) => c.total),
        backgroundColor: CHART_COLORS,
        borderWidth: 0,
      },
    ],
  };

  const dailyBarData = {
    labels: dailyTrend.map((d) => d.date),
    datasets: [
      {
        label: "Income",
        data: dailyTrend.map((d) => d.income || 0),
        backgroundColor: "#10b981",
        borderRadius: 4,
      },
      {
        label: "Expense",
        data: dailyTrend.map((d) => d.expense || 0),
        backgroundColor: "#ef4444",
        borderRadius: 4,
      },
    ],
  };

  const getTimeframeLabel = () => {
    const todayStr = getTodayStr();
    if (activePreset === "today" || (dateRange.from === todayStr && dateRange.to === todayStr)) {
      return "Today";
    }
    return `${dateRange.from || "Start"} to ${dateRange.to || "Now"}`;
  };

  return (
    <>
      <div className="topbar">
        <h1>Dashboard</h1>
        <button
          className="btn btn-secondary"
          onClick={handleDownloadExcel}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          📥 Download Excel / CSV
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>From:</label>
            <input
              type="date"
              className="input"
              style={{ width: "auto", padding: "6px 10px" }}
              value={dateRange.from}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, from: e.target.value }));
                setActivePreset("custom");
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>To:</label>
            <input
              type="date"
              className="input"
              style={{ width: "auto", padding: "6px 10px" }}
              value={dateRange.to}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, to: e.target.value }));
                setActivePreset("custom");
              }}
            />
          </div>

          {/* Filter Preset Buttons */}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <button
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: activePreset === "today" ? "#10b981" : "#e2e8f0",
                color: activePreset === "today" ? "#ffffff" : "#334155",
              }}
              onClick={() => handlePreset("today")}
            >
              ⚡ Today
            </button>
            <button
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: activePreset === "thisMonth" ? "#10b981" : "#e2e8f0",
                color: activePreset === "thisMonth" ? "#ffffff" : "#334155",
              }}
              onClick={() => handlePreset("thisMonth")}
            >
              This Month
            </button>
            <button
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: activePreset === "last30" ? "#10b981" : "#e2e8f0",
                color: activePreset === "last30" ? "#ffffff" : "#334155",
              }}
              onClick={() => handlePreset("last30")}
            >
              Last 30 Days
            </button>
            <button
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 14px",
                background: activePreset === "thisYear" ? "#10b981" : "#e2e8f0",
                color: activePreset === "thisYear" ? "#ffffff" : "#334155",
              }}
              onClick={() => handlePreset("thisYear")}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading date-wise data...</p>
      ) : (
        <>
          {/* Active Filter Indicator */}
          <div style={{ marginBottom: 16, fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
            📅 Displaying Financial Summary for: <span style={{ color: "#10b981" }}>{getTimeframeLabel()}</span>
          </div>

          {/* KPI Cards */}
          <div className="card-grid">
            <div className="card kpi-card income">
              <div className="label">
                {activePreset === "today" ? "Income (Current Month)" : `Income (${getTimeframeLabel()})`}
              </div>
              <div className="value">₹{summary.income.toLocaleString()}</div>
            </div>
            <div className="card kpi-card expense">
              <div className="label">
                {activePreset === "today" ? "Expense (Today)" : `Expense (${getTimeframeLabel()})`}
              </div>
              <div className="value">₹{summary.expense.toLocaleString()}</div>
            </div>
            <div className="card kpi-card balance">
              <div className="label">
                {activePreset === "today" ? "Net Balance (Month Income - Today Expense)" : `Net Balance (${getTimeframeLabel()})`}
              </div>
              <div className="value">₹{summary.balance.toLocaleString()}</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="chart-grid" style={{ marginBottom: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 15 }}>Category Spending Breakdown ({getTimeframeLabel()})</h3>
              {categoryData.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 14 }}>No expenses recorded for {getTimeframeLabel()}.</p>
              ) : (
                <Pie data={pieData} />
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 15 }}>Income vs Expense Chart ({getTimeframeLabel()})</h3>
              {dailyTrend.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 14 }}>No transactions recorded for {getTimeframeLabel()}.</p>
              ) : (
                <Bar
                  data={dailyBarData}
                  options={{ responsive: true, plugins: { legend: { position: "bottom" } } }}
                />
              )}
            </div>
          </div>

          {/* Date-Wise Data Table */}
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Date-Wise Breakdown ({getTimeframeLabel()})</h3>
            {dailyTrend.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>No transaction data for {getTimeframeLabel()}.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Income</th>
                    <th style={{ textAlign: "right" }}>Expense</th>
                    <th style={{ textAlign: "right" }}>Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((d) => {
                    const net = (d.income || 0) - (d.expense || 0);
                    return (
                      <tr key={d.date}>
                        <td style={{ fontWeight: 600 }}>{d.date}</td>
                        <td style={{ textAlign: "right", color: "#10b981", fontWeight: 600 }}>
                          +₹{(d.income || 0).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", color: "#ef4444", fontWeight: 600 }}>
                          -₹{(d.expense || 0).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: net >= 0 ? "#10b981" : "#ef4444" }}>
                          {net >= 0 ? "+" : ""}₹{net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
