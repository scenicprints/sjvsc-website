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

    /* An account exists only because the club invited it, so holding a
       valid token is the permission. No role has to be set on anybody.

       THIS DEPENDS ON ONE SETTING. The Clerk instance is invite-only:
       Configure -> Access mode -> Invite-only. Sign-ups are disabled and
       the only way to get an account is an invitation the club sent. Turn
       that back to Open and this line hands the club's events to anyone
       with an email address, because every one of them could then sign up
       and every one of them would arrive here with a valid token.

       If that setting ever has to change, this is the code that has to
       change with it: require a role, and put one on each board member.

       (An earlier version read `role || 'editor'` while sign-ups were
       open, which is exactly the hole described above.) */
    const role = claims?.metadata?.role || claims?.publicMetadata?.role;

    /* The history needs a name to show. The Clerk id never changes and is
       what a row is keyed on; the name is what it was called at the time,
       and is recorded alongside rather than looked up later, so a board
       member who leaves does not turn every past change anonymous. */
    return {
      ok: true,
      who: claims.sub,
      name: claims.name || claims.email || claims.sub,
      role: role === 'admin' ? 'admin' : 'editor',
    };
  } catch {
    /* Expired, tampered with, or signed by someone else. The caller gets
       one answer for all three. */
    return { ok: false, status: 401, message: 'Sign in again to make changes.' };
  }
}
