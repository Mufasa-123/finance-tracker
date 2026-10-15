const express = require("express");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// @route  GET /api/budgets?month=&year=
// Returns budgets along with how much has been spent per category (progress)
router.get("/", async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const budgets = await Budget.find({ user: req.userId, month, year });

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const results = await Promise.all(
      budgets.map(async (budget) => {
        const spentAgg = await Transaction.aggregate([
          {
            $match: {
              user: budget.user,
              type: "expense",
              category: budget.category,
              date: { $gte: monthStart, $lte: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const spent = spentAgg[0]?.total || 0;
        const percentUsed = Math.round((spent / budget.limitAmount) * 100);

        return {
          _id: budget._id,
          category: budget.category,
          limitAmount: budget.limitAmount,
          month: budget.month,
          year: budget.year,
          spent,
          percentUsed,
          status: percentUsed >= 100 ? "exceeded" : percentUsed >= 80 ? "warning" : "safe",
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch budgets", error: err.message });
  }
});

// @route  POST /api/budgets
router.post("/", async (req, res) => {
  try {
    const { category, limitAmount, month, year } = req.body;

    if (!category || !limitAmount || !month || !year) {
      return res.status(400).json({ message: "Category, limitAmount, month and year are required" });
    }
    if (limitAmount <= 0) {
      return res.status(400).json({ message: "Budget limit must be greater than 0" });
    }

    const budget = await Budget.create({
      user: req.userId,
      category,
      limitAmount,
      month,
      year,
    });

    res.status(201).json(budget);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A budget for this category and month already exists" });
    }
    res.status(500).json({ message: "Failed to create budget", error: err.message });
  }
});

// @route  PUT /api/budgets/:id
router.put("/:id", async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
    if (!budget) return res.status(404).json({ message: "Budget not found" });

    const { limitAmount } = req.body;
    if (limitAmount !== undefined) {
      if (limitAmount <= 0) {
        return res.status(400).json({ message: "Budget limit must be greater than 0" });
      }
      budget.limitAmount = limitAmount;
    }

    await budget.save();
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: "Failed to update budget", error: err.message });
  }
});

// @route  DELETE /api/budgets/:id
router.delete("/:id", async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    res.json({ message: "Budget deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete budget", error: err.message });
  }
});

module.exports = router;
