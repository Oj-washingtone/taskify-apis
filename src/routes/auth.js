const express = require("express");
const rateLimit = require("express-rate-limit");
const authenticate = require("../middleware/auth");
const {
  register,
  login,
  socialLogin,
  logout,
  refresh,
} = require("../controllers/authController");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/social", authLimiter, socialLogin);
router.post("/logout", authenticate, logout);
router.post("/refresh-token", authLimiter, refresh);

module.exports = router;
