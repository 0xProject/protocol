import { forwardRef, useState } from 'react';
import { IconButton } from './IconButton';
import { Eye } from '../icons/Eye';
import { EyeOff } from '../icons/EyeOff';
import { generateNumbersArray } from '../utils/utils';

import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';

type HiddenTextProps = ComponentPropsWithoutRef<'div'> & {
    width?: number;
};

const BUTTON_WIDTH = 48;
const DOT_WIDTH = 5;
const GAP_WIDTH = 4;

type DotsProps = Required<Pick<HiddenTextProps, 'width'>>;
function Dots({ width }: DotsProps) {
    return (
        <div className="grid flex-1 grid-flow-col content-start gap-1">
            {generateNumbersArray(Math.floor((width - BUTTON_WIDTH) / (DOT_WIDTH + GAP_WIDTH))).map((n) => (
                <div key={n} className="bg-grey-700 h-[5px] w-[5px] rounded-full" />
            ))}
        </div>
    );
}

type ShowHideButtonProps = ComponentPropsWithRef<typeof IconButton> & {
    show: boolean;
};
function ShowHideButton({ show, ...other }: ShowHideButtonProps) {
    return (
        <IconButton size="xs" color="transparent" aria-label={`${show ? 'Hide' : 'Show'} text`} {...other}>
            {show ? <Eye color="#3F3F46" /> : <EyeOff color="#3F3F46" />}
        </IconButton>
    );
}

export const HiddenText = forwardRef<HTMLDivElement, HiddenTextProps>(function HiddenText(
    { children, width = 200 },
    forwardedRef,
) {
    const [show, setShow] = useState(false);

    if (typeof children !== 'string') {
        throw Error('Only string children acceptable');
    }

    return (
        <div className="flex items-center" style={{ width }} ref={forwardedRef}>
            {show ? (
                <div title={children} className="text-grey-700 flex-1 truncate font-sans text-sm">
                    {children}
                </div>
            ) : (
                <Dots width={width} />
            )}
            <ShowHideButton show={show} onClick={() => setShow(!show)} />
        </div>
    );
});
