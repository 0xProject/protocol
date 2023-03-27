import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useTemporaryState } from './useTemporaryState'

describe('useTemporaryState', () => {
    const clock = vi.useFakeTimers()

    afterEach(() => {
        clock.clearAllTimers()
    })

    it('should initialize with the correct initial value', () => {
        const { result } = renderHook(() => useTemporaryState<string>('Hello, world!', 3000))
        expect(result.current[0]).toBe('Hello, world!')
    })

    it('should update the value and revert after the given duration', () => {
        const { result } = renderHook(() => useTemporaryState<string>('Hello, world!', 3000))
        const [_, setTemporaryValue] = result.current

        act(() => {
            setTemporaryValue('You clicked the button!')
        })

        expect(result.current[0]).toBe('You clicked the button!')

        act(() => {
            clock.advanceTimersByTime(3000)
        })
        expect(result.current[0]).toBe('Hello, world!')
    })

    it('should clearTimeout when setting a new value before the duration has passed', () => {
        const { result } = renderHook(() => useTemporaryState<string>('Hello, world!', 3000))
        const [_, setTemporaryValue] = result.current

        act(() => {
            setTemporaryValue('You clicked the button!')
        })

        act(() => {
            clock.advanceTimersByTime(1000)
        })

        act(() => {
            setTemporaryValue('You clicked the button again!')
        })
        expect(result.current[0]).toBe('You clicked the button again!')

        act(() => {
            clock.advanceTimersByTime(2500)
        });


        expect(result.current[0]).toBe('You clicked the button again!')
        act(() => {
            clock.advanceTimersByTime(500)
        });
        expect(result.current[0]).toBe('Hello, world!')
    })
})