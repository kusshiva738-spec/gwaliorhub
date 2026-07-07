"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "feed",

  description:
    "see ehat happening today in gwalior",
};


/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

interface Post {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  poster_url: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  area: string | null;
  google_maps_link: string | null;
  description: string | null;
  featured: boolean;
  views: number;
  created_at: string;
}

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
}

interface Confession {
  id: string;
  anonymous_name: string | null;
  content: string;
  likes: number;
  created_at: string;
}

interface Stats {
  events: number;
  bhandaras: number;
  properties: number;
  offers: number;
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: "Good Night",      emoji: "🌙" };
  if (h < 12) return { text: "Good Morning",    emoji: "👋" };
  if (h < 17) return { text: "Good Afternoon",  emoji: "☀️" };
  if (h < 18) return { text: "Good Evening",    emoji: "👋" };
  return       { text: "Good Night",             emoji: "🌙" };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const tom = new Date(); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tom.toDateString())   return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

const AVATAR_COLORS = [
  "from-violet-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
];
function avatarGrad(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

async function getWeather() {
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&q=Gwalior`
    );

    const data = await res.json();

    return {
      temp: Math.round(data.current.temp_c),
      condition: data.current.condition.text,
      icon: `https:${data.current.condition.icon}`,
    };
  } catch (error) {
    console.error(error);

    return {
      temp: "--",
      condition: "Unavailable",
      icon: "",
    };
  }
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const g = greeting();
  

  const [stats,           setStats]           = useState<Stats>({ events: 0, bhandaras: 0, properties: 0, offers: 0 });
  const [banners,         setBanners]         = useState<Banner[]>([]);
  const [featuredEvents,  setFeaturedEvents]  = useState<Post[]>([]);
  const [todayEvents,     setTodayEvents]     = useState<Post[]>([]);
  const [todayBhandaras,  setTodayBhandaras]  = useState<Post[]>([]);
  const [hotOffers,       setHotOffers]       = useState<Post[]>([]);
  const [featuredAds,     setFeaturedAds]     = useState<Post[]>([]);
  const [confessions,     setConfessions]     = useState<Confession[]>([]);
  const [todayCount,      setTodayCount]      = useState(0);

  const [bannerIdx,  setBannerIdx]  = useState(0);
  const bannerTimer                 = useRef<ReturnType<typeof setInterval> | null>(null);
  const [search,     setSearch]     = useState("");
  interface Weather {
  temp: number | string;
  condition: string;
  icon: string;
}

const [weather, setWeather] = useState<Weather>({
  temp: "--",
  condition: "Loading...",
  icon: "",
});
  useEffect(() => {
    async function loadWeather() {
      const data = await getWeather();
      setWeather(data);
    }

    loadWeather();
  }, []);


  /* ── Load ───────────────────────────────────────────────────── */
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved").eq("category", "Events"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved").eq("category", "Bhandara"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved").eq("category", "Property"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved").eq("category", "Offers"),
      supabase.from("banners").select("*").eq("active", true).order("display_order"),
      supabase.from("posts").select("*").eq("status", "approved").eq("category", "Events").eq("featured", true).order("created_at", { ascending: false }).limit(6),
      supabase.from("posts").select("*").eq("status", "approved").eq("category", "Events").eq("date", today).order("time", { ascending: true }).limit(5),
      supabase.from("posts").select("*").eq("status", "approved").eq("category", "Bhandara").eq("date", today).order("time", { ascending: true }).limit(4),
      supabase.from("posts").select("*").eq("status", "approved").eq("category", "Offers").order("views", { ascending: false }).limit(6),
      supabase.from("posts").select("*").eq("status", "approved").eq("category", "Advertisement").eq("featured", true).limit(2),
      supabase.from("confessions").select("id,anonymous_name,content,likes,created_at").eq("status", "approved").order("likes", { ascending: false }).limit(6),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved").eq("date", today),
    ]).then(([evR, bhR, propR, offR, banR, featR, todayEvR, bhTodayR, hotOffR, adR, confR, todayCntR]) => {
      setStats({ events: evR.count || 0, bhandaras: bhR.count || 0, properties: propR.count || 0, offers: offR.count || 0 });
      setBanners((banR.data as Banner[]) || []);
      setFeaturedEvents((featR.data as Post[]) || []);
      setTodayEvents((todayEvR.data as Post[]) || []);
      setTodayBhandaras((bhTodayR.data as Post[]) || []);
      setHotOffers((hotOffR.data as Post[]) || []);
      setFeaturedAds((adR.data as Post[]) || []);
      setConfessions((confR.data as Confession[]) || []);
      setTodayCount(todayCntR.count || 0);
    });
  }, []);

  /* ── Banner timer ───────────────────────────────────────────── */
  useEffect(() => {
    if (banners.length < 2) return;
    bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/explore?q=${encodeURIComponent(search.trim())}`);
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      {/* ── HERO — full-bleed, breaks out of layout padding ─────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(480px, 70vh, 680px)" }}>

        {/* Gwalior Fort hero image */}
        <img
          src="https://plain-apac-prod-public.komododecks.com/202607/02/J2J5KmAikuO2oxLfawUZ/image.png"
          alt="Gwalior Fort"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105"
          
          onError={(e) => {
            // Fallback to Wikipedia image
            (e.target as HTMLImageElement).src =
              "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Gwalior_Fort_from_south.jpg/1280px-Gwalior_Fort_from_south.jpg";
          }}
        />

        {/* Rich layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090f]/90 via-[#09090f]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090f]/10 to-transparent" />
        {/* Pink/purple atmospheric glow on left */}
        <div className="absolute -left-20 top-1/3 w-96 h-96 rounded-full bg-pink-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute left-40 bottom-0 w-72 h-72 rounded-full bg-violet-600/15 blur-[60px] pointer-events-none" />
                  {/* Weather card — top right */}
      <div className="absolute top-5 right-5 z-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src={weather.icon}
            alt={weather.condition}
            className="w-12 h-12"
          />

          <div>
            <p className="text-white font-black text-xl leading-none">
              {weather.temp}°C
            </p>

            <p className="text-white/80 text-xs">
              {weather.condition}
            </p>

            <p className="text-white/60 text-[10px] mt-0.5">
              Gwalior
            </p>
          </div>
        </div>
      </div>

              {/* Hero content */}
              <div className="relative z-10 h-full flex flex-col justify-center px-5 sm:px-8 lg:px-14 max-w-3xl">

                {/* Greeting */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-0.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full" />
                  <p className="text-white/80 text-sm font-semibold tracking-wide">
                    {g.text} {g.emoji}
                  </p>
                </div>

                {/* Main headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
                  Discover<br />
                  What's Happening<br />
                  <span className="relative">
                    in{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-fuchsia-400 to-pink-600">
                      Gwalior
                    </span>
                    {/* Underline accent */}
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-transparent rounded-full" />
                  </span>
                </h1>

          <p className="text-white/55 text-sm sm:text-base mt-4 leading-relaxed max-w-sm">
            Events, Bhandaras, Offers, Jobs,<br />
            Home Tutions, Business Ads &amp; More
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-6 max-w-lg">
            <div className="flex items-center gap-3 bg-pink rounded-2xl px-5 py-3.5 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]">
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="yellow" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events, bhandaras, offers, jobs..."
                className="flex-1 bg-transparent text-slate-100 text-sm placeholder:text-slate-400 outline-none font-medium"
              />
              <button type="button" className="shrink-0">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </form>

          {/* Events today floating badge */}
          {todayCount > 0 && (
            <div className="mt-5 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 border border-pink-500/30 backdrop-blur-sm rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-white text-xs font-bold">{todayCount} Events Happening Today</span>
                <Link href="/explore?tab=Events" className="text-pink-400 text-xs hover:text-pink-300 underline ml-1">
                  View all →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PAGE BODY ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10 py-8">

        {/* ── CATEGORY NAV ──────────────────────────────────────── */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {[
            { icon: "🎉", label: "Events",   href: "/explore?tab=Events",    bg: "from-pink-600/30 to-rose-600/30    border-pink-500/30"   },
            { icon: "🍲", label: "Bhandara", href: "/explore?tab=Food",      bg: "from-orange-600/30 to-amber-600/30 border-orange-500/30" },
            { icon: "🛍️", label: "Offers",   href: "/explore?tab=Offers",    bg: "from-emerald-600/30 to-teal-600/30 border-emerald-500/30"},
            { icon: "📢", label: "Ads",      href: "/explore?tab=Offers",    bg: "from-sky-600/30 to-blue-600/30     border-sky-500/30"    },
            { icon: "💼", label: "Jobs",     href: "/explore?tab=Jobs",      bg: "from-violet-600/30 to-purple-600/30 border-violet-500/30"},
            { icon: "🔔", label: "Notices",  href: "/explore?tab=Community", bg: "from-amber-600/30 to-yellow-600/30  border-amber-500/30" },
            { icon: "🧱", label: "Wall",     href: "/wall",                  bg: "from-fuchsia-600/30 to-pink-600/30  border-fuchsia-500/30"},
          ].map(c => (
            <Link key={c.label} href={c.href}
              className={`shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br ${c.bg} border backdrop-blur-sm hover:scale-105 active:scale-95 transition-transform`}>
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs text-white font-semibold whitespace-nowrap">{c.label}</span>
            </Link>
          ))}
        </div>

        {/* ── STATS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "🎉", label: "Events",     value: stats.events,     grad: "from-pink-500 to-rose-600",     shadow: "shadow-pink-500/30",    href: "/explore?tab=Events"    },
            { icon: "🍲", label: "Bhandaras",  value: stats.bhandaras,  grad: "from-orange-500 to-amber-600",  shadow: "shadow-orange-500/30",  href: "/explore?tab=Food"      },
            { icon: "🏠", label: "Properties", value: stats.properties, grad: "from-sky-500 to-blue-600",      shadow: "shadow-sky-500/30",     href: "/explore?tab=Property"  },
            { icon: "🛍️", label: "Offers",     value: stats.offers,     grad: "from-emerald-500 to-teal-600",  shadow: "shadow-emerald-500/30", href: "/explore?tab=Offers"    },
          ].map(s => (
            <Link key={s.label} href={s.href}
              className={`relative rounded-3xl bg-gradient-to-br ${s.grad} p-5 overflow-hidden shadow-2xl ${s.shadow} hover:scale-[1.03] active:scale-[0.98] transition-transform`}>
              {/* Glare */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-2xl" />
              <span className="text-3xl">{s.icon}</span>
              <p className="text-3xl font-black text-white mt-2 leading-none">{s.value}</p>
              <p className="text-white/70 text-xs font-semibold mt-1">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* ── BANNER SLIDER ─────────────────────────────────────── */}
        {banners.length > 0 && (
          <div className="relative w-full aspect-[3/1] rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20">
            {banners.map((b, i) => (
              <div key={b.id}
                className={`absolute inset-0 transition-opacity duration-700 ${i === bannerIdx ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                {b.link_url
                  ? <Link href={b.link_url} className="block h-full"><BannerSlide banner={b} /></Link>
                  : <BannerSlide banner={b} />
                }
              </div>
            ))}
            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {banners.map((_, i) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    className={`rounded-full transition-all duration-300 ${i === bannerIdx ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40"}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TODAY IN GWALIOR ──────────────────────────────────── */}
        {todayEvents.length > 0 && (
          <Section title="🔥 Today in Gwalior" href="/explore?tab=Events" accent="pink">
            <div className="space-y-3">
              {todayEvents.map(post => <TodayCard key={post.id} post={post} />)}
            </div>
          </Section>
        )}

        {/* ── FEATURED EVENTS ───────────────────────────────────── */}
        {featuredEvents.length > 0 && (
          <Section title="🎉 Featured Events" href="/explore?tab=Events" accent="violet">
            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-3 scrollbar-none">
              {featuredEvents.map(post => <FeaturedEventCard key={post.id} post={post} />)}
            </div>
          </Section>
        )}

        {/* ── TODAY'S BHANDARAS ─────────────────────────────────── */}
        {todayBhandaras.length > 0 && (
          <Section title="🍲 Today's Bhandaras" href="/explore?tab=Food" accent="orange">
            <div className="space-y-3">
              {todayBhandaras.map(post => <BhandaraCard key={post.id} post={post} />)}
            </div>
          </Section>
        )}

        {/* ── HOT OFFERS ────────────────────────────────────────── */}
        {hotOffers.length > 0 && (
          <Section title="🛍️ Hot Offers Today" href="/explore?tab=Offers" accent="emerald">
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-3 scrollbar-none">
              {hotOffers.map(post => <OfferCard key={post.id} post={post} />)}
            </div>
          </Section>
        )}

        {/* ── FEATURED ADS ──────────────────────────────────────── */}
        {featuredAds.length > 0 && (
          <Section title="📢 Featured Businesses" href="/explore" accent="sky">
            <div className="space-y-3">
              {featuredAds.map(post => <AdCard key={post.id} post={post} />)}
            </div>
          </Section>
        )}

        {/* ── GWALIOR WALL ──────────────────────────────────────── */}
        {confessions.length > 0 && (
          <Section title="🧱 Gwalior Wall — Trending" href="/wall" accent="fuchsia">
            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-3 scrollbar-none">
              {confessions.map(c => <ConfessionCard key={c.id} confession={c} />)}
            </div>
          </Section>
        )}

        {/* ── EXPLORE GRID ──────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-6">
          <h3 className="text-white font-black text-lg mb-4">🗺️ Explore Gwalior</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { icon: "🎉", label: "Events",     href: "/explore?tab=Events",    grad: "from-pink-500/20 to-rose-500/20    border-pink-500/25"   },
              { icon: "🛍️", label: "Offers",     href: "/explore?tab=Offers",    grad: "from-emerald-500/20 to-teal-500/20 border-emerald-500/25"},
              { icon: "🍲", label: "Food",       href: "/explore?tab=Food",      grad: "from-orange-500/20 to-amber-500/20  border-orange-500/25" },
              { icon: "🏠", label: "Property",   href: "/explore?tab=Property",  grad: "from-sky-500/20 to-blue-500/20     border-sky-500/25"    },
              { icon: "🤝", label: "Community",  href: "/explore?tab=Community", grad: "from-violet-500/20 to-purple-500/20 border-violet-500/25" },
              { icon: "💼", label: "Jobs",       href: "/explore?tab=Jobs",      grad: "from-amber-500/20 to-yellow-500/20  border-amber-500/25"  },
            ].map(c => (
              <Link key={c.label} href={c.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${c.grad} border hover:scale-105 active:scale-95 transition-transform`}>
                <span className="text-3xl">{c.icon}</span>
                <span className="text-xs text-white/80 font-semibold text-center">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   Banner Slide
   ────────────────────────────────────────────────────────────── */

function BannerSlide({ banner }: { banner: Banner }) {
  return (
    <div className="relative w-full h-full">
      <img src={banner.image_url} alt={banner.title || ""} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      {(banner.title || banner.subtitle) && (
        <div className="absolute bottom-8 left-6">
          {banner.title && <p className="text-white font-black text-2xl drop-shadow-xl">{banner.title}</p>}
          {banner.subtitle && <p className="text-white/75 text-sm mt-1">{banner.subtitle}</p>}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Section wrapper
   ────────────────────────────────────────────────────────────── */

const ACCENT_COLORS: Record<string, string> = {
  pink:    "from-pink-500 to-rose-500",
  violet:  "from-violet-500 to-purple-500",
  orange:  "from-orange-500 to-amber-500",
  emerald: "from-emerald-500 to-teal-500",
  sky:     "from-sky-500 to-blue-500",
  fuchsia: "from-fuchsia-500 to-pink-500",
};

function Section({ title, href, accent = "pink", children }: {
  title: string; href: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Accent bar */}
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${ACCENT_COLORS[accent]}`} />
          <h2 className="text-white font-black text-lg">{title}</h2>
        </div>
        <Link href={href}
          className={`text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r ${ACCENT_COLORS[accent]} hover:opacity-80 transition-opacity`}>
          View All →
        </Link>
      </div>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Today Card
   ────────────────────────────────────────────────────────────── */

function TodayCard({ post }: { post: Post }) {
  const live = isToday(post.date);
  return (
    <Link href="explore"
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] hover:border-pink-500/30 transition-all active:scale-[0.98] group">
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 shrink-0 ring-2 ring-white/10 group-hover:ring-pink-500/30 transition-all">
        {post.poster_url
          ? <img src={post.poster_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">{post.category === "Bhandara" ? "🍲" : "🎉"}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{post.title}</p>
        {post.time && <p className="text-slate-400 text-xs mt-0.5">⏰ {formatTime(post.time)}</p>}
        {post.venue && <p className="text-slate-500 text-xs truncate mt-0.5">📍 {post.venue}</p>}
      </div>
      {live && (
        <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      )}
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   Featured Event Card
   ────────────────────────────────────────────────────────────── */

function FeaturedEventCard({ post }: { post: Post }) {
  const daysLeft = post.date
    ? Math.max(0, Math.ceil((new Date(post.date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Link href="explore"
      className="shrink-0 w-56 rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10 transition-all active:scale-[0.97] group">
      <div className="relative h-36 bg-white/5 overflow-hidden">
        {post.poster_url
          ? <img src={post.poster_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-violet-600/20 to-pink-600/20">🎉</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {daysLeft !== null && (
          <span className="absolute top-2 left-2 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-400 text-black shadow-lg">
            {daysLeft === 0 ? "🔴 Today" : `${daysLeft}d Left`}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-white font-bold text-sm truncate">{post.title}</p>
        <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
          {post.date && <span>{formatDate(post.date)}</span>}
          {post.time && <><span className="w-0.5 h-0.5 rounded-full bg-slate-600" /><span>{formatTime(post.time)}</span></>}
        </p>
        {post.venue && <p className="text-slate-600 text-xs mt-0.5 truncate">📍 {post.venue}</p>}
        {post.subcategory && (
          <span className="inline-block mt-2 text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
            {post.subcategory}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   Bhandara Card
   ────────────────────────────────────────────────────────────── */

function BhandaraCard({ post }: { post: Post }) {
  return (
    <Link href="/explore"
      className="flex items-center gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/[0.08] to-amber-500/[0.06] p-4 hover:border-orange-500/50 transition-all active:scale-[0.98]">
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 ring-2 ring-orange-500/20 shrink-0">
        {post.poster_url
          ? <img src={post.poster_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl bg-orange-500/10">🍲</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{post.title}</p>
        {post.venue && <p className="text-slate-400 text-xs mt-0.5 truncate">📍 {post.venue}</p>}
        {post.time && <p className="text-orange-300/70 text-xs">⏰ {formatTime(post.time)}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
        {post.google_maps_link && (
          <a href={post.google_maps_link} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline">
            📍 Directions
          </a>
        )}
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   Offer Card
   ────────────────────────────────────────────────────────────── */

function OfferCard({ post }: { post: Post }) {
  return (
    <Link href="/explore"
      className="shrink-0 w-44 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.06] overflow-hidden hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all active:scale-[0.97] group">
      <div className="h-28 bg-white/5 relative overflow-hidden">
        {post.poster_url
          ? <img src={post.poster_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-3xl bg-emerald-500/10">🛍️</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white shadow-lg">
          HOT 🔥
        </span>
      </div>
      <div className="p-3">
        <p className="text-white font-bold text-xs truncate">{post.title}</p>
        {post.description && (
          <p className="text-emerald-400 text-[10px] font-bold mt-1 truncate">{post.description.slice(0, 32)}</p>
        )}
        {post.area && <p className="text-slate-500 text-[10px] mt-0.5 truncate">📍 {post.area}</p>}
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   Ad Card
   ────────────────────────────────────────────────────────────── */

function AdCard({ post }: { post: Post }) {
  return (
    <Link href="/explore"
      className="flex items-center gap-4 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/[0.08] to-indigo-500/[0.06] p-4 hover:border-sky-500/50 transition-all active:scale-[0.98]">
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 ring-2 ring-sky-500/20 shrink-0">
        {post.poster_url
          ? <img src={post.poster_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl bg-sky-500/10">📢</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">✦ Sponsored</span>
        <p className="text-white font-bold text-sm truncate mt-0.5">{post.title}</p>
        {post.description && (
          <p className="text-slate-400 text-xs mt-0.5 truncate">{post.description}</p>
        )}
      </div>
      <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
        View →
      </span>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   Confession Card
   ────────────────────────────────────────────────────────────── */

function ConfessionCard({ confession }: { confession: Confession }) {
  const name = confession.anonymous_name || "Anonymous";
  const grad = avatarGrad(confession.id);
  return (
    <Link href="/confession"
      className="shrink-0 w-64 rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.06] to-pink-500/[0.04] p-4 hover:border-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-500/10 transition-all active:scale-[0.97]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-black text-white shrink-0 ring-2 ring-white/10`}>
          {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold truncate">{name}</p>
          <p className="text-slate-500 text-[10px]">{timeAgo(confession.created_at)}</p>
        </div>
        <span className="ml-auto text-fuchsia-400">···</span>
      </div>
      <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{confession.content}</p>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500 border-t border-white/5 pt-3">
        <span className="flex items-center gap-1 text-pink-400 font-semibold">❤️ {confession.likes}</span>
        <span className="ml-auto text-fuchsia-400 font-semibold"></span>
      </div>
    </Link>
  );
}