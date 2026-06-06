const router = require("Express").Router();
const { signup, signin, getCurrentUser } = require("../controllers/users");
const auth = require("../middlewares/auth");

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/users/me", auth, getCurrentUser); // This will run first for auth

modules.exports = router;
