"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, User } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `transition font-medium ${
      pathname === path
        ? "text-purple-400"
        : "text-white hover:text-purple-300"
    }`;

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
      className="hidden md:flex sticky top-0 z-50 justify-center px-6 py-4"
    >
      <div className="w-full max-w-7xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl">

        <div className="flex items-center justify-between px-8 py-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">

            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center overflow-hidden">
  <img
    src="/logo.png"
    alt="GwaliorHub Logo"
    className="w-12 h-12 object-contain"
  />
</div>

            <div>

              <h1 className="text-white text-2xl font-black">
                GwaliorHub
              </h1>

              <p className="text-xs text-white/50">
                Discover Your City
              </p>

            </div>

          </Link>

          {/* Navigation */}

          <nav className="flex items-center gap-7">

            <Link href="/feed" className={linkClass("/")}>
              Home
            </Link>

            <Link
              href="/explore"
              className={linkClass("/explore")}
            >
              Explore
            </Link>

            <Link
              href="/confession"
              className={linkClass("/wall")}
            >
              Gwalior Wall
            </Link>
             <Link
              href="/places"
              className={linkClass("places")}
            >
              Places
            </Link>
            
            <Link
              href="/myposts"
              className={linkClass("/myposts")}
            >
              My Profile
            </Link>
             <Link
              href="/about"
              className={linkClass("/about")}
            >
              About Us
            </Link>

          </nav>

          {/* Right */}

          <div className="flex items-center gap-4">

            <Link
              href="/posts"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 text-white font-semibold hover:scale-105 transition"
            >
              <PlusCircle size={20} />
              Post
            </Link>

            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white hover:bg-white/10 transition"
            >
              <User size={18} />
              Login
            </Link>

          </div>

        </div>

      </div>
    </motion.header>
  );
}