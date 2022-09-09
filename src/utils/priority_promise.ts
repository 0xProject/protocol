/**
 * Iterates through an array of Promises.
 * If a promise resolves, the result is checked by `successDeterminator` and, if the return value is `true`, returns the result.
 * If the return value from `successDeterminator` is `false`, processing continues to the next promise.
 * If a promise rejects, then `errorHandler` is called with the associated `Error` and processing continues to the next promise.
 * Throws if no promise resolves and passes `successDeterminator`.
 *
 * @param promises An array of promises with decreasing priorities.
 * @param successDeterminator Function to determine if the resolved value of a promise is considered successful.
 * @param errorHandler Function to handle error like logging or metrics.
 * @returns Resolved value of a promise.
 */
export async function priorityPromiseAsync<T extends Promise<any>[], V extends Awaited<T[number]>>(
    promises: T,
    successDeterminator: (arg: V) => boolean,
    errorHandler?: (e: Error) => void,
): Promise<V> {
    for (const promise of promises) {
        try {
            const result = await promise;

            if (successDeterminator(result)) {
                return result;
            }
        } catch (e) {
            if (errorHandler) {
                errorHandler(e);
            }
            // Continue to resolve the next promise if the current one throws exception
            continue;
        }
    }

    throw new Error('All promises are rejected or failed the `successDeterminator` check');
}
