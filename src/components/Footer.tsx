"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#09090B]">

      <div className="mx-auto max-w-7xl px-8 py-2">

        <div className="flex flex-col md:flex-row items-center justify-between gap-8">

          {/* Logo */}

          <div>

            <h2 className="text-3xl font-black text-white">
              <img
    src="/logo.png"
    alt="GwaliorHub Logo"
    className="w-25 h-25 object-contain"
  /> GwaliorHub
            </h2>

            <p className="mt-2 text-white/60">
              Everything Happening in Gwalior
            </p>

          </div>

          {/* Links */}

          <div className="flex gap-8 text-white/70">

            <Link href="/">Home</Link>

            <Link href="/explore">
              Explore
            </Link>

            <Link href="/wall">
              Wall
            </Link>

            <Link href="/myposts">
              my profile
            </Link>

          </div>

        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/40">

          © {new Date().getFullYear()} GwaliorHub • Built with ❤️ for Gwalior

        </div>

      </div>

    </footer>
  );
}