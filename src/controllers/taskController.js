const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

function formatTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: Boolean(row.completed),
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createTask(req, res, next) {
  try {
    const { title, description, dueDate } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const taskId = uuidv4();
    const db = getDb();

    db.prepare(`
      INSERT INTO tasks (id, user_id, title, description, due_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      taskId,
      req.user.id,
      title.trim(),
      typeof description === 'string' ? description.trim() : '',
      dueDate || null
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

    return res.status(201).json({ task: formatTask(task) });
  } catch (error) {
    return next(error);
  }
}

function getTasks(req, res, next) {
  try {
    const db = getDb();
    const tasks = db
      .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id)
      .map(formatTask);

    return res.json({ tasks });
  } catch (error) {
    return next(error);
  }
}

function getTask(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({ task: formatTask(task) });
  } catch (error) {
    return next(error);
  }
}

function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, completed, dueDate } = req.body;
    const db = getDb();

    const existing = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Task title cannot be empty' });
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean value' });
    }

    const nextTitle = title !== undefined ? title.trim() : existing.title;
    const nextDescription = description !== undefined
      ? (typeof description === 'string' ? description.trim() : '')
      : existing.description;
    const nextCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;
    const nextDueDate = dueDate !== undefined ? dueDate : existing.due_date;

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, completed = ?, due_date = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(nextTitle, nextDescription, nextCompleted, nextDueDate, id, req.user.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    return res.json({ task: formatTask(task) });
  } catch (error) {
    return next(error);
  }
}

function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = db
      .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};
