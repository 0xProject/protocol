import { priorityPromiseAsync } from '../../src/utils/priority_promise';

jest.useFakeTimers();

async function sleepAsync(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('prorityPromise', () => {
    it('resolves the more prioritized promise when it takes shorter time', async () => {
        const sleepTime1 = 100000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            return sleepTime1;
        })();
        const sleepTime2 = 300000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        jest.advanceTimersByTime(sleepTime1);

        const res = await priorityPromiseAsync([promise1, promise2], (): boolean => true);
        expect(res).toEqual(sleepTime1);
    });

    it('resolves the more prioritized promise when it takes longer time', async () => {
        const sleepTime1 = 300000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            return sleepTime1;
        })();
        const sleepTime2 = 100000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        jest.runAllTimers();

        const res = await priorityPromiseAsync([promise1, promise2], (): boolean => true);
        expect(res).toEqual(sleepTime1);
    });

    it('resolves the less prioritized promise if the more prioritized does not pass `successDeterminator`', async () => {
        const sleepTime1 = 100000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            return sleepTime1;
        })();
        const sleepTime2 = 300000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        jest.runAllTimers();

        const res = await priorityPromiseAsync([promise1, promise2], (arg: number): boolean => arg !== sleepTime1);
        expect(res).toEqual(sleepTime2);
    });

    it('resolves the less prioritized promise if the more prioritized throws', async () => {
        const sleepTime1 = 100000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            throw new Error('error');
        })();
        const sleepTime2 = 300000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        jest.runAllTimers();

        const res = await priorityPromiseAsync([promise1, promise2], (): boolean => true);
        expect(res).toEqual(sleepTime2);
    });

    it('calls `fallBackHandler` if no promise resolves and passes `successDeterminator`', async () => {
        const sleepTime1 = 100000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            throw new Error('error');
        })();
        const sleepTime2 = 300000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        const errorHandler = jest.fn();
        const returnValue = '0x';
        const fallBackHandler = jest.fn();
        fallBackHandler.mockReturnValue(returnValue);
        jest.runAllTimers();

        const result = await priorityPromiseAsync(
            [promise1, promise2],
            (arg: number): boolean => arg !== sleepTime2,
            errorHandler,
            fallBackHandler,
        );
        expect(fallBackHandler).toBeCalled();
        expect(result).toEqual(returnValue);
    });

    it('throws if no promise resolves and passes `successDeterminator` & no `successDeterminator` is provided', async () => {
        const sleepTime1 = 100000;
        const promise1 = (async (): Promise<number> => {
            await sleepAsync(sleepTime1);
            throw new Error('error');
        })();
        const sleepTime2 = 300000;
        const promise2 = (async (): Promise<number> => {
            await sleepAsync(sleepTime2);
            return sleepTime2;
        })();
        jest.runAllTimers();

        await expect(() =>
            priorityPromiseAsync([promise1, promise2], (arg: number): boolean => arg !== sleepTime2),
        ).rejects.toThrow('All promises are rejected or failed the `successDeterminator` check');
    });

    it('calls error handler', async () => {
        const promise1 = Promise.reject('reject');
        const promise2 = Promise.resolve('resolve');
        const errorHandler = jest.fn();
        await priorityPromiseAsync([promise1, promise2], () => true, errorHandler);
        expect(errorHandler).toBeCalled();
    });
});
