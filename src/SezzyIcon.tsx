import type { SVGProps } from "react";
import { icons, type IconName } from "./icons/index";

export interface SezzyIconProps extends SVGProps<SVGSVGElement> {
  // `string & {}` keeps IconName autocomplete/hints while still accepting
  // any plain string — callers with a dynamic name (e.g. from config/data)
  // don't need an `as IconName` cast.
  name: IconName | (string & {});
}

/**
 * Renders a sezzy-icons icon by name. This is the only way to render an
 * icon — individual icon components aren't exported, so every consumer
 * goes through one consistent API.
 */
export function SezzyIcon({ name, ...props }: SezzyIconProps) {
  const Component = icons[name as IconName];
  if (!Component) return null;
  return <Component {...props} />;
}
