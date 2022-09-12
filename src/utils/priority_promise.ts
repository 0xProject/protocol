/**
 * Iterates through an array of Promises.
 * If a promise resolves, the result is checked by `successDeterminator` and, if the return value is `true`, returns the result.
 * If the return value from `successDeterminator` is `false`, processing continues to the next promise.
 * If a promise rejects, then `errorHandler` is called with the associated `Error` and processing continues to the next promise.
 * If no promise resolves and passes `successDeterminator`, `fallBackHandler` will be invoked (if provided). Throws otherwise.
 *
 * @param promises An array of promises with decreasing priorities.
 * @param successDeterminator Function to determine if the resolved value of a promise is considered successful.
 * @param errorHandler Function to handle error like logging or metrics.
 * @param fallBackHandler Function to call if no promise resolves and passes `successDeterminator`.
 * @returns Resolved value of a promise if any or the return value of `fallBackHandler`.
 */
export async function priorityPromiseAsync<T extends Promise<any>[], V extends Awaited<T[number]>, R>(
    promises: T,
    successDeterminator: (arg: V) => boolean,
    errorHandler?: (e: Error) => void,
    fallBackHandler?: (arg: (V | Error)[]) => R,
): Promise<V | R> {
    const results = [];

    for (const promise of promises) {
        try {
            const result = await promise;
            results.push(result);

            if (successDeterminator(result)) {
                return result;
            }
        } catch (e) {
            results.push(e);

            if (errorHandler) {
                errorHandler(e);
            }
            // Continue to resolve the next promise if the current one throws exception
            continue;
        }
    }

    if (fallBackHandler) {
        return fallBackHandler(results);
    }

    throw new Error('All promises are rejected or failed the `successDeterminator` check');
}
