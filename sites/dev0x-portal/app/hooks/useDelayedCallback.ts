import { useCallback, useRef, useEffect } from 'react';

type DelayedCallback = (...args: any[]) => void;

export function useDelayedCallback(callback: (...args: any[]) => void, delay: number): DelayedCallback {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear the timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const delayedCallback = useCallback(
        (...args: any[]) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    );

    return delayedCallback;
}