import { Form, useNavigation } from '@remix-run/react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as Dialog from './Dialog';
import * as ConfirmDialog from './ConfirmDialog';
import { TextInput } from './TextInput';

import type { ElementRef, ComponentPropsWithRef } from 'react';
import { Alert } from './Alert';

export const Root = Dialog.Root;
export const Trigger = Dialog.Trigger;
export const Close = Dialog.Close;

type ContentProps = ComponentPropsWithRef<typeof Dialog.Content> & {
    keyId: string;
    appId: string;
    nameError?: string;
    generalError?: string;
    appName: string;
};
export const Content = forwardRef<ElementRef<typeof Dialog.Content>, ContentProps>(function Content(
    { className, children, keyId, appId, nameError, generalError, appName, ...other },
    forwardedRef,
) {
    const navigation = useNavigation();

    return (
        <Dialog.Content {...other} className={twMerge('absolute w-[600px] p-6', className)} ref={forwardedRef}>
            <ConfirmDialog.Title variant="alert">Are you sure?</ConfirmDialog.Title>
            {generalError && (
                <Alert variant="error" className="my-5">
                    {generalError}
                </Alert>
            )}
            <div className="text-grey-500 font-sans text-base">
                Rotating your API key will deactivate the current key, and prevent it from making API calls. Type{' '}
                <span className="font-medium text-black">{appName}</span> to confirm this action.
            </div>

            <Form method="post">
                <div className="pt-3 pb-6">
                    <TextInput name="name" className={twMerge('mt-4')} error={nameError} />
                    <input type="hidden" name="keyId" value={keyId} />
                    <input type="hidden" name="appId" value={appId} />
                </div>
                <ConfirmDialog.ConfirmDialogFooter
                    variant="alert"
                    confirmButtonText="Yes, I want to rotate the key"
                    cancelButtonText="Cancel"
                    confirmButtonProps={{ type: 'submit', disabled: navigation.state === 'submitting' }}
                />
            </Form>
        </Dialog.Content>
    );
});
