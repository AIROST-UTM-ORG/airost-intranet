const router = require("express").Router();
const passport = require("passport");
const { requireAuth } = require("../middleware/auth");

require('dotenv').config();

const clearSessionCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('connect.sid', {
    path: '/',
    httpOnly: true,
    secure: isProduction && process.env.COOKIE_SECURE !== 'false',
    sameSite: isProduction ? "none" : "lax",
  });
};

router.get('/login/success', (req, res) => {
  try {
    if (req.user) {
      res.status(200).json({
        success: true,
        message: "Successfully authenticated",
        user: req.user,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
  } catch (error) {
    console.error("Error in login success route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication check",
    });
  }
});

router.get('/login/failed', (req, res) => {
  try {
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  } catch (error) {
    console.error("Error in login failed route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error handling authentication failure",
    });
  }
});

const handleLogout = (req, res) => {
  try {
    const finishLogout = () => {
      clearSessionCookie(res);
      if (req.accepts('json') && !req.accepts('html')) {
        return res.status(200).json({
          success: true,
          message: "Successfully logged out",
        });
      }
      return res.redirect((process.env.REACT_APP_URL || 'http://localhost:3000') + "/login");
    };

    const destroySession = () => {
      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("Error destroying session:", destroyErr);
          }
          finishLogout();
        });
      } else {
        finishLogout();
      }
    };

    if (typeof req.logout === 'function') {
      if (req.logout.length > 0) {
        req.logout((err) => {
          if (err) {
            console.error("Error during logout:", err);
            return res.status(500).json({
              success: false,
              message: "Error during logout process",
            });
          }
          destroySession();
        });
      } else {
        req.logout();
        destroySession();
      }
    } else {
      destroySession();
    }
  } catch (error) {
    console.error("Error in logout route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout",
    });
  }
};

router.get('/logout', handleLogout);
router.post('/logout', handleLogout);

router.get('/google', (req, res, next) => {
  try {
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account'
    })(req, res, next);
  } catch (error) {
    console.error("Error initiating Google authentication:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate Google authentication",
    });
  }
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    successRedirect: process.env.REACT_APP_URL,
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

module.exports = router;
