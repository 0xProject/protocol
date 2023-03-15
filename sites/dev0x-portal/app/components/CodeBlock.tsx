import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { CopyIcon } from '@radix-ui/react-icons';
import { IconButton } from './IconButton';

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

            <IconButton
                aria-label="Copy code"
                color="transparent"
                size="xs"
                className="translate-x-3"
                onClick={() => {
                    // const text = copyText.replace('\n', '');
                    navigator.clipboard.writeText(copyText);
                }}
            >
                <CopyIcon color="#A0A0AB" />
            </IconButton>
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
