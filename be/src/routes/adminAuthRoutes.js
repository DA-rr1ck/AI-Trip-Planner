const express = require("express");
const adminAuthController = require("../controllers/adminAuthController");

const router = express.Router();

router.post("/login", adminAuthController.login);
router.get("/me", adminAuthController.me);
router.post("/logout", adminAuthController.logout);

module.exports = router;
