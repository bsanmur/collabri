const express = require('express');
const { getDB } = require('./auth/db');
const jwt = require('jsonwebtoken');
const router = express.Router();

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

// GET /api/reports/:reportId/status
router.get('/:reportId/status', requireAuth, async (req, res) => {

  console.log("Consultando estado del reporte:", req.params.reportId);

  const db = await getDB();
  const { reportId } = req.params;
  const userId = req.user.id;
  const report = await db.get('SELECT * FROM reports WHERE id = ?', reportId);
  if (!report) return res.status(404).json({ message: 'No encontrado' });
  // Verificar miembro
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', report.project_id, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  res.json({ status: report.status, result_url: report.result_url });
});

module.exports = router;
