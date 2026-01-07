const express = require("express");
const attractionSerpController = require("../controllers/attractionSerpController");

const router = express.Router();

router.get("/attraction/details", attractionSerpController.getDetails);

module.exports = router;
