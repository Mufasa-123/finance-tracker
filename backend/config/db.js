const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (err.message.includes("ECONNREFUSED")) {
      console.error("\n👉 Local MongoDB is not running on 127.0.0.1:27017.");
      console.error("Please either:\n 1. Start your local MongoDB service, OR\n 2. Update MONGO_URI in backend/.env to use a free MongoDB Atlas cluster URL.\n");
    }
    process.exit(1);
  }
};

module.exports = connectDB;
