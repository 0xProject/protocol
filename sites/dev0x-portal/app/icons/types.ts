import type { SVGAttributes } from "react";

export type IconProps = SVGAttributes<SVGElement> & {
    children?: never;
    color?: string;
}