import { Link } from "@remix-run/react";

export default function Create0xDevAccount() {
  return (
    <div>
      <div className="font-sans text-lg">Create 1</div>
      <Link to={"/login"}>Login</Link>
    </div>
  );
}
