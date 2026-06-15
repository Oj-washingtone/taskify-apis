const { OAuth2Client } = require('google-auth-library');
const config = require('../config');

const googleClient = config.googleClientId
  ? new OAuth2Client(config.googleClientId)
  : null;

async function verifyGoogleIdToken(idToken) {
  if (!googleClient) {
    throw new Error('Google social login is not configured. Set GOOGLE_CLIENT_ID in .env');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token payload');
  }

  return {
    provider: 'google',
    providerId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    avatarUrl: payload.picture || null,
  };
}

async function verifySocialPayload({ provider, idToken, accessToken, email, providerId, name, avatarUrl }) {
  if (provider === 'google') {
    if (!idToken) {
      throw new Error('idToken is required for Google social login');
    }
    return verifyGoogleIdToken(idToken);
  }

  if (provider === 'github') {
    if (!accessToken) {
      throw new Error('accessToken is required for GitHub social login');
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'taskify-apis',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify GitHub access token');
    }

    const profile = await response.json();
    if (!profile.id || !profile.login) {
      throw new Error('Invalid GitHub profile response');
    }

    let resolvedEmail = email;
    if (!resolvedEmail) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'taskify-apis',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primary = emails.find((entry) => entry.primary && entry.verified);
        resolvedEmail = primary?.email || emails.find((entry) => entry.verified)?.email;
      }
    }

    if (!resolvedEmail) {
      throw new Error('Unable to resolve a verified email from GitHub profile');
    }

    return {
      provider: 'github',
      providerId: String(profile.id),
      email: resolvedEmail.toLowerCase(),
      name: name || profile.name || profile.login,
      avatarUrl: avatarUrl || profile.avatar_url || null,
    };
  }

  throw new Error('Unsupported social provider. Supported providers: google, github');
}

module.exports = {
  verifySocialPayload,
};
