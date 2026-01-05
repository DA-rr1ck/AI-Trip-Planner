const express = require("express");
const hotelSerpController = require("../controllers/hotelSerpController");

const router = express.Router();

router.get("/hotel/details", hotelSerpController.getDetails);

module.exports = router;
