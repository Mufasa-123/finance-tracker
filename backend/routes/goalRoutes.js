const express = require("express");
const Goal = require("../models/Goal");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// @route  GET /api/goals
router.get("/", async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.userId }).sort({ targetDate: 1 });

    const withProgress = goals.map((g) => ({
      ...g.toObject(),
      percentComplete: Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)),
      remaining: Math.max(0, g.targetAmount - g.savedAmount),
    }));

    res.json(withProgress);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch goals", error: err.message });
  }
});

// @route  POST /api/goals
router.post("/", async (req, res) => {
  try {
    const { title, targetAmount, targetDate } = req.body;

    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ message: "Title, targetAmount and targetDate are required" });
    }
    if (targetAmount <= 0) {
      return res.status(400).json({ message: "Target amount must be greater than 0" });
    }
    if (new Date(targetDate) <= new Date()) {
      return res.status(400).json({ message: "Target date must be in the future" });
    }

    const goal = await Goal.create({ user: req.userId, title, targetAmount, targetDate });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: "Failed to create goal", error: err.message });
  }
});

// @route  PUT /api/goals/:id/contribute
// Add a contribution amount towards a goal and log an expense transaction
router.put("/:id/contribute", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Contribution amount must be greater than 0" });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Goal not found" });

    goal.savedAmount += amount;
    await goal.save();

    // Automatically create an expense transaction so overall balance is reduced
    await Transaction.create({
      user: req.userId,
      type: "expense",
      amount: amount,
      category: "Savings Goal",
      account: "Cash",
      note: `Goal Contribution: ${goal.title}`,
      date: new Date(),
    });

    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: "Failed to update goal", error: err.message });
  }
});

// @route  DELETE /api/goals/:id
router.delete("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json({ message: "Goal deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete goal", error: err.message });
  }
});

module.exports = router;
