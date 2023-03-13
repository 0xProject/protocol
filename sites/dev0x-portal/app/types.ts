
export type App = {
    name: string;
    encodedUrlPathname: string;
    onChainTag: string[];
    brandColor: string;
    metrics: {
        volume: number,
        users: number;
        requests: number;
    }
}