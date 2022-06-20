/**
 * Transforms a "pair string" of format "0x1-0x2" into
 * a two-element array ["0x1", "0x2"]. Ensures the result
 * array is sorted and converted to lower case.
 */
function fromPairString(k: string): [string, string] {
    const a = k.split('-');
    if (a.length !== 2) {
        throw new Error();
    }
    // type coercion is there because TypeScript thinks
    // `sort` might change the array length
    return [a[0].toLowerCase(), a[1].toLowerCase()].sort() as [string, string];
}

/**
 * Transforms two token addresses into a "pair string" of the format
 * "0x1-0x2".
 */
export function toPairString(tokenA: string, tokenB: string): string {
    return [tokenA, tokenB]
        .map((str) => str.toLowerCase())
        .sort()
        .join('-');
}

/**
 * Transforms an array of "0x1-0x2" pair strings into an array
 * of two-element arrays. Removes duplicate pairs.
 *
 * Example:
 * const pairs = [
 *  "0x1-0x2",
 *  "0x2-0x1",
 *  "0x3-0x4",
 * ];
 * toUniqueArray(pairs); // [["0x1", "0x2"], ["0x3", "0x4"]]
 */
export function toUniqueArray(pairs: string[]): [string, string][] {
    return Array.from(
        pairs.reduce((result, pair) => {
            result.add(fromPairString(pair).sort());
            return result;
        }, new Set<[string, string]>()),
    );
}
