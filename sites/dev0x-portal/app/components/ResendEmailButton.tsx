import { Form } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Button } from './Button';

type ResendEmailButtonProps = {
    retryIn: number;
    email: string;
    title?: string;
};

export function ResendEmailButton({ retryIn, email, title = 'Resend verification email' }: ResendEmailButtonProps) {
    const [retryCountdown, setRetryCountdown] = useState(retryIn);

    useEffect(() => {
        setRetryCountdown(retryIn);
    }, [retryIn]);

    useEffect(() => {
        if (retryCountdown === 0) return;
        const timeout = setTimeout(() => {
            const newRetryCountdown = retryCountdown - 1;
            setRetryCountdown(newRetryCountdown);
        }, 1000);
        return () => {
            clearTimeout(timeout);
        };
    }, [retryCountdown]);

    return (
        <div>
            <Form method="post">
                <input type="hidden" name="email" value={email} />
                <Button
                    size="md"
                    roundness="default"
                    color="grey"
                    className="flex w-full items-center justify-center text-lg "
                    disabled={retryCountdown > 0}
                >
                    {title}
                </Button>
            </Form>
            {retryCountdown > 0 && (
                <span className="text-grey-500 mt-2 inline-block text-base">Resend email ({retryCountdown}s)</span>
            )}
        </div>
    );
}
