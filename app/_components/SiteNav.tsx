"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { isHomeActive, isSiteNavItemActive, SITE_NAV_ITEMS } from "@/lib/navigation";

export default function SiteNav() {
  const pathname = usePathname() ?? "/";
  const homeActive = isHomeActive(pathname);

  return (
    <>
      <Link className={`brand${homeActive ? " is-active" : ""}`} href="/" aria-current={homeActive ? "page" : undefined}>
        咖啡站技术志
      </Link>
      <div className="nav-links">
        {SITE_NAV_ITEMS.map((item) => {
          const active = isSiteNavItemActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={active ? "is-active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
