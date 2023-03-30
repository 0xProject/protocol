import { useState, useEffect, useRef, useCallback } from 'react';

type SetTemporaryValue<T> = (newValue: T) => void;

export function useTemporaryState<T>(initialValue: T, durationMs: number) {
    const [value, setValue] = useState<T>(initialValue);
    const initialRef = useRef<T>(initialValue);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const setTemporaryValue: SetTemporaryValue<T> = useCallback((newValue) => {
        setValue(newValue);
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            setValue(initialRef.current);
        }, durationMs);
    }, [durationMs]);

    return [value, setTemporaryValue] as const;
}