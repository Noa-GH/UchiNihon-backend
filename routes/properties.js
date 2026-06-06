const router = require("Express").Router();
const {
  getSavedProperties,
  saveProperty,
  unsaveProperty,
} = require("../controllers/properties");
const auth = require("../middlewares/auth");

// Any route requires a valid token automatically
router.use(auth);

router.get("/properties/saved", getSavedProperties);
router.post("/properties/saved", saveProperty);
router.delete("/properties/saved/:id", unsaveProperty);

module.exports = router;
