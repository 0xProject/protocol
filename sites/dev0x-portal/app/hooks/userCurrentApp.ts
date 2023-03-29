import { useParams } from "@remix-run/react";

import type { ClientApp } from "../types";

export function useCurrentApp(apps: ClientApp[]) {
    const { appId } = useParams();
    const [currentApp] = apps.filter(({ id }) => id === appId);
    return currentApp;
}