import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import * as Dialog from './Dialog';
import * as ConfirmDialog from './ConfirmDialog';
import { TextInput } from './TextInput';

import type { ElementRef, ComponentPropsWithRef } from 'react';

export const Root = Dialog.Root;
export const Trigger = Dialog.Trigger;
export const Close = Dialog.Close;

type ContentProps = ComponentPropsWithRef<typeof Dialog.Content> & {
    appName: string;
    onConfirm: () => void;
};
export const Content = forwardRef<ElementRef<typeof Dialog.Content>, ContentProps>(function Content(
    { className, children, appName, onConfirm, ...other },
    forwardedRef,
) {
    const [inputValue, setInputValue] = useState('');

    return (
        <Dialog.Content {...other} className={twMerge('absolute w-[600px] p-6', className)} ref={forwardedRef}>
            <ConfirmDialog.Title variant="alert" className="mb-4">
                Are you sure?
            </ConfirmDialog.Title>
            <div className="text-grey-500 font-sans text-base antialiased">
                Disabling these products will interrupt any live apps that they depend on them. Type{' '}
                <span className="font-medium text-black antialiased">{appName}</span> to confirm this action.
            </div>

            <div className="pt-3 pb-6">
                <TextInput
                    name="name"
                    className={twMerge('mt-4')}
                    initialValue=""
                    placeholder={appName}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                />
            </div>
            <ConfirmDialog.ConfirmDialogFooter
                variant="alert"
                confirmButtonText="Yes, I am sure"
                cancelButtonText="Cancel"
                confirmButtonProps={{
                    type: 'button',
                    disabled: inputValue !== appName,
                    onClick: onConfirm,
                    className: 'text-error-700 bg-error-100 disabled:bg-error-50 disabled:text-error-700/50',
                }}
            />
        </Dialog.Content>
    );
});
