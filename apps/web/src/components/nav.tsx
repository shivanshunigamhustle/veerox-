"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/conversations", label: "Conversations" },
  { href: "/leads", label: "Leads" },
  { href: "/escalations", label: "Escalations" },
  { href: "/dial", label: "Dial" },
  { href: "/settings", label: "Settings" },
  { href: "/login", label: "Login" },
];

export default function Nav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white px-3 py-6 shrink-0">
      <div className="mb-8 px-3">
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Veerox AI
        </span>
        <span className="ml-1 text-xs text-gray-400 font-medium">admin</span>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
