import { createCookieSessionStorage } from "@remix-run/node";
import { addMinutes } from "date-fns";
import { Authenticator, AuthorizationError } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { GoogleStrategy } from "remix-auth-socials";
import { doesSessionExist } from "./data/zippo.server";
import { env } from "./env";
import { UserDoesNotExistExeption } from "./exceptions/authExeptions";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [env.SESSION_SECRET], // This should be an env variable
    secure: env.NODE_ENV === "production",
  },
});

export type User = {
  id: string;
  email: string;
  team: string;
  sessionToken: string;
  expiresAt: string;
};

export const auth = new Authenticator<User>(sessionStorage);
auth.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email");
    const password = form.get("password");

    // replace the code below with your own authentication logic
    if (!password) throw new AuthorizationError("Password is required");
    if (password !== "test") {
      throw new AuthorizationError("Invalid credentials");
    }
    if (!email) throw new AuthorizationError("Email is required");

    return {
      id: "1337",
      email: email as string,
      team: "dev0x",
      sessionToken: "123",
      expiresAt: addMinutes(new Date(), 15).toISOString(),
    };
  }),
  "email-pw"
);

// Google OAuth2 Strategy
auth.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "",
    },
    async ({ profile }) => {
      // method is stubbed out for now
      // If the user exists, return it

      if (profile?.emails[0].value === "dennis@0xproject.com") {
        return {
          id: "1337",
          email: profile.emails[0].value,
          team: "dev0x",
          sessionToken: "123",
          expiresAt: addMinutes(new Date(), 15).toISOString(),
        };
      }
      // If the user doesn't exist, notify the app
      throw new UserDoesNotExistExeption("User does not exist");
    }
  ),
  "google"
);

async function verifySession(user: User) {
  // currently stubbed, but this is where we would check with the backend to see if the session is still valid

  return doesSessionExist(user.id, user.sessionToken);
}

export async function withSignedInUser<R extends Response>(
  request: Request,
  func: (user: User) => Promise<R>
): Promise<R> {
  const user = await auth.isAuthenticated(request, {
    failureRedirect: "/",
  });

  let userUpdated = false;

  if (new Date(user.expiresAt) < new Date()) {
    // session has expired, we need to check with the backend if the session is still valid
    // if it is, we need to update the session with the new expiry date
    // if it isn't, we need to redirect to the login page
    const sessionIsValid = await verifySession(user);
    if (!sessionIsValid) {
      return auth.logout(request, { redirectTo: "/login" });
    }
    // we extend the session by 15 minutes
    user.expiresAt = addMinutes(new Date(), 15).toISOString();
    userUpdated = true;
  }

  // at this point, we know the user is authenticated and the session is valid
  // we can now call the function that was passed in

  try {
    const response = await func(user);

    // if this request updated the session, we need to make sure we update the session cookie
    if (userUpdated) {
      const session = await sessionStorage.getSession(
        request.headers.get("Cookie")
      );
      session.set(auth.sessionKey, user);
      response.headers.append(
        "Set-Cookie",
        await sessionStorage.commitSession(session)
      );
    }

    return response;
  } catch (e) {
    // in remix we can throw a response to immidiately abort the request
    // if this is the case, we need to make sure we update the session if we extended it
    if (e instanceof Response) {
      if (userUpdated) {
        const session = await sessionStorage.getSession(
          request.headers.get("Cookie")
        );
        session.set(auth.sessionKey, user);
        e.headers.append(
          "Set-Cookie",
          await sessionStorage.commitSession(session)
        );
      }
      throw e;
    } else {
      // if the exception is not a response, we can return a 500 error
      const errorResponse = new Response("Internal Server Error", {
        status: 500,
      });

      // we still need to make sure we update the session if we extended it
      if (userUpdated) {
        const session = await sessionStorage.getSession(
          request.headers.get("Cookie")
        );
        session.set(auth.sessionKey, user);
        errorResponse.headers.append(
          "Set-Cookie",
          await sessionStorage.commitSession(session)
        );
      }

      throw errorResponse;
    }
  }
}
