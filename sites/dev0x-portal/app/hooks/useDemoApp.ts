import type { ClientApp } from "../types";

export function useDemoApp(apps: ClientApp[]) {
    const [currentApp] = apps.filter(({ description }) => description === '__test_key');
    return currentApp;
}