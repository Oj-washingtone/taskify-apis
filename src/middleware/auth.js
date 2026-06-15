const { verifyAccessToken } = require('../utils/jwt');
const { getDb } = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer access token.' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyAccessToken(token);
    const db = getDb();
    const user = db
      .prepare('SELECT id, email, name, avatar_url, auth_provider, token_version FROM users WHERE id = ?')
      .get(decoded.sub);

    if (!user) {
      return res.status(401).json({ error: 'User associated with token no longer exists' });
    }

    const tokenVersion = user.token_version ?? 0;
    const decodedVersion = decoded.tv ?? 0;

    if (decodedVersion !== tokenVersion) {
      return res.status(401).json({ error: 'Access token has been revoked' });
    }

    req.user = user;
    req.auth = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = authenticate;
