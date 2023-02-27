import type { LoaderArgs } from "@remix-run/node";
import { auth } from "../auth.server";

export const loader = ({ request, params }: LoaderArgs) => {
  if (!params.provider) throw new Error("Missing provider");
  return auth.authenticate(params.provider, request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};
