const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
} = require('../utils/jwt');
const { verifySocialPayload } = require('../utils/socialAuth');

function sanitizeUser(user) {
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

function issueTokens(user) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, type: 'refresh' });

  const db = getDb();
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), user.id, hashToken(refreshToken), getRefreshTokenExpiryDate().toISOString());

  return { accessToken, refreshToken };
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const displayName = typeof name === 'string' && name.trim() ? name.trim() : normalizedEmail.split('@')[0];

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, auth_provider)
      VALUES (?, ?, ?, ?, 'local')
    `).run(userId, normalizedEmail, passwordHash, displayName);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const tokens = issueTokens(user);

    return res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db
      .prepare('SELECT * FROM users WHERE email = ? AND auth_provider = ?')
      .get(email.trim().toLowerCase(), 'local');

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = issueTokens(user);

    return res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (error) {
    return next(error);
  }
}

async function socialLogin(req, res, next) {
  try {
    const { provider, idToken, accessToken, email, providerId, name, avatarUrl } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'provider is required (google or github)' });
    }

    const verified = await verifySocialPayload({
      provider,
      idToken,
      accessToken,
      email,
      providerId,
      name,
      avatarUrl,
    });

    const db = getDb();
    let user = db
      .prepare('SELECT * FROM users WHERE auth_provider = ? AND provider_id = ?')
      .get(verified.provider, verified.providerId);

    if (!user) {
      const existingByEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(verified.email);

      if (existingByEmail) {
        db.prepare(`
          UPDATE users
          SET auth_provider = ?, provider_id = ?, avatar_url = COALESCE(?, avatar_url),
              name = CASE WHEN name = '' THEN ? ELSE name END,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(verified.provider, verified.providerId, verified.avatarUrl, verified.name, existingByEmail.id);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(existingByEmail.id);
      } else {
        const userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, name, avatar_url, auth_provider, provider_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          verified.email,
          verified.name,
          verified.avatarUrl,
          verified.provider,
          verified.providerId
        );

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      }
    } else {
      db.prepare(`
        UPDATE users
        SET name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now')
        WHERE id = ?
      `).run(verified.name, verified.avatarUrl, user.id);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    const tokens = issueTokens(user);

    return res.json({
      message: 'Social login successful',
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Social login verification failed' });
  }
}

module.exports = {
  register,
  login,
  socialLogin,
};
