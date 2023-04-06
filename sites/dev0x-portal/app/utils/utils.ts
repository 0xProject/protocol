import { TZippoRouteTag } from 'zippo-interface';
import type { ZodSchema } from 'zod';
import type { BadgeColor } from '../components/Badge';

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

export const ZIPPO_ROUTE_TAG_TO_PRODUCT: Partial<
    Record<TZippoRouteTag, { name: string; color: BadgeColor; id: string }>
> = {
    [TZippoRouteTag.SwapV1]: {
        name: 'Swap API',
        color: 'green',
        id: 'swap-api',
    },
    [TZippoRouteTag.OrderbookV1]: {
        name: 'Orderbook',
        color: 'blue',
        id: 'orderbook-api',
    },
} as const;

export const PRODUCT_TO_ZIPPO_ROUTE_TAG: Record<string, TZippoRouteTag> = {
    'swap-api': TZippoRouteTag.SwapV1,
    'orderbook-api': TZippoRouteTag.OrderbookV1,
} as const;
