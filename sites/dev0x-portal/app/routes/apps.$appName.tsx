import { Outlet } from "@remix-run/react";

export default function AppLayout() {
  return (
    <div>
      <div>Tabs</div>
      <Outlet />
    </div>
  );
}
