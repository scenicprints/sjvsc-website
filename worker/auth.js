/* Who is allowed to change anything.

   Reading is public and goes nowhere near this file. Writing requires a
   signed-in board member, and that is the whole of the rule.

   Clerk owns the sign-in screen, the sessions, the password resets and the
   list of who is on the board. This Worker only checks the token Clerk
   issued. That check is the one piece of security-sensitive code here, so it
   uses Clerk's own library rather than a hand-rolled JWT parse — it is the
   single dependency in the project and it earns its place.

   It fails closed. If CLERK_JWT_KEY is not set, no write is accepted by
   anyone, which is the right behaviour for a half-configured deployment:
   an unconfigured site is read-only, never open. */

import { verifyToken } from '@clerk/backend';

const BEARER = /^Bearer\s+(.+)$/i;

/* Clerk puts the session token in a __session cookie for same-origin
   requests, and the admin screens are same-origin. An Authorization header
   is accepted too, which is what a script or a test will send. */
function readToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = BEARER.exec(header.trim());
  if (match) return match[1].trim();

  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === '__session' && rest.length) return rest.join('=').trim();
  }
  return null;
}

/**
 * Returns { ok: true, who } for a signed-in board member, or
 * { ok: false, status, message } with a reason that is safe to return.
 */
export async function requireBoard(request, env) {
  if (!env.CLERK_JWT_KEY) {
    /* Not misconfiguration the caller can fix, and not something to explain
       in detail to the internet. The deploy notes say what is missing. */
    return {
      ok: false,
      status: 503,
      message: 'The admin is not configured for writing yet.',
    };
  }

  const token = readToken(request);
  if (!token) {
    return { ok: false, status: 401, message: 'Sign in to make changes.' };
  }

  try {
    const claims = await verifyToken(token, {
      jwtKey: env.CLERK_JWT_KEY,
      /* Set CLERK_AUTHORIZED_PARTIES to the site's own origins once the
         domain is live, so a token minted for another application cannot be
         replayed against this one. */
      authorizedParties: (env.CLERK_AUTHORIZED_PARTIES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });

    /* verifyToken checks the signature and the expiry. What it cannot know
       is whether this club considers the holder a board member, so that is
       asserted here: Clerk carries the role in publicMetadata, and anyone
       without it is signed in but not an editor. */
    const role = claims?.metadata?.role || claims?.publicMetadata?.role;
    if (role && role !== 'admin' && role !== 'editor') {
      return { ok: false, status: 403, message: 'Your account cannot make changes.' };
    }

    return {
      ok: true,
      who: claims.sub,
      role: role || 'editor',
    };
  } catch {
    /* Expired, tampered with, or signed by someone else. The caller gets
       one answer for all three. */
    return { ok: false, status: 401, message: 'Sign in again to make changes.' };
  }
}
