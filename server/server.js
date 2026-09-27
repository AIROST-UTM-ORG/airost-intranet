const express = require("express");
const passport = require("passport");
const passportSetup = require("./passport");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/auth");
const session = require("express-session");
const mongoose = require("mongoose");
const DocRoutes = require("./routes/docRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const eventRoutes = require("./routes/eventRoutes");
const projectRoutes = require("./routes/projectsRoutes");

require("dotenv").config();

const PORT = process.env.PORT || 4000;

// Connect to db
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("connected to database");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

connectDatabase();

app.set("trust proxy", 1);
app.use(express.json());

// CORS configuration - placed before session and passport middlewares
const allowedOrigins = [
  process.env.REACT_APP_URL,
  "http://localhost:3000",
  "http://localhost:1234",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:1234",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

const isProduction = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.PASSPORT_SECRET || "airost-intranet-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction && process.env.COOKIE_SECURE !== "false",
      sameSite: isProduction ? "none" : "lax",
    },
    proxy: isProduction,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);

app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

app.use("/airost/doc", DocRoutes);
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);
app.use("/projects", projectRoutes);
app.use("/calendar", eventRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`connected to server on port ${PORT}`);
});
