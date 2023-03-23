import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

type AlertVariants = 'error' | 'success';

const alert = tv({
    base: 'w-full py-2 flex items-center justify-center rounded-[14px] text-base font-sans text-center',
    variants: {
        error: {
            true: 'bg-error-50 text-red',
        },
        success: {
            true: 'bg-success-100 text-success-800',
        },
    },
});

type AlertProps = {
    className?: string;
    variant: AlertVariants;
    children: React.ReactNode;
};

export function Alert({ className, variant, children }: AlertProps) {
    return (
        <div role="alert" className={twMerge(alert({ [variant]: true }), className)}>
            {children}
        </div>
    );
}
