import { twMerge } from 'tailwind-merge';

type InputContainerProps = {
    className?: string;
    children: React.ReactNode;
};

export function InputContainer({ className, children }: InputContainerProps) {
    return <div className={twMerge('flex flex-col w-fit', className)}>{children}</div>;
}
