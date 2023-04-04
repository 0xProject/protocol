
export function useTruncateMiddle({ text, maxLength }: {
    text: string;
    maxLength: number;
}) {
    if (!text || text.length <= maxLength || maxLength < 3) { return text; }

    const charsLeft = Math.floor((maxLength - 1) / 2);
    const charsRight = maxLength - 1 - charsLeft;
    const start = text.slice(0, charsLeft);
    const end = text.slice(-charsRight);
    return `${start}…${end}`;
}

