import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Outlet, useLoaderData } from "@remix-run/react";
import { auth, withSignedInUser } from "../auth.server";
import { AppBar } from "../components/AppBar";

export const loader = async ({ request }: LoaderArgs) => {
  return withSignedInUser(request, async (user) => {
    return json({ user });
  });
};

export const action = async ({ request }: ActionArgs) => {
  await auth.logout(request, { redirectTo: "/" });
};

export default function AppsLayout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div>
      <div>
        <AppBar />
        <div>App bar</div>
        {user.email}
        <Form method="post">
          <button>Log Out</button>
        </Form>
      </div>
      <Outlet />
    </div>
  );
}
