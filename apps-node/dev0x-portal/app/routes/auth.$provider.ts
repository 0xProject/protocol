// app/routes/auth/$provider.tsx
import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { auth } from "../auth.server";

export const loader = () => redirect("/login");

export const action = ({ request, params }: ActionArgs) => {
  if (!params.provider) throw new Error("Missing provider");
  return auth.authenticate(params.provider, request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};
