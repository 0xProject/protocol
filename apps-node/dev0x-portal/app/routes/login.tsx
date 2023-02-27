import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { auth, sessionStorage } from "../auth.server";

type LoaderError = { message: string } | null;
export const loader = async ({ request }: LoaderArgs) => {
  await auth.isAuthenticated(request, { successRedirect: "/apps" });
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const error = session.get(auth.sessionErrorKey) as LoaderError;
  return json({ error });
};

export default function Screen() {
  const { error } = useLoaderData<typeof loader>();

  return (
    <div>
      <Form method="post" action="/auth/email-pw">
        {error ? <div>{error.message}</div> : null}
        <div>
          <label htmlFor="email">Email</label>
          <input type="email" name="email" id="email" />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input type="password" name="password" id="password" />
        </div>

        <button type="submit">Log In</button>
      </Form>
      <Form action="/auth/google" method="post">
        <button>Login with Google</button>
      </Form>
    </div>
  );
}
