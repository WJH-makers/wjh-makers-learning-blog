export type SiteNavItem = {
  href: string;
  label: string;
  matches: readonly string[];
  external?: boolean;
};

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { href: "/start", label: "开始", matches: ["/start"] },
  { href: "/universe", label: "宇宙", matches: ["/universe"] },
  { href: "/series", label: "连载", matches: ["/series", "/posts", "/java", "/cli", "/cafe", "/career"] },
  { href: "/coffee-station", label: "咖啡站", matches: ["/coffee-station"] },
  { href: "/projects", label: "项目", matches: ["/projects"] },
];

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSiteNavItemActive(pathname: string, item: SiteNavItem): boolean {
  return item.matches.some((prefix) => isPathWithin(pathname, prefix));
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/";
}
