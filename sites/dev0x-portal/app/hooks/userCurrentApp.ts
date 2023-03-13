import { useParams } from "@remix-run/react";

import type { App } from "../types";

export function useCurrentApp(apps: App[]) {
    const { appName } = useParams();
    const [currentApp] = apps.filter(({ encodedUrlPathname }) => encodedUrlPathname === appName);
    return currentApp;
}