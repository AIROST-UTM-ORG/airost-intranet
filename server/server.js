const express = require("express");
require('dotenv').config();
const cookieSession = require("cookie-session");
const passport = require("passport");
const passportSetup = require("./passport")
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/auth");
const session = require('express-session')
const mongoose = require('mongoose')
const DocRoutes = require('./routes/docRoutes')
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const projectRoutes = require('./routes/projectsRoutes');
const dns = require('dns');
// dns.setDefaultResultOrder('ipv4first'); 

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

const PORT = process.env.PORT || 4000
// Connect to db
const connectDatabase = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("connected to database");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

connectDatabase();
app.use(express.json())
app.set("trust proxy", 1);
// app.use(cookieSession({
//     name:"session",
//     keys:["key1","key2"],
//     maxAge: 24 * 60 * 60 * 100,
// }))
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.PASSPORT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  },
  proxy: isProduction,
}))
app.use(passport.authenticate('session'))

app.use(passport.initialize())
app.use(passport.session());


app.use(cors({
  origin: process.env.REACT_APP_URL,
  methods: "GET, POST, PUT, DELETE",
  credentials: true,
  exposedHeaders: ["set-cookie"]
}))

app.use("/auth", authRoutes)

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

app.use('/airost/doc', DocRoutes)

app.use('/admin', adminRoutes)
app.use('/user', userRoutes)
app.use('/projects', projectRoutes)
app.use('/calendar', eventRoutes)
app.listen(PORT, '0.0.0.0', () => {
  console.log("connected to server")
})
