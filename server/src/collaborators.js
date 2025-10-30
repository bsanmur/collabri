const express = require('express');
const { getDB } = require('./auth/db');
const jwt = require('jsonwebtoken');
const router = express.Router({ mergeParams: true });

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No autorizado' });
  let payload;
  try {
    payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
  req.user = payload;
  next();
}
// GET /api/projects/:projectId/collaborators
router.get('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const cols = await db.all('SELECT u.id, u.name, u.email, c.role FROM collaborators c JOIN users u ON u.id = c.user_id WHERE c.project_id = ?', projectId);
  res.json(cols);
});
// POST /api/projects/:projectId/collaborators
router.post('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Falta email' });
  // Debe ser miembro
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const user = await db.get('SELECT id, email FROM users WHERE email=?', email);
  if (!user) return res.status(404).json({ message: 'Usuario no existe' });
  const exists = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, user.id);
  if (exists) return res.status(409).json({ message: 'Ya es colaborador' });
  await db.run('INSERT INTO collaborators (project_id, user_id, role, added_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', projectId, user.id, 'member');
  res.json({ id: user.id, email: user.email });
});

module.exports = router;
