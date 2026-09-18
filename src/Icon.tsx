import type { SVGProps } from "react";
import { icons, type IconName } from "./icons/index";

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

/**
 * Renders a sezzy-icons icon by name — useful when the icon is chosen
 * dynamically (e.g. driven by config or a name-keyed lookup table).
 * Prefer importing the named icon component directly when the icon is
 * known statically, since that tree-shakes better.
 */
export function Icon({ name, ...props }: IconProps) {
  const Component = icons[name];
  return <Component {...props} />;
}
