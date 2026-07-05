"use client";

import { motion } from "framer-motion";

import {
  MdMusicNote,
  MdLocationOn,
  MdSearch,
} from "react-icons/md";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#08051d] via-[#13072d] to-[#22043d] flex items-center justify-center">

      {/* Background Glow */}

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [.25, .45, .25],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
        className="absolute w-[600px] h-[600px] rounded-full bg-purple-600 blur-[160px]"
      />

      {/* Floating Music */}

      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            y: 120,
            opacity: 0,
            x: Math.random() * 400 - 200,
          }}
          animate={{
            y: -600,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            delay: i * .7,
          }}
          className="absolute text-pink-400/40 text-3xl"
        >
          🎵
        </motion.div>
      ))}

      {/* Main */}

      <div className="relative flex flex-col items-center">

        {/* Logo */}

        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
          className="relative"
        >

          <div className="absolute inset-0 rounded-full bg-pink-500 blur-3xl opacity-40" />

          <div className="relative w-36 h-36 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center text-6xl shadow-[0_0_80px_rgba(236,72,153,.7)]">

                       <div className="h-36 w-36 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center overflow-hidden">
  <img
    src="/logo.png"
    alt="GwaliorHub Logo"
    className="w-36 h-36 rounded-full object-contain"
  />
</div>

          </div>

        </motion.div>

        {/* Name */}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: .8,
          }}
          className="mt-8 text-5xl font-black tracking-wider bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 text-transparent bg-clip-text"
        >
          GWALIOR HUB
        </motion.h1>

        <p className="text-pink-300 tracking-[6px] mt-2 uppercase">
          City of Music
        </p>

        {/* Motto */}

        <div className="flex items-center gap-8 mt-10 text-white">

          <div className="flex flex-col items-center">

            <MdLocationOn className="text-pink-400 text-4xl" />

            <span className="mt-2">Explore</span>

          </div>

          <div className="flex flex-col items-center">

            <MdSearch className="text-blue-400 text-4xl" />

            <span className="mt-2">Find</span>

          </div>

          <div className="flex flex-col items-center">

            <MdMusicNote className="text-orange-400 text-4xl" />

            <span className="mt-2">Connect</span>

          </div>

        </div>

        {/* Loading */}

        <div className="mt-16 w-72">

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">

            <motion.div
              animate={{
                x: ["-100%", "250%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.3,
                ease: "linear",
              }}
              className="h-full w-1/3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full"
            />

          </div>

          <motion.p
            animate={{
              opacity: [.4, 1, .4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
            }}
            className="text-center text-white/70 mt-5"
          >
            Exploring Gwalior...
          </motion.p>

        </div>

      </div>
    </div>
  );
}