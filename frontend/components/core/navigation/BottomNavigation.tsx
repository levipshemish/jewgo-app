"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Heart, Star, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  href: string;
  gradient: string;
  iconColor: string;
  bgColor: string;
};

const MENU: MenuItem[] = [
  { 
    icon: <Home className="h-5 w-5" />, 
    label: "Home", 
    href: "/",           
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.1) 100%)", 
    iconColor: "text-blue-500",  
    bgColor: "bg-blue-500/10" 
  },
  { 
    icon: <Heart className="h-5 w-5" />, 
    label: "Favorites", 
    href: "/favorites", 
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(219,39,119,0.1) 100%)", 
    iconColor: "text-pink-500",  
    bgColor: "bg-pink-500/10" 
  },
  { 
    icon: <Star className="h-5 w-5" />, 
    label: "Specials", 
    href: "/specials",   
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)",  
    iconColor: "text-amber-500", 
    bgColor: "bg-amber-500/10" 
  },
  { 
    icon: <Bell className="h-5 w-5" />, 
    label: "Notifications", 
    href: "/notifications", 
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(234,88,12,0.1) 100%)", 
    iconColor: "text-orange-500", 
    bgColor: "bg-orange-500/10" 
  },
  { 
    icon: <User className="h-5 w-5" />, 
    label: "Profile", 
    href: "/profile",   
    gradient: "linear-gradient(135deg, rgba(139,69,19,0.2) 0%, rgba(101,49,13,0.1) 100%)",    
    iconColor: "text-amber-700", 
    bgColor: "bg-amber-700/10" 
  },
];

interface BottomNavigationProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  notificationCount?: number;
}

export default function BottomNavigation({
  currentPath,
  onNavigate,
  notificationCount = 0,
}: BottomNavigationProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  
  // Use currentPath prop or fallback to pathname
  const activePath = currentPath || pathname;

  const activeIndex = React.useMemo(() => {
    const i = MENU.findIndex(m =>
      m.href === "/" ? activePath === "/" : activePath === m.href || activePath.startsWith(`${m.href}/`)
    );
    return i >= 0 ? i : -1; // Return -1 if no match found
  }, [activePath]);

  const indicatorLeftPct = activeIndex >= 0 ? (activeIndex + 0.5) * (100 / MENU.length) : 0;

  const vibrate = React.useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as any).vibrate(10); } catch {}
    }
  }, []);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (onNavigate) {
        e.preventDefault();
        vibrate();
        onNavigate(href);
      } else {
        vibrate(); // allow normal navigation when no router is wired
      }
    },
    [onNavigate, vibrate]
  );

  // Expose CSS variable for bottom nav height so pages can pad content accordingly
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeightVar = () => {
      const height = Math.ceil(el.offsetHeight || el.getBoundingClientRect().height);
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--bottom-nav-height', `${height}px`);
      }
    };

    // Initial measurement
    updateHeightVar();

    // Observe size changes
    const resizeObserver = new ResizeObserver(() => updateHeightVar());
    resizeObserver.observe(el);

    // Handle viewport changes
    window.addEventListener('resize', updateHeightVar);
    window.addEventListener('orientationchange', updateHeightVar);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeightVar);
      window.removeEventListener('orientationchange', updateHeightVar);
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--bottom-nav-height');
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <motion.nav
        role="navigation"
        aria-label="Primary"
        className="relative w-full overflow-hidden border-t border-gray-200/50 bg-white shadow-lg"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
      >
        {/* Active background indicator */}
        {activeIndex >= 0 && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 h-full w-12 rounded-xl bg-gradient-to-b from-blue-500/10 to-blue-500/5 will-change-transform"
            style={{ left: "0%", transform: `translateX(${indicatorLeftPct}%) translateX(-50%)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <ul className="relative flex items-center">
          {MENU.map((item, index) => {
            const isActive = index === activeIndex;
            const base =
              "group relative flex h-16 select-none flex-col items-center justify-center gap-1 px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-xl";
            const tone = isActive
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";

            return (
              <li key={item.href} className="relative flex-1" data-nav-item={item.label} data-active={isActive ? "true" : "false"}>
                <Link
                  href={item.href}
                  className={[base, tone].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e: any) => handleClick(e, item.href)}
                >
                  {/* soft per-item glow */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 rounded-xl ${isActive ? "" : "opacity-0 group-hover:opacity-100"}`}
                    style={{ background: item.gradient, transition: "opacity 200ms" }}
                  />

                  {/* icon */}
                  <motion.span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? item.bgColor : "hover:bg-gray-100 dark:hover:bg-gray-800"} motion-reduce:transform-none motion-reduce:transition-none`}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <motion.span
                      className={isActive ? item.iconColor : ""}
                      animate={prefersReducedMotion ? undefined : isActive ? { rotateY: 360 } : { rotateY: 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      {item.icon}
                    </motion.span>

                    {isActive && !prefersReducedMotion && (
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-blue-500/70"
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.1, 0.4] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.span>

                  <span className={`text-xs ${isActive ? "font-semibold text-gray-900 dark:text-white" : ""}`}>
                    {item.label}
                  </span>

                  {/* notifications badge */}
                  {item.label === "Notifications" && notificationCount > 0 && (
                    <>
                      <span
                        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
                        aria-hidden="true"
                      >
                        {notificationCount}
                      </span>
                      <span className="sr-only" aria-live="polite">
                        {notificationCount} new notifications
                      </span>
                    </>
                  )}

                  {/* active underline pill */}
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 h-1 w-10 rounded-full bg-current opacity-60"
                    initial={false}
                    animate={{ opacity: isActive ? 0.9 : 0, y: isActive ? 0 : 6, scaleX: isActive ? 1 : 0.5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* bottom hairline accent */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </motion.nav>
    </div>
  );
}
