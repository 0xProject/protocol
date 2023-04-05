import { Form } from '@remix-run/react';
import type { ActionArgs } from '@remix-run/server-runtime';

export async function action({ request }: ActionArgs) {
    throw new Error('Sentry Error from action');
}

export default function ResetPasswordPage() {
    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <Form method="post">
                <button type="submit">Submit</button>
            </Form>
            <button
                type="button"
                onClick={() => {
                    throw new Error('Sentry Frontend Error');
                }}
            >
                Throw error
            </button>
        </main>
    );
}
