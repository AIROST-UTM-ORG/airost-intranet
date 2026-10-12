require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("dns");
const { createApp } = require("./app");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

const PORT = process.env.PORT || 4000;
const app = createApp();

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("connected to database");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`connected to server on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();
