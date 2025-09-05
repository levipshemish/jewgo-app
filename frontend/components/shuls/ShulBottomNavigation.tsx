"use client"

import type * as React from "react"
import { motion } from "framer-motion"
import { Home, Heart, Star, Bell, User } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MenuItem {
  icon: React.ReactNode
  label: string
  href: string
  gradient: string
  iconColor: string
}

const menuItems: MenuItem[] = [
  {
    icon: <Home className="h-5 w-5" />,
    label: "Home",
    href: "/",
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
  },
  {
    icon: <Heart className="h-5 w-5" />,
    label: "Favorites",
    href: "/favorites",
    gradient: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(219,39,119,0.06) 50%, rgba(190,24,93,0) 100%)",
    iconColor: "text-pink-500",
  },
  {
    icon: <Star className="h-5 w-5" />,
    label: "Specials",
    href: "/specials",
    gradient: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.06) 50%, rgba(180,83,9,0) 100%)",
    iconColor: "text-yellow-500",
  },
  {
    icon: <Bell className="h-5 w-5" />,
    label: "Notifications",
    href: "/notifications",
    gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    iconColor: "text-orange-500",
  },
  {
    icon: <User className="h-5 w-5" />,
    label: "Profile",
    href: "/profile",
    gradient: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
    iconColor: "text-red-500",
  },
]

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
      scale: { duration: 0.5, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
}

const sharedTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.5,
}

export default function ShulBottomNavigation() {
  const { theme } = useTheme()
  const pathname = usePathname()
  const isDarkTheme = theme === "dark"

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 p-2 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border-t border-border/40 shadow-lg relative overflow-hidden"
      initial="initial"
      whileHover="hover"
    >
      <motion.div
        className={`absolute -inset-2 bg-gradient-radial from-transparent ${
          isDarkTheme
            ? "via-blue-400/30 via-20% via-pink-400/30 via-40% via-yellow-400/30 via-60% via-orange-400/30 via-80% via-red-400/30 via-100%"
            : "via-blue-400/20 via-20% via-pink-400/20 via-40% via-yellow-400/20 via-60% via-orange-400/20 via-80% via-red-400/20 via-100%"
        } to-transparent rounded-3xl z-0 pointer-events-none`}
        variants={navGlowVariants}
      />
      <ul className="flex items-center justify-around gap-1 relative z-10">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <motion.li key={item.label} className="relative flex-1">
              <motion.div
                className="block rounded-xl overflow-visible group relative"
                style={{ perspective: "600px" }}
                whileHover="hover"
                initial="initial"
              >
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none"
                  variants={glowVariants}
                  style={{
                    background: item.gradient,
                    opacity: 0,
                    borderRadius: "16px",
                  }}
                />
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-3 relative z-10 bg-transparent transition-colors rounded-xl h-16 justify-center ${
                    isActive
                      ? "text-primary-foreground bg-primary/20"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                >
                  <motion.span 
                    className={`transition-colors duration-300 group-hover:${item.iconColor} ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                    variants={itemVariants}
                    transition={sharedTransition}
                  >
                    {item.icon}
                  </motion.span>
                  <motion.span 
                    className="text-xs font-medium"
                    variants={itemVariants}
                    transition={sharedTransition}
                  >
                    {item.label}
                  </motion.span>
                </Link>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-3 absolute inset-0 z-10 bg-transparent transition-colors rounded-xl h-16 justify-center ${
                    isActive
                      ? "text-primary-foreground bg-primary/20"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center top", transform: "rotateX(90deg)" }}
                >
                  <motion.span 
                    className={`transition-colors duration-300 group-hover:${item.iconColor} ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                    variants={backVariants}
                    transition={sharedTransition}
                  >
                    {item.icon}
                  </motion.span>
                  <motion.span 
                    className="text-xs font-medium"
                    variants={backVariants}
                    transition={sharedTransition}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
            </motion.li>
          )
        })}
      </ul>
    </motion.nav>
  )
}
