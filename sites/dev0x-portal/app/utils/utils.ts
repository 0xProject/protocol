import type { ZodSchema } from 'zod';

export const generateNumbersArray = (n: number) => {
    return Array.from(Array(n).keys());
}

type ActionErrors<T> = Partial<Record<keyof T, string>>;
export function validateFormData<ActionInput>({
    formData,
    schema,
}: {
    formData: FormData;
    schema: ZodSchema<ActionInput>;
}) {
    const body = Object.fromEntries(formData) as ActionInput;

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
