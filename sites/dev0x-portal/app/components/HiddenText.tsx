import { forwardRef, useEffect, useRef, useState } from 'react';
import { match, P } from 'ts-pattern';
import { Eye } from '../icons/Eye';
import { EyeOff } from '../icons/EyeOff';
import { generateNumbersArray } from '../utils/utils';
import * as Tooltip from './Tooltip';
import { Copy } from '../icons/Copy';
import { CheckCircle } from '../icons/CheckCircle';
import { useTemporaryState } from '../hooks/useTemporaryState';
import { useDelayedCallback } from '../hooks/useDelayedCallback';

import type { ComponentPropsWithoutRef } from 'react';

const ICON_WIDTH = 24;
const DOT_WIDTH = 5;
const GAP_WIDTH = 4;

type DotsProps = Required<Pick<HiddenTextProps, 'width'>>;
function Dots({ width }: DotsProps) {
    return (
        <div className="grid grid-flow-col content-start gap-1">
            {generateNumbersArray(Math.floor((width - ICON_WIDTH) / (DOT_WIDTH + GAP_WIDTH))).map((n) => (
                <div key={n} className="bg-grey-700 h-[5px] w-[5px] rounded-full" />
            ))}
        </div>
    );
}

type HiddenTextTooltipTriggerProps = ComponentPropsWithoutRef<typeof Tooltip.Trigger> & {
    setRefValue: (value: HTMLButtonElement | null) => void;
    width: number;
    show: boolean;
};
function HiddenTextTooltipTrigger({ onClick, children, setRefValue, show, ...other }: HiddenTextTooltipTriggerProps) {
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setRefValue(ref.current);
    }, [setRefValue]);

    return (
        <Tooltip.Trigger asChild {...other}>
            <button
                ref={ref}
                className="flex items-center justify-between"
                style={{ width: `${other.width}px` }}
                onClick={(event) => {
                    event.preventDefault();
                    navigator.clipboard.writeText(children as string);
                    onClick && onClick(event);
                }}
            >
                {typeof children === 'string' ? (
                    <span className="text-grey-700 truncate text-left font-sans text-base">{children}</span>
                ) : (
                    children
                )}
                <div>
                    {typeof children === 'string' ? (
                        <Eye color="#3F3F46" className="ml-2" />
                    ) : (
                        <EyeOff color="#3F3F46" className="ml-2" />
                    )}
                </div>
            </button>
        </Tooltip.Trigger>
    );
}

type TooltipContentProps = ComponentPropsWithoutRef<typeof Tooltip.Content> & {
    tooltipTrigger: HTMLButtonElement | null;
};
function HiddenTextTooltipContent({ children, tooltipTrigger }: TooltipContentProps) {
    return (
        <Tooltip.Content
            asChild
            onPointerDownOutside={(event) => {
                let targetElement = event.target as HTMLElement | null;
                while (targetElement !== null) {
                    if (targetElement === tooltipTrigger) {
                        // Event occurred on the desired element or one of its children
                        event.preventDefault();
                        break;
                    }
                    targetElement = targetElement.parentElement;
                }
            }}
        >
            <div className="flex items-center">{children}</div>
        </Tooltip.Content>
    );
}

type HiddenTextProps = ComponentPropsWithoutRef<'div'> & {
    children: string;
    width?: number;
    revealTooltipText?: string;
    clickToCopyTooltipText?: string;
    copiedTooltipText?: string;
};
export function HiddenText({
    children,
    width = 200,
    revealTooltipText = 'Reveal',
    clickToCopyTooltipText = 'Click to copy',
    copiedTooltipText = 'Copied',
}: HiddenTextProps) {
    const [show, setShow] = useState(false);
    const [clicked, setClicked] = useTemporaryState(false, 2000);
    const [tooltipTriggerRefValue, setTooltipTriggerRefValue] = useState<HTMLButtonElement | null>(null);
    const handleOnTriggerPointerOut = useDelayedCallback(() => setClicked(false), 100);

    const state = { show, clicked };

    return (
        <Tooltip.Provider delayDuration={0}>
            <Tooltip.Root>
                <HiddenTextTooltipTrigger
                    show={show}
                    width={width}
                    onPointerOut={handleOnTriggerPointerOut}
                    setRefValue={setTooltipTriggerRefValue}
                    onClick={() => {
                        !show ? setShow(true) : setClicked(true);
                    }}
                >
                    {show ? children : <Dots width={width} />}
                </HiddenTextTooltipTrigger>
                <HiddenTextTooltipContent tooltipTrigger={tooltipTriggerRefValue}>
                    {match(state)
                        .with({ show: false, clicked: false }, () => revealTooltipText)
                        .with({ show: true, clicked: false }, () => (
                            <>
                                <Copy className="mr-2" width={16} height={16} />
                                {clickToCopyTooltipText}
                            </>
                        ))
                        .with({ show: true, clicked: true }, () => (
                            <>
                                <CheckCircle color="#12B76A" className="mr-2" width={16} height={16} />
                                {copiedTooltipText}
                            </>
                        ))
                        //that should never happen
                        .with({ show: false, clicked: true }, () => '')
                        .exhaustive()}
                </HiddenTextTooltipContent>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
