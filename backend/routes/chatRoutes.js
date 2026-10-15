const express = require("express");
const mongoose = require("mongoose");
const https = require("https");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

// Helper to call Gemini API if key exists
async function callGeminiAPI(apiKey, prompt, contextData) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `You are FinAI, an intelligent, friendly, and helpful personal finance assistant integrated into a Finance Tracker web application.
Below is the user's REAL-TIME financial data extracted directly from their account database:

=== USER FINANCIAL CONTEXT ===
${JSON.stringify(contextData, null, 2)}

=== INSTRUCTIONS ===
1. Always answer the user's question accurately using their real-time financial context above.
2. If asked "What's my expense today?" or similar, report today's total expenses and list the specific expenses if available.
3. Keep answers clear, concise, friendly, and formatted nicely with bold text, bullet points, and currency symbols ($).
4. If the user asks for financial advice or tips, provide actionable suggestions based on their spending, budget status, and goals.
5. Be natural and conversational.
`;

    const requestData = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: `User Question: "${prompt}"` }
          ]
        }
      ]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const parsedUrl = new URL(url);

    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestData),
        },
        timeout: 10000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const json = JSON.parse(body);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                resolve(text);
                return;
              }
            }
            reject(new Error(`Gemini API error status ${res.statusCode}`));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Gemini API timeout"));
    });

    req.write(requestData);
    req.end();
  });
}

// Fallback Natural Language Response Engine
function generateRuleBasedResponse(query, ctx) {
  const q = query.toLowerCase().trim();

  // 1. Expense Today / Spent Today
  if (
    q.includes("expense today") ||
    q.includes("spent today") ||
    q.includes("today expense") ||
    q.includes("spending today") ||
    q.includes("today's expense") ||
    (q.includes("today") && (q.includes("expense") || q.includes("spend") || q.includes("cost") || q.includes("pay") || q.includes("bought")))
  ) {
    if (ctx.today.expenseCount === 0) {
      return `🎉 You haven't recorded any expenses today (${ctx.today.dateStr})! Your spending today is **$0.00**.`;
    }
    let details = ctx.today.expenseList
      .map((t) => `• **${t.category}**: $${t.amount.toFixed(2)}${t.note ? ` (${t.note})` : ""}`)
      .join("\n");
    return `📊 **Today's Expenses (${ctx.today.dateStr}):**\n\nTotal spent today: **$${ctx.today.expenseTotal.toFixed(2)}** across **${ctx.today.expenseCount}** transaction(s).\n\n**Breakdown:**\n${details}`;
  }

  // 2. Income Today
  if (
    q.includes("income today") ||
    q.includes("earned today") ||
    q.includes("made today") ||
    (q.includes("today") && (q.includes("income") || q.includes("earn")))
  ) {
    if (ctx.today.incomeCount === 0) {
      return `💵 You haven't recorded any income today (${ctx.today.dateStr}).`;
    }
    return `💵 **Today's Income:**\n\nTotal earned today: **$${ctx.today.incomeTotal.toFixed(2)}** across **${ctx.today.incomeCount}** transaction(s).`;
  }

  // 3. Today Summary / Overview
  if (q.includes("today")) {
    return `📅 **Summary for Today (${ctx.today.dateStr}):**\n\n• **Expenses:** $${ctx.today.expenseTotal.toFixed(2)} (${ctx.today.expenseCount} items)\n• **Income:** $${ctx.today.incomeTotal.toFixed(2)}\n• **Net Today:** $${(ctx.today.incomeTotal - ctx.today.expenseTotal).toFixed(2)}`;
  }

  // 4. Monthly Expense / Spent this month
  if (
    q.includes("expense this month") ||
    q.includes("spent this month") ||
    q.includes("monthly expense") ||
    q.includes("month's expense") ||
    (q.includes("month") && (q.includes("expense") || q.includes("spend") || q.includes("cost")))
  ) {
    return `🗓️ **Expenses for ${ctx.thisMonth.monthName}:**\n\nTotal spent this month: **$${ctx.thisMonth.expenseTotal.toFixed(2)}** across **${ctx.thisMonth.expenseCount}** transaction(s).`;
  }

  // 5. Monthly Income
  if (
    q.includes("income this month") ||
    q.includes("earned this month") ||
    q.includes("monthly income") ||
    (q.includes("month") && (q.includes("income") || q.includes("earn")))
  ) {
    return `💰 **Income for ${ctx.thisMonth.monthName}:**\n\nTotal income this month: **$${ctx.thisMonth.incomeTotal.toFixed(2)}**.`;
  }

  // 6. Balance / Money Left / How much money do I have
  if (
    q.includes("balance") ||
    q.includes("how much money") ||
    q.includes("net worth") ||
    q.includes("total money") ||
    q.includes("how much do i have")
  ) {
    const net = ctx.allTime.incomeTotal - ctx.allTime.expenseTotal;
    return `💳 **Overall Financial Status:**\n\n• **Total Balance:** **$${net.toFixed(2)}**\n• **Total Income Recorded:** $${ctx.allTime.incomeTotal.toFixed(2)}\n• **Total Expenses Recorded:** $${ctx.allTime.expenseTotal.toFixed(2)}`;
  }

  // 7. Highest Expense / Category Breakdown / Where did I spend the most
  if (
    q.includes("highest expense") ||
    q.includes("most money") ||
    q.includes("category") ||
    q.includes("where did i spend") ||
    q.includes("breakdown")
  ) {
    if (!ctx.categoriesThisMonth || ctx.categoriesThisMonth.length === 0) {
      return `📊 No expense categories recorded for this month yet.`;
    }
    const topCat = ctx.categoriesThisMonth[0];
    const catList = ctx.categoriesThisMonth
      .map((c) => `• **${c.category}**: $${c.total.toFixed(2)}`)
      .join("\n");
    return `🏷️ **Category Breakdown (${ctx.thisMonth.monthName}):**\n\nYour top spending category is **${topCat.category}** ($${topCat.total.toFixed(2)}).\n\n**All Categories:**\n${catList}`;
  }

  // 8. Recent Transactions / Transaction History
  if (
    q.includes("recent") ||
    q.includes("history") ||
    q.includes("transaction") ||
    q.includes("bought") ||
    q.includes("list")
  ) {
    if (!ctx.recentTransactions || ctx.recentTransactions.length === 0) {
      return `📜 You don't have any recorded transactions yet. Click "+ Add Transaction" on the Dashboard to get started!`;
    }
    const list = ctx.recentTransactions
      .slice(0, 5)
      .map(
        (t) =>
          `• **${new Date(t.date).toLocaleDateString()}** | ${t.type === "income" ? "🟢 +" : "🔴 -"}$${t.amount.toFixed(2)} (${t.category}) ${t.note ? `- "${t.note}"` : ""}`
      )
      .join("\n");
    return `📜 **Your 5 Most Recent Transactions:**\n\n${list}`;
  }

  // 9. Budgets
  if (q.includes("budget") || q.includes("limit") || q.includes("exceed")) {
    if (!ctx.budgets || ctx.budgets.length === 0) {
      return `🎯 You haven't set up any budgets for this month yet! Go to the **Budgets** section to create one.`;
    }
    const list = ctx.budgets
      .map((b) => {
        const spent = b.spent || 0;
        const pct = ((spent / b.limitAmount) * 100).toFixed(0);
        const status = spent > b.limitAmount ? "⚠️ EXCEEDED" : `${pct}% used`;
        return `• **${b.category}**: $${spent.toFixed(2)} / $${b.limitAmount.toFixed(2)} (${status})`;
      })
      .join("\n");
    return `🎯 **Budgets Status (${ctx.thisMonth.monthName}):**\n\n${list}`;
  }

  // 10. Goals / Savings
  if (q.includes("goal") || q.includes("saving") || q.includes("target")) {
    if (!ctx.goals || ctx.goals.length === 0) {
      return `🏁 You don't have any savings goals set up yet. Visit the **Goals** tab to set your target savings!`;
    }
    const list = ctx.goals
      .map((g) => {
        const pct = ((g.savedAmount / g.targetAmount) * 100).toFixed(0);
        return `• **${g.title}**: $${g.savedAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)} (${pct}% saved)`;
      })
      .join("\n");
    return `🏁 **Savings Goals Progress:**\n\n${list}`;
  }

  // 11. Advice / Tips / How to save money
  if (
    q.includes("advice") ||
    q.includes("tip") ||
    q.includes("save money") ||
    q.includes("suggest") ||
    q.includes("help")
  ) {
    let advice = `💡 **Personalized Financial Tips for You:**\n\n`;
    if (ctx.categoriesThisMonth && ctx.categoriesThisMonth.length > 0) {
      advice += `1. **Watch your ${ctx.categoriesThisMonth[0].category} spending**: It's your highest expense this month ($${ctx.categoriesThisMonth[0].total.toFixed(2)}).\n`;
    } else {
      advice += `1. **Track all daily expenses**: Even small purchases like coffee add up over time!\n`;
    }
    advice += `2. **Follow the 50/30/20 Rule**: Allocate 50% of income to Needs, 30% to Wants, and 20% to Savings.\n`;
    advice += `3. **Set Monthly Budgets**: You can set category limits in the Budgets tab to keep spending under control.`;
    return advice;
  }

  // Default friendly greeting / fallback
  return `🤖 Hi! I'm **FinAI**, your financial assistant. Here is a quick snapshot of your account:\n\n` +
    `• **Today's Expense:** $${ctx.today.expenseTotal.toFixed(2)}\n` +
    `• **This Month's Expense:** $${ctx.thisMonth.expenseTotal.toFixed(2)}\n` +
    `• **Total Net Balance:** $${(ctx.allTime.incomeTotal - ctx.allTime.expenseTotal).toFixed(2)}\n\n` +
    `You can ask me questions like:\n` +
    `👉 *"What's my expense today?"*\n` +
    `👉 *"How much did I spend this month?"*\n` +
    `👉 *"Show my recent transactions"*\n` +
    `👉 *"What are my top spending categories?"*\n` +
    `👉 *"How are my budgets doing?"*`;
}

// @route POST /api/chat
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    // 1. Gather live financial context
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch Today's Transactions
    const todayTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ date: -1 });

    const todayExpenses = todayTransactions.filter((t) => t.type === "expense");
    const todayIncomes = todayTransactions.filter((t) => t.type === "income");

    const todayExpenseTotal = todayExpenses.reduce((sum, t) => sum + t.amount, 0);
    const todayIncomeTotal = todayIncomes.reduce((sum, t) => sum + t.amount, 0);

    // Fetch Monthly Transactions
    const monthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const monthExpenseTotal = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthIncomeTotal = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    // Category Breakdown this month
    const categoryAgg = await Transaction.aggregate([
      { $match: { user: userId, type: "expense", date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);

    // All Time Summary
    const allTimeAgg = await Transaction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    const allTimeIncome = allTimeAgg.find((a) => a._id === "income")?.total || 0;
    const allTimeExpense = allTimeAgg.find((a) => a._id === "expense")?.total || 0;

    // Recent Transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .limit(10);

    // Budgets
    const userBudgets = await Budget.find({
      user: userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // Calculate budget spending per category
    const budgetsWithSpent = userBudgets.map((b) => {
      const catSpent = monthTransactions
        .filter((t) => t.type === "expense" && t.category.toLowerCase() === b.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category: b.category,
        limitAmount: b.limitAmount,
        spent: catSpent,
      };
    });

    // Goals
    const userGoals = await Goal.find({ user: userId });

    const contextData = {
      today: {
        dateStr: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        expenseTotal: todayExpenseTotal,
        expenseCount: todayExpenses.length,
        incomeTotal: todayIncomeTotal,
        incomeCount: todayIncomes.length,
        expenseList: todayExpenses.map((t) => ({
          category: t.category,
          amount: t.amount,
          note: t.note,
          account: t.account,
        })),
      },
      thisMonth: {
        monthName: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        expenseTotal: monthExpenseTotal,
        expenseCount: monthTransactions.filter((t) => t.type === "expense").length,
        incomeTotal: monthIncomeTotal,
        incomeCount: monthTransactions.filter((t) => t.type === "income").length,
      },
      allTime: {
        incomeTotal: allTimeIncome,
        expenseTotal: allTimeExpense,
      },
      categoriesThisMonth: categoryAgg.map((c) => ({ category: c._id, total: c.total })),
      recentTransactions: recentTransactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        note: t.note,
        date: t.date,
      })),
      budgets: budgetsWithSpent,
      goals: userGoals.map((g) => ({ title: g.title, targetAmount: g.targetAmount, savedAmount: g.savedAmount })),
    };

    // 2. Response Generation (LLM or Fallback Rule Engine)
    let aiReply = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        aiReply = await callGeminiAPI(process.env.GEMINI_API_KEY, message, contextData);
      } catch (geminiError) {
        console.error("Gemini API call failed, falling back to rule engine:", geminiError.message);
      }
    }

    if (!aiReply) {
      aiReply = generateRuleBasedResponse(message, contextData);
    }

    res.json({ reply: aiReply, contextSummary: { todayExpenses: todayExpenseTotal, todayIncome: todayIncomeTotal } });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ message: "Failed to process chat message", error: err.message });
  }
});

module.exports = router;
