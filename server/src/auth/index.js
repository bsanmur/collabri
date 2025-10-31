// Collabrí - endpoints de autenticación (register/login)
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDB } = require("./db");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// Registrar usuario
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Campos requeridos." });
  }
  const db = await getDB();
  const userExist = await db.get("SELECT id FROM users WHERE email = ?", email);
  if (userExist) {
    return res.status(409).json({ message: "Usuario ya existe." });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await db.run(
    "INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    name,
    email,
    hash
  );
  const user = await db.get(
    "SELECT id, name, email FROM users WHERE email = ?",
    email
  );
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
  res.status(201).json({ token, user });
});

// Login
router.post("/login", async (req, res) => {
  console.log("Login attempt:", req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Campos requeridos." });
  }
  const db = await getDB();
  const user = await db.get("SELECT * FROM users WHERE email = ?", email);
  if (!user)
    return res
      .status(404)
      .json({ message: "Usuario o contraseña incorrectos." });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    return res
      .status(401)
      .json({ message: "Usuario o contraseña incorrectos." });
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
