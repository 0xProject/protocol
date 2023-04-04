import { forwardRef, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import useMergedRef from '@react-hook/merged-ref';
import { Button } from './Button';
import { Copy6 } from '../icons/Copy6';
import { useTemporaryState } from '../hooks/useTemporaryState';
import { CheckCircle } from '../icons/CheckCircle';
import { useTruncateMiddle } from '../hooks/useTruncateMiddle';

import type { ComponentPropsWithRef, ElementRef } from 'react';

type CopyButtonProps = ComponentPropsWithRef<typeof Button> & {
    children: string;
    postCopyMessage?: string;
};

export const CopyButton = forwardRef<ElementRef<typeof Button>, CopyButtonProps>(function CopyButton(
    {
        size = 'sm',
        children,
        onClick,
        color = 'grey',
        roundness = 'lg',
        className,
        postCopyMessage = 'Copied',
        ...other
    },
    forwardedRef,
) {
    const [clicked, setClicked] = useTemporaryState(false, 2000);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (onClick) {
            onClick(event);
        }
        navigator.clipboard.writeText(children);
        setClicked(true);
    };

    const localButtonRef = useRef<HTMLButtonElement>(null);
    const ref = useMergedRef(localButtonRef, forwardedRef);

    useLayoutEffect(() => {
        const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            const { inlineSize } = entries[0].borderBoxSize[0];
            if (localButtonRef.current && !clicked) {
                localButtonRef.current.style.setProperty(`--copy-button-min-with`, `${inlineSize}px`);
            }
        });
        if (localButtonRef.current) {
            resizeObserver.observe(localButtonRef.current, { box: 'border-box' });
        }
        return () => {
            resizeObserver.disconnect();
        };
    }, [localButtonRef, clicked]);

    const text = useTruncateMiddle({ text: children, maxLength: 16 });

    return (
        <Button
            size={size}
            color={color}
            onClick={handleClick}
            className={twMerge('flex min-w-[var(--copy-button-min-with)] items-center justify-between', className)}
            ref={ref}
            roundness={roundness}
            endIcon={
                clicked ? (
                    <CheckCircle color="#3A65EB" /> // #blue-brand
                ) : (
                    <Copy6 />
                )
            }
            {...other}
        >
            {clicked ? postCopyMessage : text}
        </Button>
    );
});
