const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Helper function to build date filter safely
const getDateFilter = (userId, from, to) => {
  const matchFilter = { user: new mongoose.Types.ObjectId(userId) };

  if (from || to) {
    matchFilter.date = {};
    if (from) {
      const parts = from.split("-");
      if (parts.length === 3) {
        const startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
        matchFilter.date.$gte = startDate;
      } else {
        matchFilter.date.$gte = new Date(from);
      }
    }
    if (to) {
      const parts = to.split("-");
      if (parts.length === 3) {
        const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
        matchFilter.date.$lte = endDate;
      } else {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        matchFilter.date.$lte = endDate;
      }
    }
  } else {
    // Default to current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    matchFilter.date = { $gte: monthStart, $lte: monthEnd };
  }

  return matchFilter;
};

// @route  GET /api/dashboard/summary?from=&to=
router.get("/summary", async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchFilter = getDateFilter(req.userId, from, to);

    const agg = await Transaction.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    const income = agg.find((a) => a._id === "income")?.total || 0;
    const expense = agg.find((a) => a._id === "expense")?.total || 0;

    res.json({ income, expense, balance: income - expense });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
});

// @route  GET /api/dashboard/category-breakdown?from=&to=
router.get("/category-breakdown", async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchFilter = getDateFilter(req.userId, from, to);
    matchFilter.type = "expense";

    const data = await Transaction.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);

    res.json(data.map((d) => ({ category: d._id, total: d.total })));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch category breakdown", error: err.message });
  }
});

// @route  GET /api/dashboard/daily-trend?from=&to=
// Date-wise daily breakdown of income and expenses
router.get("/daily-trend", async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchFilter = getDateFilter(req.userId, from, to);

    const data = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.dateStr": 1 } },
    ]);

    const map = {};
    data.forEach((d) => {
      const dateKey = d._id.dateStr;
      if (!map[dateKey]) map[dateKey] = { date: dateKey, income: 0, expense: 0 };
      map[dateKey][d._id.type] = d.total;
    });

    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch daily trend", error: err.message });
  }
});

// @route  GET /api/dashboard/monthly-trend
router.get("/monthly-trend", async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const data = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId), date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const map = {};

    data.forEach((d) => {
      const key = `${monthNames[d._id.month - 1]} ${d._id.year}`;
      if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
      map[key][d._id.type] = d.total;
    });

    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch monthly trend", error: err.message });
  }
});

module.exports = router;
