"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Plus,
  MessageSquareText,
  User,
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const active = (path: string) =>
    pathname === path;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Background */}
      <div className="relative h-20 border-t border-white/10 bg-[#09090B]/90 backdrop-blur-2xl">

        {/* Floating Post Button */}
        <Link
          href="/posts"
          className="absolute -top-7 left-1/2 -translate-x-1/2"
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.08 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 shadow-2xl shadow-purple-500/40"
          >
            <Plus
              size={30}
              className="text-white"
            />
          </motion.div>
        </Link>

        {/* Navigation */}
        <div className="flex h-full items-center justify-around px-2">

          {/* Home */}
          <Link
            href="/feed"
            className={`flex flex-col items-center text-xs transition ${
              active("/")
                ? "text-purple-400"
                : "text-white/60"
            }`}
          >
            <Home size={23} />
            <span className="mt-1">
              Home
            </span>
          </Link>

          {/* Explore */}
          <Link
            href="/explore"
            className={`flex flex-col items-center text-xs transition ${
              active("/explore")
                ? "text-purple-400"
                : "text-white/60"
            }`}
          >
            <Search size={23} />
            <span className="mt-1">
              Explore
            </span>
          </Link>

          {/* Spacer */}
          <div className="w-16"></div>

          {/* Wall */}
          <Link
            href="/confession"
            className={`flex flex-col items-center text-xs transition ${
              active("/confession")
                ? "text-purple-400"
                : "text-white/60"
            }`}
          >
            <MessageSquareText size={23} />
            <span className="mt-1">
              Wall
            </span>
          </Link>

          {/* Profile */}
          <Link
            href="/myposts"
            className={`flex flex-col items-center text-xs transition ${
              active("/profile")
                ? "text-purple-400"
                : "text-white/60"
            }`}
          >
            <User size={23} />
            <span className="mt-1">
              Profile
            </span>
          </Link>

        </div>
      </div>
    </motion.div>
  );
}