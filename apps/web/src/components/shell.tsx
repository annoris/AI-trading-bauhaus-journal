"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FILTER_KEYS } from "@trading-bauhaus/journal-core";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Notebook,
  CalendarDays,
  Download,
  LayoutDashboard,
  ChartCandlestick,
  NotebookPen,
  Settings,
  Target,
  BookmarkPlus,
  Wallet,
  Landmark,
  Menu,
  ArrowRight,
  LogOut,
  UserRoundPlus,
  LifeBuoy,
  Bug,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { PrivacyToggle } from "./privacy";
import { ThemeToggle } from "./theme";
import { PageTransition } from "./page-transition";
import { Button } from "./ui/button";
import { HoverHint } from "./ui/tooltip";
import { DemoModeContext } from "./demo-mode-context";
import { FuturisticFooter } from "@/components/futuristic-footer";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/journal", label: "Daily journal", icon: NotebookPen },
  { href: "/trades", label: "Trades", icon: ChartCandlestick },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/prop-firms", label: "Prop firms", icon: Landmark },
  { href: "/notebook", label: "Notebook", icon: Notebook },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: Target },
  { href: "/missed", label: "Missed trades", icon: BookmarkPlus },
] as const;

const NAV_SETUP = [
  { href: "/import", label: "Import", icon: Download },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const SIDEBAR_COLLAPSED_KEY = "journal-sidebar-collapsed-v1";
const DEMO_WRITE_ACTION =
  /^(add|new|create|save|delete|remove|import|upload|connect|sync|edit|update|archive|restore|duplicate|revoke|suspend|reactivate|submit|ask|generate|write|run|reset|load|customize|export|download|print|full backup|dashboard layouts|manage layouts?|save layouts?|show all cards|rearrange|move|sign out)\b/i;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <HoverHint content={collapsed ? label : null} side="right">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "journal-sidebar-nav-link relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
          active
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4", active && "text-brand")} />
        <span className="journal-sidebar-label">{label}</span>
      </Link>
    </HoverHint>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const demoEntryPath = pathname === "/demo" || pathname.startsWith("/demo/");
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (["/", "/login", "/welcome", "/accept-invitation"].includes(pathname) || demoEntryPath) {
      setDemoMode(demoEntryPath);
      setIsOwner(false);
      setSessionReady(true);
      return;
    }
    let active = true;
    const syncSession = () => {
      fetch("/api/session", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Session unavailable");
          return response.json();
        })
        .then((session: { demo?: boolean; role?: string | null }) => {
          if (!active) return;
          setDemoMode(session.demo === true);
          setIsOwner(session.demo !== true && session.role === "owner");
          setSessionReady(true);
        })
        .catch(() => {
          if (!active) return;
          setDemoMode(false);
          setIsOwner(false);
          setSessionReady(true);
        });
    };
    syncSession();
    window.addEventListener("pageshow", syncSession);
    window.addEventListener("focus", syncSession);
    return () => {
      active = false;
      window.removeEventListener("pageshow", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, [demoEntryPath, pathname]);
  useEffect(() => {
    if (!demoMode) return;
    const originalState = new Map<
      HTMLElement,
      {
        hidden: boolean;
        disabled: boolean | null;
        ariaDisabled: string | null;
        tabIndex: string | null;
        contentEditable: string | null;
        pointerEvents: string;
      }
    >();
    const selector =
      'button, summary, a[download], a[href^="/api/export"], [role="button"], [role="tab"], [role="checkbox"], [role="combobox"], [role="switch"], [role="menuitem"], [role="option"], input, textarea, select, [contenteditable="true"]';
    const isNavigationToggle = (element: HTMLElement) =>
      element.getAttribute("aria-label") === "Open navigation" ||
      element.getAttribute("aria-label") === "Close navigation";
    const blockControlInteraction = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (event.type === "submit" && target instanceof HTMLFormElement) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const control = target.closest<HTMLElement>(selector);
      if (!control || isNavigationToggle(control)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const lockControls = () => {
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        const alreadyProcessed = originalState.has(element);
        if (element.hidden && !alreadyProcessed) continue;
        if (isNavigationToggle(element)) continue;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const isNativeControl =
          element instanceof HTMLButtonElement ||
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement;
        if (!alreadyProcessed)
          originalState.set(element, {
            hidden: element.hidden,
            disabled: isNativeControl ? element.disabled : null,
            ariaDisabled: element.getAttribute("aria-disabled"),
            tabIndex: element.getAttribute("tabindex"),
            contentEditable: element.getAttribute("contenteditable"),
            pointerEvents: element.style.pointerEvents,
          });
        const label = [
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
          element.textContent,
          element instanceof HTMLInputElement ? element.value : "",
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (
          element.matches('a[download], a[href^="/api/export"]') ||
          DEMO_WRITE_ACTION.test(label)
        ) {
          element.hidden = true;
          element.dataset.demoReadOnlyHidden = "true";
          continue;
        }
        if (isNativeControl && !(element as HTMLButtonElement).disabled)
          (
            element as
              HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          ).disabled = true;
        if (element.getAttribute("aria-disabled") !== "true")
          element.setAttribute("aria-disabled", "true");
        if (element.tabIndex !== -1) element.tabIndex = -1;
        if (element.isContentEditable && element.getAttribute("contenteditable") !== "false")
          element.setAttribute("contenteditable", "false");
        if (element.style.pointerEvents !== "none") element.style.pointerEvents = "none";
        element.dataset.demoReadOnlyDisabled = "true";
      }
    };
    lockControls();
    const observer = new MutationObserver(lockControls);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-disabled", "contenteditable", "disabled", "hidden", "tabindex"],
      childList: true,
      characterData: true,
      subtree: true,
    });
    for (const eventName of ["beforeinput", "change", "click", "keydown", "pointerdown", "submit"])
      document.addEventListener(eventName, blockControlInteraction, true);
    return () => {
      observer.disconnect();
      for (const eventName of [
        "beforeinput",
        "change",
        "click",
        "keydown",
        "pointerdown",
        "submit",
      ])
        document.removeEventListener(eventName, blockControlInteraction, true);
      for (const [element, state] of originalState) {
        element.hidden = state.hidden;
        if (state.disabled !== null)
          (
            element as
              HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          ).disabled = state.disabled;
        if (state.ariaDisabled === null) element.removeAttribute("aria-disabled");
        else element.setAttribute("aria-disabled", state.ariaDisabled);
        if (state.tabIndex === null) element.removeAttribute("tabindex");
        else element.setAttribute("tabindex", state.tabIndex);
        if (state.contentEditable === null) element.removeAttribute("contenteditable");
        else element.setAttribute("contenteditable", state.contentEditable);
        element.style.pointerEvents = state.pointerEvents;
        delete element.dataset.demoReadOnlyHidden;
        delete element.dataset.demoReadOnlyDisabled;
      }
    };
  }, [demoMode, pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    const read = () => {
      if (!sessionReady || demoMode || demoEntryPath) {
        setSidebarCollapsed(false);
        setSidebarReady(true);
        return;
      }
      try {
        setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
      } catch {
        setSidebarCollapsed(false);
      } finally {
        setSidebarReady(true);
      }
    };
    read();
    const sync = (event: StorageEvent) => {
      if (
        !demoMode &&
        sessionReady &&
        !demoEntryPath &&
        (event.key === SIDEBAR_COLLAPSED_KEY || event.key === null)
      )
        read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [demoEntryPath, demoMode, sessionReady]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (demoMode || !sessionReady || demoEntryPath) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "b") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [demoEntryPath, demoMode, sessionReady]);
  function toggleSidebar() {
    if (demoMode || !sessionReady || demoEntryPath) return;
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // The interaction still works when storage is unavailable.
      }
      return next;
    });
  }
  async function signOut() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.assign("/");
    }
  }
  const filterQuery = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = search.get(key);
    if (value) filterQuery.set(key, value);
  }
  if (search.get("range")) filterQuery.set("range", search.get("range")!);
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/welcome" ||
    pathname === "/demo" ||
    pathname.startsWith("/demo/") ||
    pathname === "/accept-invitation"
  )
    return <>{children}</>;
  const navigation = (collapsed = false) => (
    <nav
      aria-label="Journal navigation"
      className="journal-sidebar-navigation min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain p-2"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
      }}
    >
      {NAV.map(({ href, label, icon }) => (
        <NavLink
          key={href}
          href={href === "/prop-firms" ? href : filterQuery.size ? `${href}?${filterQuery}` : href}
          label={label}
          icon={icon}
          collapsed={collapsed}
          active={pathname.startsWith(href)}
        />
      ))}
      {isOwner && (
        <NavLink
          href="/owner/invitations"
          label="User access"
          icon={UserRoundPlus}
          collapsed={collapsed}
          active={pathname.startsWith("/owner/invitations")}
        />
      )}
      {!demoMode && isOwner && (
        <NavLink
          href="/owner/support"
          label="Support & errors"
          icon={Bug}
          collapsed={collapsed}
          active={pathname.startsWith("/owner/support")}
        />
      )}
      {!demoMode && (
        <NavLink
          href="/support"
          label="Support"
          icon={LifeBuoy}
          collapsed={collapsed}
          active={pathname === "/support"}
        />
      )}
      <div className="!my-3 border-t" />
      {NAV_SETUP.filter(({ href }) => !demoMode || href !== "/import").map(
        ({ href, label, icon }) => (
          <NavLink
            key={href}
            href={filterQuery.size ? `${href}?${filterQuery}` : href}
            label={label}
            icon={icon}
            collapsed={collapsed}
            active={pathname.startsWith(href)}
          />
        ),
      )}
    </nav>
  );
  return (
    <div
      className={cn("journal-shell min-h-dvh lg:flex", demoMode && "pt-9 lg:pt-0")}
      data-demo-mode={demoMode ? "true" : undefined}
    >
      {demoMode && (
        <div className="fixed inset-x-0 top-0 z-[60] flex h-9 items-center justify-center gap-3 border-b border-amber-400/30 bg-amber-300 px-2 text-center text-[10px] font-semibold tracking-wide text-amber-950 sm:text-[11px]">
          <span>DEMO · sample data · read-only</span>
          <a
            href="/welcome#access"
            className="inline-flex shrink-0 items-center rounded px-1 py-1 underline underline-offset-2 hover:bg-amber-200"
          >
            Request an invitation
          </a>
          <a
            href="/demo/exit"
            className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-950/20 px-2 py-1 hover:bg-amber-200"
          >
            Exit demo <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
      <header
        className="journal-mobile-header sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur lg:hidden"
        style={demoMode ? { top: "2.25rem" } : undefined}
      >
        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="journal-nav-overlay fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
            <DialogPrimitive.Content
              className="journal-nav-drawer fixed inset-y-0 left-0 z-50 flex w-[min(288px,calc(100vw-40px))] flex-col border-r bg-card shadow-2xl"
              aria-describedby={undefined}
            >
              <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
                <BrandLogo animated />
                <DialogPrimitive.Title className="sr-only">Trading Bauhaus</DialogPrimitive.Title>
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8"
                    aria-label="Close navigation"
                  >
                    <X />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              {navigation()}
              <div className="space-y-2 border-t p-3">
                {!demoMode && sessionReady && <PrivacyToggle />}
                {!demoMode && sessionReady && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => void signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                )}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <Link
          href="/dashboard"
          className="mr-auto flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <BrandLogo animated />
        </Link>
        {!demoMode && sessionReady && <PrivacyToggle compact />}
        {!demoMode && sessionReady && <ThemeToggle iconOnly />}
      </header>
      <aside
        className="journal-desktop-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card/50 lg:flex"
        data-collapsed={sidebarCollapsed}
        data-ready={sidebarReady}
        style={demoMode ? { top: "2.25rem", height: "calc(100dvh - 2.25rem)" } : undefined}
      >
        <div className="journal-sidebar-header relative flex h-14 shrink-0 items-center border-b">
          <Link
            href="/dashboard"
            className="journal-sidebar-home flex h-full min-w-0 items-center gap-2.5"
          >
            <BrandLogo animated className={sidebarCollapsed ? "h-8 w-10" : "h-14 w-44"} />
          </Link>
          {!demoMode && !demoEntryPath && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="journal-sidebar-trigger absolute h-7 w-7 rounded-full bg-background shadow-sm"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-keyshortcuts="Meta+B Control+B"
              title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
              disabled={!sessionReady}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
        {navigation(sidebarCollapsed)}
        {!demoMode && sessionReady && (
          <div className="journal-sidebar-privacy border-t p-3">
            <div className="w-full space-y-1">
              <ThemeToggle iconOnly={sidebarCollapsed} />
              <PrivacyToggle iconOnly={sidebarCollapsed} />
              <Button
                variant="ghost"
                title="Sign out"
                aria-label="Sign out"
                className={sidebarCollapsed ? "w-full px-0" : "w-full justify-start"}
                onClick={() => void signOut()}
              >
                <LogOut className={sidebarCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!sidebarCollapsed && "Sign out"}
              </Button>
            </div>
          </div>
        )}
      </aside>
      <DemoModeContext.Provider value={{ demoMode, sessionReady }}>
        <div
          className={cn(
            "min-w-0 flex-1 flex flex-col justify-between min-h-screen",
            demoMode && "lg:pt-9",
          )}
        >
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <FuturisticFooter />
        </div>
      </DemoModeContext.Provider>
    </div>
  );
}
