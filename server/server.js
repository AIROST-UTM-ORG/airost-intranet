require("dotenv").config();

const mongoose = require("mongoose");
const { createApp } = require("./app");
const dns = require("dns");

const PORT = process.env.PORT || 4000;
const app = createApp();


// MongoDB connection
// Go to MongoDB Atlas > Security > IP Access List, click add IP Address (from the warning)
// After that, go to Computer Setting > Network & Internet > WIFI > Hardware Properties > Change IPv4 server to 8.8.8.8, 8.8.8.4 ; Change IPv6 server to 2001:4860:4860::8888, 2001:4860:4860::8844 
// npm run start 
// Please delete this guideline if you found other alternative

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

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
