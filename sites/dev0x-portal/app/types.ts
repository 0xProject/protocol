import type { User } from "./auth.server";

export type App = {
    name: string;
    encodedUrlPathname: string;
    onChainTag: { name: string, color: string }[];
    brandColor: string;
}

export type ClientUser = Pick<User, 'email' | 'team'>;
