const { getDb } = require('../db/database');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../utils/password');

function sanitizeProfile(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function getProfile(req, res, next) {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ profile: sanitizeProfile(user) });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, avatarUrl, currentPassword, newPassword } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let nextName = user.name;
    let nextAvatarUrl = user.avatar_url;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      nextName = name.trim();
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        return res.status(400).json({ error: 'avatarUrl must be a string or null' });
      }
      nextAvatarUrl = avatarUrl;
    }

    let nextPasswordHash = user.password_hash;

    if (newPassword !== undefined) {
      if (user.auth_provider !== 'local') {
        return res.status(400).json({
          error: 'Password updates are only available for local accounts. Use your social provider to manage credentials.',
        });
      }

      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'currentPassword is required to set a new password' });
      }

      const passwordError = validatePasswordStrength(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const validCurrentPassword = await verifyPassword(currentPassword, user.password_hash);
      if (!validCurrentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      nextPasswordHash = await hashPassword(newPassword);
    }

    db.prepare(`
      UPDATE users
      SET name = ?, avatar_url = ?, password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nextName, nextAvatarUrl, nextPasswordHash, user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

    return res.json({
      message: 'Profile updated successfully',
      profile: sanitizeProfile(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
