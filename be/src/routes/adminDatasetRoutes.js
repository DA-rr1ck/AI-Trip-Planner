const express = require("express");
const adminDatasetController = require("../controllers/adminDatasetController");

const router = express.Router();

// /api/admin/datasets
router.get("/:collection", adminDatasetController.listByProvince);
router.get("/:collection/:id", adminDatasetController.getById);
router.post("/:collection", adminDatasetController.create);
router.put("/:collection/:id", adminDatasetController.update);
router.delete("/:collection/:id", adminDatasetController.remove);

module.exports = router;
