"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavGroup } from "@/components/layout/nav-items";

export function SideNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                {item.soon ? (
                  <span
                    aria-disabled="true"
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-400"
                  >
                    {item.label}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={
                      isActive(pathname, item.href) ? "page" : undefined
                    }
                    className={
                      isActive(pathname, item.href)
                        ? "block rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                        : "block rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    }
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const depth = href.split("/").filter(Boolean).length;
  return depth > 1 && pathname.startsWith(`${href}/`);
}
