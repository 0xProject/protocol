export const pairUtils = {
    toKey(tokenA: string, tokenB: string): string {
        return [tokenA, tokenB]
            .map((str) => str.toLowerCase())
            .sort()
            .join('-');
    },
    fromKey(k: string): [string, string] {
        const a = k.split('-');
        if (a.length !== 2) {
            throw new Error();
        }
        return [a[0], a[1]];
    },
    toUniqueArray(pairKeys: string[]): [string, string][] {
        const uniqueKeySet = pairKeys.reduce((result, pairKey) => {
            result.add(pairKey);
            return result;
        }, new Set<string>());
        return Array.from(uniqueKeySet.values()).map(pairUtils.fromKey.bind(pairUtils));
    },
};
