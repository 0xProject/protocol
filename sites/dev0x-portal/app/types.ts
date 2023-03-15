import type { User } from "./auth.server";

export type App = {
    name: string;
    encodedUrlPathname: string;
    onChainTag: string[];
    brandColor: string;
    metrics: {
        requests: number;
    }
}

export type ClientUser = Pick<User, 'email' | 'team'>;
