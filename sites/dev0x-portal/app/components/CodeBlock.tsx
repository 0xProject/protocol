import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { IconButton } from './IconButton';
import { useTemporaryState } from '../hooks/useTemporaryState';
import { Check } from '../icons/Check';
import { Copy2 } from '../icons/Copy2';

import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

export type RootProps = ComponentPropsWithoutRef<'div'>;
export const Root = forwardRef<HTMLDivElement, RootProps>(function Root({ className, ...other }, forwardedRef) {
    return <div {...other} className={twMerge('bg-grey-900 flex flex-col rounded-xl', className)} ref={forwardedRef} />;
});

export type HeaderProps = ComponentPropsWithoutRef<'div'> & {
    copyText: string;
};
export const Header = forwardRef<HTMLDivElement, HeaderProps>(function Header(
    { children, className, copyText, ...other },
    forwardedRef,
) {
    const [clicked, setClicked] = useTemporaryState(false, 2000);
    return (
        <div
            className={twMerge(
                'border-grey-800 flex items-center justify-between border-b border-solid p-3',
                className,
            )}
            ref={forwardedRef}
            {...other}
        >
            <div>{children}</div>

            {!clicked ? (
                <IconButton
                    aria-label="Copy code"
                    color="transparent"
                    size="xs"
                    className="translate-x-3"
                    onClick={() => {
                        navigator.clipboard.writeText(copyText);
                        setClicked(true);
                    }}
                >
                    <Copy2 color="#A0A0AB" width={16} height={16} />
                </IconButton>
            ) : (
                <div className="bg-grey-800 flex items-center rounded-xl py-1 px-2.5 text-base text-white antialiased shadow-md">
                    <span className="mr-2">Copied</span>
                    <Check width={16} height={16} className="relative -top-[1px]" />
                </div>
            )}
        </div>
    );
});

export type ContentProps = SyntaxHighlighterProps & {};
export const Content = forwardRef<ElementRef<typeof SyntaxHighlighter>, ContentProps>(function Content(
    { customStyle = {}, codeTagProps, language = 'bash', style = atomDark, ...other },
    forwardedRef,
) {
    const { style: codeTagStyle = {}, ...otherCodeTagProps } = codeTagProps || {};
    return (
        <SyntaxHighlighter
            ref={forwardedRef}
            customStyle={{
                backgroundColor: 'transparent',
                margin: 0,
                padding: 0,
                height: '100%',
                ...customStyle,
            }}
            codeTagProps={{
                style: {
                    fontSize: '14px',
                    lineHeight: '20px',
                    ...codeTagStyle,
                },
                ...otherCodeTagProps,
            }}
            wrapLongLines={true}
            language={language}
            style={style}
            {...other}
        />
    );
});
