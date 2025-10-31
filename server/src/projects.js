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

// GET /api/projects
router.get('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const userId = req.user.id;
  // Owned
  const owned = await db.all('SELECT * FROM projects WHERE creator_id = ?', userId);
  // Shared (donde es colaborador)
  const shared = await db.all(
    `SELECT p.* FROM projects p 
     JOIN collaborators c ON c.project_id = p.id 
     WHERE c.user_id = ? AND p.creator_id != ?`,
    userId, userId
  );
  res.json({ owned, shared });
});
// POST /api/projects
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Falta nombre.' });
  const db = await getDB();
  // Generar un código único sencillo (6 letras/números)
  let code;
  while (!code || (await db.get('SELECT id FROM projects WHERE code = ?', code))) {
    code = Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  const result = await db.run(
    'INSERT INTO projects (name, code, creator_id, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    name, code, req.user.id
  );
  const project = await db.get('SELECT * FROM projects WHERE id = ?', result.lastID);
  // Insertar como colaborador (rol: 'member')
  await db.run('INSERT INTO collaborators (project_id, user_id, role, added_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', project.id, req.user.id, 'member');
  res.status(201).json(project);
});
// POST /api/projects/join
router.post('/join', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: 'Falta código.' });
  const db = await getDB();
  const project = await db.get('SELECT * FROM projects WHERE code = ?', code);
  if (!project) return res.status(404).json({ message: 'Proyecto no encontrado.' });
  // Checar si ya es colaborador
  const exists = await db.get('SELECT id FROM collaborators WHERE user_id = ? AND project_id = ?', req.user.id, project.id);
  if (exists) return res.status(409).json({ message: 'Ya es colaborador.' });
  await db.run('INSERT INTO collaborators (project_id, user_id, role, added_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', project.id, req.user.id, 'member');
  res.json({ id: project.id, name: project.name, project_code: project.code });
});
// GET /api/projects/:projectId - Solo miembros pueden ver
router.get('/:projectId', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  // Es miembro o creador.
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
  if (!project) return res.status(404).json({ message: 'No encontrado' });
  const isMember = (await db.get('SELECT id FROM collaborators WHERE project_id = ? AND user_id = ?', projectId, userId)) || project.creator_id === userId;
  if (!isMember) return res.status(403).json({ message: 'Sin acceso' });
  res.json(project);
});

// PUT /api/projects/:projectId - Solo creator puede actualizar nombre
router.put('/:projectId', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Falta nombre.' });
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
  if (!project) return res.status(404).json({ message: 'No encontrado' });
  if (project.creator_id !== req.user.id) return res.status(403).json({ message: 'Solo el creador puede editar.' });
  await db.run('UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', name, projectId);
  const updated = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
  res.json(updated);
});

// DELETE /api/projects/:projectId - Solo creator
router.delete('/:projectId', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
  if (!project) return res.status(404).json({ message: 'No encontrado' });
  if (project.creator_id !== req.user.id) return res.status(403).json({ message: 'Solo el creador puede borrar.' });
  await db.run('DELETE FROM projects WHERE id = ?', projectId);
  res.json({ message: 'Proyecto borrado'});
});

module.exports = router;
