/**
 * scripts/google-refresh-token.mjs
 *
 * One-time helper that mints GOOGLE_REFRESH_TOKEN for the owner's Google
 * account (CLIENT_PORTAL_AND_SCHEDULER_PLAN.md, Phase 0.8). Run it yourself in
 * a terminal — the token is printed to your console only and never written to
 * disk; paste it into .env.local by hand.
 *
 *   1. Stop `next dev` (this script briefly listens on the same port).
 *   2. node --env-file=.env.local scripts/google-refresh-token.mjs
 *   3. Open the printed URL, sign in as the CALENDAR OWNER, approve.
 *   4. Copy the printed token into .env.local as GOOGLE_REFRESH_TOKEN.
 *
 * Requires http://localhost:3000/api/schedule/google/callback to be listed as
 * an authorized redirect URI on the OAuth client, and the consent screen to be
 * published ("In production") or the token expires after 7 days.
 */
import http from "node:http";
import crypto from "node:crypto";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing — run with: node --env-file=.env.local scripts/google-refresh-token.mjs");
  process.exit(1);
}

const PORT = 3000;
const CALLBACK_PATH = "/api/schedule/google/callback";
const REDIRECT_URI = `http://localhost:${PORT}${CALLBACK_PATH}`;
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", // create events + read the availability calendar
  "https://www.googleapis.com/auth/calendar.freebusy", // host free/busy
];
const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  client_id: GOOGLE_CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPES.join(" "),
  access_type: "offline", // required to receive a refresh token
  prompt: "consent", // force a refresh token even if previously granted
  state,
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== CALLBACK_PATH) {
    res.writeHead(404).end();
    return;
  }
  const done = (status, message, exitCode) => {
    res.writeHead(status, { "content-type": "text/plain" }).end(message);
    server.close();
    setTimeout(() => process.exit(exitCode), 100);
  };

  if (url.searchParams.get("state") !== state) return done(400, "State mismatch — start over.", 1);
  const code = url.searchParams.get("code");
  if (!code) return done(400, `Google returned an error: ${url.searchParams.get("error") ?? "no code"}`, 1);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.refresh_token) {
    console.error("Token exchange failed:", tokens.error_description ?? tokens.error ?? "no refresh_token returned");
    return done(500, "Token exchange failed — see terminal.", 1);
  }

  console.log("\nGOOGLE_REFRESH_TOKEN (paste into .env.local — do not commit or share):\n");
  console.log(tokens.refresh_token, "\n");
  done(200, "Done. You can close this tab and return to the terminal.", 0);
});

server.listen(PORT, () => {
  console.log(`Open this URL and sign in as the calendar owner:\n\n${authUrl}\n`);
});
