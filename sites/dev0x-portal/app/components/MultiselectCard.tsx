import { forwardRef } from 'react';
import { Label } from './Label';
import { twMerge } from 'tailwind-merge';
import { Radio } from './Radio';

type MultiSelectCardProps = {
    title: string;
    description: string;
    icon: React.ReactNode;
    labelDecorator?: React.ReactNode;
    selected?: boolean;
    onChange?: (selected: boolean) => void;
    name?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const MultiSelectCard = forwardRef<HTMLDivElement, MultiSelectCardProps>(function MultiSelectCard(
    { title, description, icon, selected, onChange, className, id, name, labelDecorator, ...props },
    forwardedRef,
) {
    if (!id) {
        console.warn(
            "MultiSelectCard: id is required for accessibility purposes. Please add an id to the component's props.",
        );
    }

    return (
        <div aria-label="select card" className="relative h-fit w-fit">
            <div
                {...props}
                ref={forwardedRef}
                className={twMerge(
                    ' bg-grey-100 flex min-h-[93px] w-fit max-w-[300px] cursor-pointer rounded-xl p-4',
                    className,
                )}
            >
                <div
                    aria-hidden
                    className="bg-grey-100 flex h-8 w-8 items-center justify-center rounded-md p-2 mix-blend-multiply"
                >
                    {icon}
                </div>
                <div className="ml-3">
                    <div className="flex items-center">
                        <Label
                            label={title}
                            htmlFor={id}
                            className="text-grey-900 mr-2 text-base font-semibold antialiased"
                        />
                        {labelDecorator}
                    </div>
                    <div id={`${id}-description`} className="text-grey-400 text-sm antialiased">
                        {description}
                    </div>
                </div>

                <Radio
                    name={name}
                    id={id}
                    aria-describedby={`${id}-description`}
                    defaultChecked={selected}
                    className="ml-3 flex-shrink-0 after:absolute after:left-0 after:right-0 after:bottom-0 after:top-0 after:z-10" // to make the whole card clickable
                />
            </div>
        </div>
    );
});
