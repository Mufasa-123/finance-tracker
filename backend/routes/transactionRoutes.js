const express = require("express");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth); // all routes below require login

// @route  GET /api/transactions?type=&category=&from=&to=
router.get("/", async (req, res) => {
  try {
    const { type, category, from, to } = req.query;
    const filter = { user: req.userId };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) {
        const parts = from.split("-");
        if (parts.length === 3) {
          filter.date.$gte = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
        } else {
          filter.date.$gte = new Date(from);
        }
      }
      if (to) {
        const parts = to.split("-");
        if (parts.length === 3) {
          filter.date.$lte = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
        } else {
          const endDate = new Date(to);
          endDate.setHours(23, 59, 59, 999);
          filter.date.$lte = endDate;
        }
      }
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
  }
});

// @route  POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const { type, amount, category, account, note, date } = req.body;

    if (!type || !["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be 'income' or 'expense'" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (category === "Other" && (!note || !note.trim())) {
      return res.status(400).json({ message: "A reason/note is mandatory when 'Other' category is selected" });
    }
    if (date && new Date(date) > new Date()) {
      return res.status(400).json({ message: "Date cannot be in the future" });
    }

    // Simple duplicate check: same user, amount, category, date (same day)
    const dayStart = new Date(date || Date.now());
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const possibleDuplicate = await Transaction.findOne({
      user: req.userId,
      amount,
      category,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      amount,
      category,
      account: account || "Cash",
      note: note || "",
      date: date || Date.now(),
    });

    res.status(201).json({
      transaction,
      duplicateWarning: possibleDuplicate
        ? "A similar transaction already exists for this date/amount/category"
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create transaction", error: err.message });
  }
});

// @route  PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const { type, amount, category, account, note, date } = req.body;
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const targetCategory = category || transaction.category;
    const targetNote = note !== undefined ? note : transaction.note;

    if (targetCategory === "Other" && (!targetNote || !targetNote.trim())) {
      return res.status(400).json({ message: "A reason/note is mandatory when 'Other' category is selected" });
    }

    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = amount;
    if (category) transaction.category = category;
    if (account) transaction.account = account;
    if (note !== undefined) transaction.note = note;
    if (date) transaction.date = date;

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: "Failed to update transaction", error: err.message });
  }
});

// @route  DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete transaction", error: err.message });
  }
});

module.exports = router;
