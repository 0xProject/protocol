import { twMerge } from 'tailwind-merge';

type InputGroupProps = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Component that groups an input with additional decorators.
 */
export function InputGroup({ children, className }: InputGroupProps) {
    return <div className={twMerge('relative w-full flex', className)}>{children}</div>;
}
