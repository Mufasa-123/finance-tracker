# Personal Finance & Expense Tracker (MERN Stack)

A mini project implementing: Auth, Transactions, Budgets (with threshold alerts), Savings Goals, and a Dashboard with charts (Chart.js).

## What's included
- **Backend**: Node.js + Express + MongoDB (Mongoose), JWT auth, bcrypt password hashing
- **Frontend**: React (functional components + hooks), React Router, Chart.js via react-chartjs-2, Axios

## Folder Structure
```
finance-tracker/
├── backend/
│   ├── config/db.js
│   ├── models/        (User, Transaction, Budget, Goal)
│   ├── routes/         (auth, transactions, budgets, goals, dashboard)
│   ├── middleware/auth.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/axios.js
        ├── context/AuthContext.js
        ├── components/  (Sidebar, ProtectedRoute, modals)
        ├── pages/        (Login, Signup, Dashboard, Transactions, Budgets, Goals)
        └── App.js
```

## Setup Instructions

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGO_URI (local Mongo or MongoDB Atlas) and a random JWT_SECRET
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Default REACT_APP_API_URL=http://localhost:5000/api works if backend runs locally
npm start
```
Frontend runs on `http://localhost:3000`.

### 3. MongoDB
- Easiest option: create a free cluster on MongoDB Atlas, copy the connection string into `MONGO_URI`.
- Or install MongoDB locally and use `mongodb://127.0.0.1:27017/finance_tracker`.

## What's implemented
- Signup/Login with JWT, password hashing (bcrypt)
- Add/view/delete transactions with type, category, account, date, note
- Basic duplicate-transaction warning (same amount+category+day)
- Budgets per category/month with spent-vs-limit progress and status (safe/warning/exceeded)
- Savings goals with contribution tracking and progress bar
- Dashboard: KPI cards (income/expense/balance), category-wise pie chart, 6-month income vs expense bar chart
- Validations: positive amounts, no future dates, required fields, password length, goal target date in future

## Ideas to extend further (not built yet, good for viva/future scope)
- CSV bank statement import + reconciliation
- Recurring transactions (cron-based auto-posting)
- Email/browser notifications
- Edit transaction (currently only add/delete; PUT route already exists in backend)
- PDF/CSV export of reports
- Multi-account balance tracking

## Default categories used
Food, Travel, Bills, Shopping, Health, Entertainment, Salary, Freelance, Other
(Editable in `TransactionModal.js` and `BudgetModal.js`)
