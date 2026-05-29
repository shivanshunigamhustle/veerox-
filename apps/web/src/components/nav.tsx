"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  Phone,
  Settings,
  LogIn,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/",             label: "Dashboard",    Icon: LayoutDashboard },
  { href: "/conversations",label: "Conversations",Icon: MessageSquare   },
  { href: "/leads",        label: "Leads",        Icon: UserCheck       },
  { href: "/escalations",  label: "Escalations",  Icon: AlertTriangle   },
  { href: "/dial",         label: "Dial",         Icon: Phone           },
  { href: "/settings",     label: "Settings",     Icon: Settings        },
  { href: "/login",        label: "Login",        Icon: LogIn           },
];

export default function Nav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900 px-3 py-6 shrink-0">
      {/* Logo */}
      <div className="mb-8 px-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white text-base font-extrabold shadow-lg shadow-indigo-900/60 shrink-0">
          V
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white leading-none">Veerox AI</p>
          <p className="text-[10px] font-semibold text-indigo-400 mt-0.5 uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      {/* Section label */}
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">Navigation</p>

      {/* Nav items */}
      <ul className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/50" />}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="rounded-xl bg-slate-800/70 px-3 py-3 mt-2 border border-slate-700/50">
        <p className="text-xs font-semibold text-slate-400">v0.1.0 · Dev Mode</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Voice + WhatsApp Agent</p>
      </div>
    </nav>
  );
}
