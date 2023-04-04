import { it } from 'vitest';
import { useTruncateMiddle } from './useTruncateMiddle';

describe('useTruncateMiddle', () => {
    it('returns original text when maxLength is less than 3', () => {
        const result = useTruncateMiddle({ text: 'Hello, World!', maxLength: 2 });
        expect(result).toBe('Hello, World!');
    });

    it('returns original text when text length is less than or equal to maxLength', () => {
        const result = useTruncateMiddle({ text: 'Hello, World!', maxLength: 13 });
        expect(result).toBe('Hello, World!');
    });

    it('truncates text with even maxLength correctly', () => {
        const result = useTruncateMiddle({ text: 'Hello, World!', maxLength: 10 });
        expect(result).toBe('Hell…orld!');
    });

    it('truncates text with odd maxLength correctly', () => {
        const result = useTruncateMiddle({ text: 'Hello, World!', maxLength: 9 });
        expect(result).toBe('Hell…rld!');
    });

    it('returns original text when text is empty', () => {
        const result = useTruncateMiddle({ text: '', maxLength: 10 });
        expect(result).toBe('');
    });
});