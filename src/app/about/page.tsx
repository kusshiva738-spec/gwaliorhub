"use client";
import DashboardLayout from "@/components/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",

  description:
    "Learn about the vision and mission behind GwaliorHub and why we built it for the people of Gwalior.",
};

import {
  FaBullseye,
  FaHeart,
  FaHandsHelping,
  FaMapMarkerAlt,
  FaQrcode,
  FaRocket,
  FaUsers,
  FaGift,
  FaGraduationCap,
  FaHome,
  FaStore,
} from "react-icons/fa";

const features = [
  {
    icon: "🎉",
    title: "Events",
    desc: "College events, workshops, sports, cultural programs and festivals.",
  },
  {
    icon: "🏠",
    title: "Rooms & PG",
    desc: "Find rooms, hostels, flats and PGs near your location.",
  },
  {
    icon: "📚",
    title: "Education",
    desc: "Home tuition, coaching institutes and training centers.",
  },
  {
    icon: "💼",
    title: "Jobs",
    desc: "Internships, part-time and full-time opportunities.",
  },
  {
    icon: "🛍️",
    title: "Offers",
    desc: "Discover discounts and exciting offers from local businesses.",
  },
  {
    icon: "🍲",
    title: "Bhandara",
    desc: "Know today's bhandaras and food distribution nearby.",
  },
  {
    icon: "📢",
    title: "Advertisement",
    desc: "Promote your business and reach thousands of people.",
  },
  {
    icon: "🤝",
    title: "Community",
    desc: "Lost & Found, NGOs, Blood Donation and community support.",
  },
];

export default function AboutPage() {
  return (
    <DashboardLayout>
    <main className="min-h-screen text-white bg-[#080814]
    bg-[radial-gradient(circle_at_top_left,#7c3aed25,transparent_35%),radial-gradient(circle_at_bottom_right,#ec489925,transparent_35%),linear-gradient(to_bottom,#070710,#101325,#070710)]">

{/* HERO */}

<section className="relative overflow-hidden py-12">

  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-cyan-500/20 blur-3xl" />

  <div className="relative max-w-6xl mx-auto px-4 text-center">

    <img
      src="/logo.png"
      className="w-24 h-24 mx-auto rounded-3xl
      shadow-[0_0_60px_rgba(168,85,247,.8)]
      animate-pulse"
    />

    <h1 className="mt-4 text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400 bg-clip-text text-transparent">
      GWALIOR HUB
    </h1>

    <p className="mt-2 text-lg text-purple-200">
      Connecting Every Corner of Gwalior
    </p>

    <p className="mt-4 text-sm max-w-3xl mx-auto text-white/70 leading-6">
      One platform where the people of Gwalior can discover,
      share and support everything happening in their city.

      Whether you're looking for an event, room, tuition,
      job, offer or want to promote your business—
      GwaliorHub brings everything together.
    </p>

  </div>

</section>

{/* WHY */}

<section className="max-w-6xl mx-auto px-4 py-6">

  <div className="rounded-2xl p-6
  bg-white/5 backdrop-blur-xl
  border border-white/10
  shadow-[0_0_30px_rgba(168,85,247,.15)]">

    <div className="flex items-center gap-3">

      <FaRocket className="text-3xl text-cyan-400"/>

      <h2 className="text-2xl font-black">
        Why We Built GwaliorHub
      </h2>

    </div>

    <p className="mt-4 text-sm leading-6 text-white/70">

      Every day thousands of people search for rooms,
      home tuition, events, offers, jobs,
      bhandaras and businesses.

      <br /><br />

      Unfortunately this information is scattered across
      WhatsApp groups, Facebook posts,
      Instagram stories, Telegram channels and random contacts.

      <br /><br />

      Valuable opportunities often never reach the people
      who actually need them.

      <br /><br />

      GwaliorHub solves this problem by bringing
      everything together in one place.

      Search instantly using smart filters,
      upload your own posts for free,
      and help build a stronger local community.

    </p>

  </div>

</section>

{/* Vision Mission */}

<section className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-4">

  <div
    className="rounded-2xl
    bg-gradient-to-br
    from-cyan-500/15
    to-purple-700/20
    border border-cyan-400/30
    p-6
    hover:shadow-[0_0_40px_rgba(34,211,238,.4)]
    transition"
  >

    <FaBullseye className="text-4xl text-cyan-400"/>

    <h2 className="mt-3 text-2xl font-black">
      Our Vision
    </h2>

    <p className="mt-3 text-sm text-white/70 leading-6">
      To make Gwalior the most digitally connected city
      where students, businesses and citizens can
      easily discover opportunities,
      support each other and grow together.
    </p>

  </div>

  <div
    className="rounded-2xl
    bg-gradient-to-br
    from-pink-500/15
    to-purple-700/20
    border border-pink-400/30
    p-6
    hover:shadow-[0_0_40px_rgba(236,72,153,.4)]
    transition"
  >

    <FaHeart className="text-4xl text-pink-400"/>

    <h2 className="mt-3 text-2xl font-black">
      Our Mission
    </h2>

    <p className="mt-3 text-sm text-white/70 leading-6">
      Build a completely free community platform
      where every citizen can post,
      discover and support local businesses,
      events and opportunities.
    </p>

  </div>

</section>

{/* FEATURES */}

<section className="max-w-6xl mx-auto px-4 py-8">

  <h2
    className="text-center text-3xl font-black
    bg-gradient-to-r
    from-cyan-300
    via-purple-300
    to-pink-400
    bg-clip-text
    text-transparent"
  >
    Everything You Need
  </h2>

  <p className="mt-2 text-center text-sm text-white/60">
    Search smarter. Discover faster. Share freely.
  </p>

  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">

    {features.map((item) => (

      <div
        key={item.title}
        className="rounded-2xl
        bg-gradient-to-br
        from-[#1A1A2C]
        to-[#0D1021]
        border border-purple-500/20
        hover:border-cyan-400
        hover:-translate-y-1
        hover:shadow-[0_0_25px_rgba(59,130,246,.4)]
        transition-all
        p-4"
      >

        <div className="text-3xl">
          {item.icon}
        </div>

        <h3 className="mt-3 text-lg font-bold">
          {item.title}
        </h3>

        <p className="mt-2 text-xs text-white/65 leading-5">
          {item.desc}
        </p>

      </div>

    ))}

  </div>

</section>

{/* FOUNDER */}

<section className="max-w-6xl mx-auto px-4 py-8">

  <div className="rounded-2xl bg-gradient-to-r from-purple-700/20 to-pink-700/20 border border-white/10 p-6">

    <FaHandsHelping className="text-4xl text-yellow-400 mb-4" />

    <h2 className="text-2xl font-bold mb-4">
      A Message from the Founder
    </h2>

    <p className="text-white/75 leading-6 text-sm">

      Dear People of Gwalior,

      <br /><br />

      GwaliorHub is not my platform.

      <br />

      It belongs to every student searching for opportunities,
      every business trying to reach customers,
      every teacher looking for students,
      every NGO helping society,
      every event organizer,
      and every citizen who wants to make Gwalior better.

      <br /><br />

      One post from you could help someone find a job,
      save money through an offer,
      discover an event,
      or even find food during a difficult day.

      <br /><br />

      Let's build a stronger, smarter and more connected Gwalior—
      together.

      <br /><br />

      ❤️ Thank you for believing in this idea.

      <br /><br />

      — Founder,
      <span className="text-purple-300 font-semibold">
        {" "}GwaliorHub
      </span>

    </p>

  </div>

</section>
{/* SUPPORT */}

<section className="max-w-6xl mx-auto px-4 py-8">

  <div className="grid lg:grid-cols-2 gap-5">

    {/* Donation */}

    <div
      className="rounded-2xl
      bg-gradient-to-br
      from-cyan-500/15
      to-blue-600/15
      border border-cyan-400/30
      p-6
      hover:shadow-[0_0_40px_rgba(34,211,238,.35)]
      transition"
    >

      <div className="flex items-center gap-3">

        <FaQrcode className="text-4xl text-cyan-300"/>

        <h2 className="text-2xl font-black">
          Support GwaliorHub
        </h2>

      </div>

      <p className="mt-4 text-sm text-white/70 leading-6">

        GwaliorHub is completely free for everyone.

        <br /><br />

        Your contribution helps us maintain servers,
        improve features and keep this platform
        running without charging local businesses
        or students.

      </p>

      <div className="mt-6 rounded-2xl bg-white p-3 inline-block">

        <img
          src="/donation-qr.jpeg"
          alt="Donation QR"
          className="w-40 h-40 object-contain"
        />

      </div>

      <p className="mt-3 text-xs text-white/50">
        Scan using any UPI App ❤️
      </p>

    </div>

    {/* Building */}

    <div
      className="rounded-2xl
      bg-gradient-to-br
      from-pink-500/15
      to-purple-700/15
      border border-pink-400/30
      p-6
      hover:shadow-[0_0_40px_rgba(236,72,153,.35)]
      transition"
    >

      <h2 className="text-2xl font-black">
        What We're Building
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">

        {[
          "🎉 Events",
          "🏠 Rooms",
          "📚 Education",
          "💼 Jobs",
          "🛍️ Offers",
          "🍲 Bhandara",
          "📢 Ads",
          "🤝 Community",
          "🧱 Gwalior Wall",
          "📍 Smart Filters",
          "⭐ Featured Posts",
          "🔔 Notifications",
        ].map((item) => (

          <div
            key={item}
            className="rounded-xl
            border border-white/10
            bg-white/5
            px-3 py-2
            hover:bg-white/10
            transition"
          >
            {item}
          </div>

        ))}

      </div>

    </div>

  </div>

</section>

{/* JOIN */}

<section className="max-w-6xl mx-auto px-4 py-8">

  <div
    className="rounded-3xl
    bg-gradient-to-r
    from-purple-700
    via-fuchsia-600
    to-cyan-600
    text-center
    p-8
    shadow-[0_0_60px_rgba(168,85,247,.45)]"
  >

    <h2 className="text-3xl md:text-4xl font-black">
      This is Your Platform ❤️
    </h2>

    <p className="mt-4 text-sm md:text-base text-white/90 max-w-3xl mx-auto leading-7">

      Upload your events • Promote your business •
      Share offers • Help your community •
      Find opportunities • Grow together.

    </p>

    <div className="mt-6 text-lg font-bold">

      ❤️ Built by Gwalior • For Gwalior ❤️

    </div>

  </div>

</section>

{/* FOOTER */}

<footer className="border-t border-white/10 mt-10">

  <div className="max-w-6xl mx-auto px-4 py-8">

    <div className="grid md:grid-cols-3 gap-8">

      <div>

        <img
          src="/logo.png"
          className="w-14 rounded-xl shadow-lg"
        />

        <h3 className="mt-3 text-xl font-black">
          GwaliorHub
        </h3>

        <p className="mt-2 text-sm text-white/60 leading-6">
          Connecting Every Corner of Gwalior.
        </p>

      </div>

      <div>

        <h4 className="font-bold text-lg">
          Platform
        </h4>

        <div className="mt-3 space-y-2 text-sm text-white/70">

          <p>🎉 Events</p>
          <p>🛍️ Offers</p>
          <p>🏠 Rooms</p>
          <p>📚 Education</p>
          <p>🍲 Bhandara</p>
          <p>🤝 Community</p>

        </div>

      </div>

      <div>

        <h4 className="font-bold text-lg">
          Contact
        </h4>

        <div className="mt-3 space-y-2 text-sm text-white/70">

          <p>📍 Gwalior, Madhya Pradesh</p>
          <p>🌐 gwaliorhub.vercel.app</p>
          <p>📲insta gwaliorhub1</p>
          <p>📧 gwaliorhub1@gmail.com</p>

        </div>

      </div>

    </div>

    <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-white/50">

      © 2026 GwaliorHub. All Rights Reserved.

    </div>

  </div>
   

</footer>
 </main>
 </DashboardLayout>
  );
}
