import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as Dialog from './Dialog';
import { Button } from './Button';
import { InfoCircle } from '../icons/InfoCircle';

import type { ElementRef, ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';

export const Root = Dialog.Root;
export const Trigger = Dialog.Trigger;
export const Description = Dialog.Description;
export const Close = Dialog.Close;

export const variants = ['confirm', 'alert'] as const;
export type VariantType = (typeof variants)[number];

type ConfirmDialogFooterProps = ComponentPropsWithoutRef<'div'> & {
    confirmButtonText: string;
    cancelButtonText: string;
    variant: VariantType;
    confirmButtonProps?: ComponentPropsWithoutRef<typeof Button>;
    cancelButtonProps?: ComponentPropsWithoutRef<typeof Button>;
};
export const ConfirmDialogFooter = forwardRef<HTMLDivElement, ConfirmDialogFooterProps>(function ConfirmDialogFooter(
    {
        className,
        cancelButtonText,
        confirmButtonText,
        variant,
        confirmButtonProps = {},
        cancelButtonProps = {},
        ...other
    },
    forwardedRef,
) {
    return (
        <div {...other} className={twMerge('flex', className)} ref={forwardedRef}>
            <Dialog.Close asChild>
                <Button color="grey" className="mr-4 w-fit self-start" {...cancelButtonProps}>
                    {cancelButtonText}
                </Button>
            </Dialog.Close>
            <Button
                className="w-full justify-center"
                color={variant === 'alert' ? 'red' : 'default'}
                {...confirmButtonProps}
            >
                {confirmButtonText}
            </Button>
        </div>
    );
});

type TitleProps = ComponentPropsWithRef<typeof Dialog.Title> & {
    variant: VariantType;
};
export const Title = forwardRef<ElementRef<typeof Dialog.Title>, TitleProps>(function Title(
    { children, className, variant, ...other },
    forwardedRef,
) {
    return (
        <Dialog.Title
            {...other}
            className={twMerge('flex font-sans text-xl font-normal', className)}
            ref={forwardedRef}
        >
            {variant === 'alert' && <InfoCircle className="text-red mr-2" aria-hidden />}
            {children}
        </Dialog.Title>
    );
});

type ContentProps = ComponentPropsWithRef<typeof Dialog.Content> & {
    title: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    variant?: VariantType;
    confirmButtonProps?: ComponentPropsWithoutRef<typeof Button>;
    cancelButtonProps?: ComponentPropsWithoutRef<typeof Button>;
};
export const Content = forwardRef<ElementRef<typeof Dialog.Content>, ContentProps>(function Content(
    {
        className,
        title,
        children,
        cancelButtonText = 'Cancel',
        confirmButtonText = 'Confirm',
        variant = 'confirm',
        ...other
    },
    forwardedRef,
) {
    return (
        <Dialog.Content {...other} className={twMerge('p-6', className)} ref={forwardedRef}>
            <Title variant={variant}>{title}</Title>
            <div className="pt-3 pb-6">{children}</div>
            <ConfirmDialogFooter
                variant={variant}
                confirmButtonText={confirmButtonText}
                cancelButtonText={cancelButtonText}
            />
        </Dialog.Content>
    );
});
