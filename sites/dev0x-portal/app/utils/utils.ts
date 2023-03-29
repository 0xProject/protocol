import type { ZodSchema } from 'zod';

export const generateNumbersArray = (n: number) => {
    return Array.from(Array(n).keys());
};

type ActionErrors<T> = Partial<Record<keyof T, string>>;
export function validateFormData<ActionInput>({
    formData,
    schema,
}: {
    formData: FormData;
    schema: ZodSchema<ActionInput>;
}) {
    let payload: Record<string, any> = {};
    for (const [key, value] of formData) {
        if (payload[key] !== undefined) {
            if (!Array.isArray(payload[key])) {
                payload[key] = [payload[key]];
            }
            payload[key].push(value);
        } else {
            payload[key] = value;
        }
    }
    const body = payload as ActionInput;

    const result = schema.safeParse(body);
    if (!result.success) {
        return {
            body,
            errors: result.error.issues.reduce((acc, curr) => {
                const key = curr.path[0] as keyof ActionInput;
                acc[key] = curr.message;
                return acc;
            }, {} as ActionErrors<ActionInput>),
        };
    }

    return { body, errors: null };
}
