import type { SVGProps } from "react";
import { icons, type IconName } from "./icons/index";

export interface SezzyIconProps extends SVGProps<SVGSVGElement> {
  // `string & {}` keeps IconName autocomplete/hints while still accepting
  // any plain string — callers with a dynamic name (e.g. from config/data)
  // don't need an `as IconName` cast.
  name: IconName | (string & {});
}

/**
 * Renders a sezzy-icons icon by name — useful when the icon is chosen
 * dynamically (e.g. driven by config or a name-keyed lookup table).
 * Prefer importing the named icon component directly when the icon is
 * known statically, since that tree-shakes better.
 */
export function SezzyIcon({ name, ...props }: SezzyIconProps) {
  const Component = icons[name as IconName];
  if (!Component) return null;
  return <Component {...props} />;
}
