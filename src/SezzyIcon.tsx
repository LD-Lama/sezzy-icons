import type { SVGProps } from "react";
import { icons, type IconName } from "./icons/index";

export interface SezzyIconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

/**
 * Renders a sezzy-icons icon by name — useful when the icon is chosen
 * dynamically (e.g. driven by config or a name-keyed lookup table).
 * Prefer importing the named icon component directly when the icon is
 * known statically, since that tree-shakes better.
 */
export function SezzyIcon({ name, ...props }: SezzyIconProps) {
  const Component = icons[name];
  return <Component {...props} />;
}
