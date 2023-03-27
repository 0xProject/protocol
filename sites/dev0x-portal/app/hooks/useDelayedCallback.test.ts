import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDelayedCallback } from './useDelayedCallback';

describe('useDelayedCallback', () => {
    const clock = vi.useFakeTimers()

    afterEach(() => {
        clock.clearAllTimers()
    })
    it('should call the callback function after the given delay', async () => {
        const callback = vi.fn();
        const delay = 1000;
        const { result } = renderHook(() => useDelayedCallback(callback, delay));
        const delayedCallback = result.current;

        act(() => {
            delayedCallback();
        });

        expect(callback).not.toBeCalled();

        act(() => {
            clock.advanceTimersByTime(delay)
        })

        expect(callback).toBeCalledTimes(1);
    });

    it('should clear the timeout if the component unmounts', async () => {
        const callback = vi.fn();
        const delay = 1000;
        const { result, unmount } = renderHook(() => useDelayedCallback(callback, delay));
        const delayedCallback = result.current;

        act(() => {
            delayedCallback();
        });

        unmount();
        
        act(() => {
            clock.advanceTimersByTime(1000)
        })

        expect(callback).not.toBeCalled();
    });
});