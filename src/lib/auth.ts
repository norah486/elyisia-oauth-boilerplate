import { Elysia, t } from "elysia";
import { generateState, OAuth2Tokens } from "arctic";
import { discord } from "./oauth";
import { db } from "./db";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
  validateSessionToken,
} from "./utils";

export const auth = new Elysia()
  .get("/login", ({ cookie: { discord_oauth_state } }) => {
    const state = generateState();
    const scopes = ["identify"];
    const url = discord.createAuthorizationURL(state, scopes);

    discord_oauth_state.set({
      value: state,
      path: "/",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
      },
    });
  })

  .get(
    "/login/callback",
    async ({ query, cookie }) => {
      const code = query.code;
      const state = query.state;
      const storedState = cookie.discord_oauth_state.value;

      if (code === null || state === null || storedState === null) {
        return new Response(null, {
          status: 400,
        });
      }
      if (state !== storedState) {
        return new Response(null, {
          status: 400,
        });
      }

      let tokens: OAuth2Tokens;
      try {
        tokens = await discord.validateAuthorizationCode(code);
      } catch (e) {
        // Invalid code or client credentials
        return new Response(null, {
          status: 400,
        });
      }
      const discordUserResponse = await fetch(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken()}`,
          },
        }
      );
      const discordUser = await discordUserResponse.json();
      const existingUser = await db.user.findUnique({
        where: {
          discordId: discordUser.id,
        },
      });

      if (existingUser) {
        const sessionToken = generateSessionToken();
        const session = await createSession(sessionToken, existingUser.id);
        setSessionTokenCookie(cookie.session, sessionToken, session.expiresAt);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
          },
        });
      }

      const user = db.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          name: discordUser.global_name,
          avatar: discordUser.avatar,
        },
      });

      const sessionToken = generateSessionToken();
      const session = await createSession(sessionToken, (await user).id);
      setSessionTokenCookie(cookie.session, sessionToken, session.expiresAt);

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
        },
      });
    },
    {
      query: t.Object({
        code: t.String(),
        state: t.Optional(t.String()),
      }),
      cookie: t.Object({
        discord_oauth_state: t.Optional(t.String()),
        session: t.Optional(t.String()),
        user_id: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/validate",
    async ({ cookie }) => {
      if (!cookie.session.value) {
        return JSON.stringify({
          unauthorized: true,
        });
      }
      const auth = await validateSessionToken(cookie.session.value);
      if (auth.session === null || auth.user === null) {
        return JSON.stringify({
          unauthorized: true,
        });
      }

      return JSON.stringify({
        unauthorized: false,
      });
    },
    {
      cookie: t.Object({
        session: t.Optional(t.String()),
      }),
    }
  );
