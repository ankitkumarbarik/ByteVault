const express = require("express");
const { exportJson } = require("../controllers/export");
const protect = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.get("/json", exportJson);

module.exports = router;
