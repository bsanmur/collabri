const express = require('express');
const { getDB } = require('./auth/db');
const jwt = require('jsonwebtoken');
const router = express.Router({ mergeParams: true });
const { sendToUser } = require('./socketio');

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

// GET /api/projects/:projectId/tasks
router.get('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const tasks = await db.all('SELECT * FROM tasks WHERE project_id=?', projectId);
  res.json(tasks);
});
// POST /api/projects/:projectId/tasks
router.post('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  const { title, description, assignee_id } = req.body;
  if (!title) return res.status(400).json({ message: 'Falta título.' });
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const result = await db.run(
    'INSERT INTO tasks (project_id, title, description, status, assignee_id, created_at, updated_at) VALUES (?, ?, ?, "todo", ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    projectId, title, description || '', assignee_id || null
  );
  const task = await db.get('SELECT * FROM tasks WHERE id=?', result.lastID);
  // Emitir notificación si assignee
  if (assignee_id) {
    const assignee = await db.get('SELECT email FROM users WHERE id=?', assignee_id);
    sendToUser(assignee_id, {
      type: 'taskAssigned',
      data: {
        task: { id: task.id, title: task.title, projectId: Number(projectId) },
        assignedToId: assignee_id,
        assignedToEmail: assignee ? assignee.email : null,
        assignedById: userId,
        createdAt: new Date().toISOString()
      }
    });
  }
  res.status(201).json(task);
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId, taskId } = req.params;
  const userId = req.user.id;
  const { title, description, status, assignee_id } = req.body;
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const task = await db.get('SELECT * FROM tasks WHERE id=? AND project_id=?', taskId, projectId);
  if (!task) return res.status(404).json({ message: 'No encontrada' });
  // Actualizar campos modificados
  const updates = [];
  const values = [];
  let assigneeChanged = false;
  if (title !== undefined) { updates.push('title=?'); values.push(title); }
  if (description !== undefined) { updates.push('description=?'); values.push(description); }
  if (status !== undefined) { updates.push('status=?'); values.push(status); }
  if (assignee_id !== undefined && assignee_id !== task.assignee_id) { updates.push('assignee_id=?'); values.push(assignee_id); assigneeChanged = true; }
  if (updates.length === 0) return res.status(400).json({ message: 'Nada que actualizar.' });
  values.push(taskId);
  await db.run(`UPDATE tasks SET ${updates.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, ...values);
  // Reglas: insertar en task_history (si cambia status)
  if (status && status !== task.status) {
    await db.run('INSERT INTO task_history (task_id, from_status, to_status, changed_by, changed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', taskId, task.status, status, userId);
  }
  // Emitir notificación si cambia assignee
  if (assigneeChanged && assignee_id) {
    const assignee = await db.get('SELECT email FROM users WHERE id=?', assignee_id);
    sendToUser(assignee_id, {
      type: 'taskAssigned',
      data: {
        task: { id: Number(taskId), title: title ?? task.title, projectId: Number(projectId) },
        assignedToId: assignee_id,
        assignedToEmail: assignee ? assignee.email : null,
        assignedById: userId,
        createdAt: new Date().toISOString()
      }
    });
  }
  const updated = await db.get('SELECT * FROM tasks WHERE id=?', taskId);
  res.json(updated);
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId, taskId } = req.params;
  const userId = req.user.id;
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  const task = await db.get('SELECT * FROM tasks WHERE id=? AND project_id=?', taskId, projectId);
  if (!task) return res.status(404).json({ message: 'No encontrada' });
  await db.run('DELETE FROM tasks WHERE id=?', taskId);
  res.json({ message: 'Tarea eliminada' });
});

module.exports = router;
