const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: [1, "Target must be greater than 0"] },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);
