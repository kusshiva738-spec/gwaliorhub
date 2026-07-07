"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore",

  description:
    "see what peoples exploring",
};
interface Post {
  id: string;
  user_id: string | null;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  poster_url: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  area: string | null;
  google_maps_link: string | null;
  contact: string | null;
  featured: boolean;
  status: string;
  views: number;
  report_count: number;
  is_verified: boolean;
  created_at: string;
}

interface Like   { post_id: string; user_id: string; }
interface Report { post_id: string; user_id: string; }

const CATEGORY_TREE: Record<string, { icon: string; subcategories: string[] }> = {
  Events:        { icon: "🎉", subcategories: ["College Event", "Workshop", "Cultural", "Sports", "Religious"] },
  Education:     { icon: "📚", subcategories: ["Coaching", "Home Tuition", "School", "College", "Training"] },
  Property:      { icon: "🏠", subcategories: ["Room", "PG", "Hostel", "Flat","Mess", "Shop"] },
  Jobs:          { icon: "💼", subcategories: ["Internship", "Full Time", "Part Time", "Freelance"] },
  Offers:        { icon: "🛍️", subcategories: ["Restaurant", "Clothing", "Electronics", "Grocery", "others"] },
  Community:     { icon: "🤝", subcategories: ["Blood Donation", "NGO", "Lost & Found", "Awareness"] },
  Advertisement: { icon: "📢", subcategories: ["Business Promotion"] },
  Bhandara:      { icon: "🍲", subcategories: [] },
};

const FILTER_TABS = ["All", "Events", "Offers", "Bhandara", "Property", "Education", "Jobs", "Community"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const TAB_TO_CATEGORIES: Record<FilterTab, string[] | null> = {
  All: null, Events: ["Events"], Offers: ["Offers", "Advertisement"],
  Bhandara: ["Bhandara"], Property: ["Property"], Education: ["Education"],
  Jobs: ["Jobs"], Community: ["Community"],
};

const TAB_TO_TREE_KEY: Partial<Record<FilterTab, string>> = {
  Events: "Events", Education: "Education", Property: "Property",
  Jobs: "Jobs", Offers: "Offers", Community: "Community", Bhandara: "Bhandara",
};

const REPORT_REASONS = [
  "Spam or fake post", "Inappropriate content", "Wrong category",
  "Misleading information", "Duplicate post", "Other",
];

const AREAS = [
  "All Areas", "Lashkar", "City Centre", "Morar", "Thatipur",
  "Gole Ka Mandir", "Hazira", "Other",
];

const PAGE_SIZE = 12;
const REPORT_THRESHOLD = 5;

const CATEGORY_ICON: Record<string, string> = {
  Events: "📅", Education: "📚", Property: "🏠", Jobs: "💼",
  Offers: "🛍️", Community: "🤝", Advertisement: "📢", Bhandara: "🍲",
};

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

/* ──────────────────────────────────────────────────────────────
   Poster Lightbox — full-screen image viewer
   ────────────────────────────────────────────────────────────── */

interface LightboxProps {
  url: string;
  title: string;
  onClose: () => void;
}

function PosterLightbox({ url, title, onClose }: LightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-lg transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Download button */}
      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-base transition-colors"
        aria-label="Download"
        title="Download image"
      >
        ⬇
      </a>

      {/* Image — stop click from bubbling to backdrop */}
      <div
        className="relative max-w-[92vw] max-h-[90vh] flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none"
          style={{ boxShadow: "0 0 80px rgba(0,0,0,0.8)" }}
          draggable={false}
        />
        {/* Caption */}
        {title && (
          <p className="text-white/70 text-sm text-center px-4 truncate max-w-full">
            {title}
          </p>
        )}
      </div>

      {/* Tap hint at bottom */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/25 text-xs">
        Tap outside or press Esc to close
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function ExplorePage() {
  const router = useRouter();

  const [userId,    setUserId]    = useState("");
  const [posts,     setPosts]     = useState<Post[]>([]);
  const [featured,  setFeatured]  = useState<Post[]>([]);
  const [likes,     setLikes]     = useState<Like[]>([]);
  const [reports,   setReports]   = useState<Report[]>([]);

  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab,       setActiveTab]       = useState<FilterTab>("All");
  const [activeSubcat,    setActiveSubcat]     = useState<string | null>(null);
  const [sort,            setSort]             = useState<"newest" | "popular">("newest");
  const [area,            setArea]             = useState("All Areas");

  const [page,           setPage]           = useState(0);
  const [hasMore,        setHasMore]        = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);

  const [reportTargetId,   setReportTargetId]   = useState<string | null>(null);
  const [reportReason,     setReportReason]     = useState(REPORT_REASONS[0]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDoneId,     setReportDoneId]     = useState<string | null>(null);
  const [showLoginModal,   setShowLoginModal]   = useState(false);

  // ── Lightbox state ────────────────────────────────────────────
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id || ""));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    supabase.from("posts").select("*")
      .eq("status", "approved").eq("featured", true)
      .order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setFeatured(data || []));
  }, []);

  useEffect(() => {
    if (!userId) { setLikes([]); return; }
    supabase.from("post_likes").select("post_id,user_id").eq("user_id", userId)
      .then(({ data }) => setLikes(data || []));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setReports([]); return; }
    supabase.from("post_reports").select("post_id,user_id").eq("user_id", userId)
      .then(({ data }) => setReports(data || []));
  }, [userId]);

  const buildQuery = useCallback((pageIndex: number) => {
    let q = supabase.from("posts").select("*").eq("status", "approved");
    const cats = TAB_TO_CATEGORIES[activeTab];
    if (cats) q = q.in("category", cats);
    if (activeSubcat) q = q.eq("subcategory", activeSubcat);
    if (area !== "All Areas") q = q.eq("area", area);
    if (debouncedSearch) {
      q = q.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%,venue.ilike.%${debouncedSearch}%`);
    }
    q = sort === "popular"
      ? q.order("views", { ascending: false })
      : q.order("created_at", { ascending: false });
    const from = pageIndex * PAGE_SIZE;
    return q.range(from, from + PAGE_SIZE - 1);
  }, [activeTab, activeSubcat, area, debouncedSearch, sort]);

  useEffect(() => {
    setLoadingInitial(true);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    buildQuery(0).then(({ data, error }) => {
      if (error) console.error(error.message);
      setPosts(data || []);
      setHasMore((data || []).length === PAGE_SIZE);
      setLoadingInitial(false);
    });
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadingInitial) return;
    setLoadingMore(true);
    const next = page + 1;
    const { data, error } = await buildQuery(next);
    if (error) console.error(error.message);
    setPosts(prev => [...prev, ...(data || [])]);
    setPage(next);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoadingMore(false);
  }, [buildQuery, page, hasMore, loadingMore, loadingInitial]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) loadMore(); },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore]);

  function switchTab(tab: FilterTab) {
    setActiveTab(tab);
    setActiveSubcat(null);
  }

  function toggleSubcat(sub: string) {
    setActiveSubcat(prev => (prev === sub ? null : sub));
  }

  async function toggleLike(postId: string) {
    if (!userId) { setShowLoginModal(true); return; }
    const already = likes.find(l => l.post_id === postId);
    if (already) {
      setLikes(prev => prev.filter(l => l.post_id !== postId));
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
      if (error) setLikes(prev => [...prev, { post_id: postId, user_id: userId }]);
    } else {
      setLikes(prev => [...prev, { post_id: postId, user_id: userId }]);
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      if (error) setLikes(prev => prev.filter(l => l.post_id !== postId));
    }
  }

  function openReportModal(postId: string) {
    if (!userId) { setShowLoginModal(true); return; }
    if (reports.find(r => r.post_id === postId)) {
      setReportDoneId(postId);
      setTimeout(() => setReportDoneId(null), 2000);
      return;
    }
    setReportReason(REPORT_REASONS[0]);
    setReportTargetId(postId);
  }

  async function submitReport() {
    if (!reportTargetId || !userId || reportSubmitting) return;
    setReportSubmitting(true);
    setReports(prev => [...prev, { post_id: reportTargetId, user_id: userId }]);
    const { error } = await supabase.from("post_reports")
      .insert({ post_id: reportTargetId, user_id: userId, reason: reportReason });
    if (error) {
      setReports(prev => prev.filter(r => r.post_id !== reportTargetId));
      if (!error.message.includes("unique")) { alert(error.message); setReportSubmitting(false); return; }
    }
    setPosts(prev =>
      prev.map(p => p.id === reportTargetId ? { ...p, report_count: p.report_count + 1 } : p)
          .filter(p => p.id !== reportTargetId || p.report_count < REPORT_THRESHOLD)
    );
    setReportSubmitting(false);
    setReportTargetId(null);
    setReportDoneId(reportTargetId);
    setTimeout(() => setReportDoneId(null), 2500);
  }

  function openPost(post: Post) {
    supabase.from("posts").update({ views: post.views + 1 }).eq("id", post.id).then();
    router.push(`/post/${post.id}`);
  }

  const treeKey = TAB_TO_TREE_KEY[activeTab];
  const subcategoryChips: string[] = treeKey ? (CATEGORY_TREE[treeKey]?.subcategories ?? []) : [];

  return (
    <DashboardLayout>
      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {lightbox && (
        <PosterLightbox
          url={lightbox.url}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-5 px-4 py-4">

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, offers, property, jobs..."
            className="w-full rounded-2xl bg-white/[0.04] border border-white/10 pl-12 pr-4 py-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-lg">
              ✕
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {FILTER_TABS.map(tab => (
            <button key={tab} onClick={() => switchTab(tab)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                activeTab === tab
                  ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white border-transparent shadow-lg shadow-pink-500/20"
                  : "bg-white/[0.04] text-slate-400 border-white/10 hover:border-white/20"
              }`}>
              {CATEGORY_TREE[TAB_TO_TREE_KEY[tab] ?? ""]?.icon ?? ""} {tab}
            </button>
          ))}
        </div>

        {/* Subcategory chips */}
        {subcategoryChips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            <button onClick={() => setActiveSubcat(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeSubcat === null
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-white/[0.03] text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300"
              }`}>
              All
            </button>
            {subcategoryChips.map(sub => (
              <button key={sub} onClick={() => toggleSubcat(sub)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
                  activeSubcat === sub
                    ? "bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-violet-200 border-violet-500/50 shadow-sm shadow-violet-500/20"
                    : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-violet-500/30 hover:text-violet-300"
                }`}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Sort + Area */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <select value={sort} onChange={e => setSort(e.target.value as "newest" | "popular")}
              className="appearance-none rounded-xl bg-white/[0.04] border border-white/10 pl-4 pr-9 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-colors cursor-pointer">
              <option value="newest" className="bg-[#1a1625]">📅 Newest</option>
              <option value="popular" className="bg-[#1a1625]">🔥 Popular</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">▼</span>
          </div>
          <div className="relative">
            <select value={area} onChange={e => setArea(e.target.value)}
              className="appearance-none rounded-xl bg-white/[0.04] border border-white/10 pl-4 pr-9 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-colors cursor-pointer">
              {AREAS.map(a => (
                <option key={a} value={a} className="bg-[#1a1625]">📍 {a}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">▼</span>
          </div>
          {(activeSubcat || area !== "All Areas" || debouncedSearch) && (
            <button
              onClick={() => { setActiveSubcat(null); setArea("All Areas"); setSearch(""); }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Active filter badges */}
        {(activeSubcat || area !== "All Areas") && (
          <div className="flex gap-2 flex-wrap">
            {activeSubcat && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-semibold">
                {activeSubcat}
                <button onClick={() => setActiveSubcat(null)} className="text-violet-400 hover:text-white">✕</button>
              </span>
            )}
            {area !== "All Areas" && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25 font-semibold">
                📍 {area}
                <button onClick={() => setArea("All Areas")} className="text-sky-400 hover:text-white">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Featured rail */}
        {featured.length > 0 && activeTab === "All" && !debouncedSearch && !activeSubcat && (
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">🔥 Featured Posts</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {featured.map(post => (
                <button key={post.id} onClick={() => openPost(post)}
                  className="shrink-0 w-60 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-purple-500/10 overflow-hidden text-left hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10 transition-all">
                  <div className="h-32 bg-white/5 relative overflow-hidden group">
                    {post.poster_url
                      ? <img src={post.poster_url} alt={post.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">{CATEGORY_ICON[post.category] || "📌"}</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black">⭐ FEATURED</span>
                    {/* Poster zoom hint */}
                    {post.poster_url && (
                      <button
                        onClick={e => { e.stopPropagation(); setLightbox({ url: post.poster_url!, title: post.title }); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        title="View poster"
                      >
                        🔍
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm truncate">{post.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{post.area || post.venue || post.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results count */}
        {!loadingInitial && (
          <p className="text-xs text-slate-500">
            {posts.length > 0
              ? `Showing ${posts.length}${hasMore ? "+" : ""} posts${activeSubcat ? ` in "${activeSubcat}"` : ""}`
              : "No results"}
          </p>
        )}

        {/* Grid */}
        {loadingInitial ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={likes.some(l => l.post_id === post.id)}
                  reported={reports.some(r => r.post_id === post.id)}
                  reportDone={reportDoneId === post.id}
                  onLike={() => toggleLike(post.id)}
                  onReport={() => openReportModal(post.id)}
                  onOpen={() => post.description}
                  onPosterClick={post.poster_url
                    ? () => setLightbox({ url: post.poster_url!, title: post.title })
                    : undefined}
                />
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-5xl mb-3">🗺️</p>
                <p className="font-medium">No posts found</p>
                <p className="text-xs mt-1">
                  {activeSubcat ? `No "${activeSubcat}" posts yet` : "Try a different filter or search term"}
                </p>
                {activeSubcat && (
                  <button onClick={() => setActiveSubcat(null)}
                    className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline">
                    Clear subcategory filter
                  </button>
                )}
              </div>
            )}

            <div ref={sentinelRef} className="h-10" />

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }} />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-slate-600 text-xs py-6">You've seen everything 🎉</p>
            )}
          </>
        )}
      </div>

      {/* Report modal */}
      {reportTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setReportTargetId(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-lg">🚩</div>
              <div>
                <h3 className="text-white font-semibold">Report Post</h3>
                <p className="text-slate-400 text-xs">Help us keep GwaliorHub clean</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {REPORT_REASONS.map(r => (
                <label key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                    reportReason === r ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}>
                  <input type="radio" name="report-reason" value={r} checked={reportReason === r}
                    onChange={() => setReportReason(r)} className="accent-amber-500" />
                  <span className="text-sm text-slate-300">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReportTargetId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors">
                Cancel
              </button>
              <button onClick={submitReport} disabled={reportSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {reportSubmitting ? "Reporting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowLoginModal(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl mb-4">🔒</div>
            <h3 className="text-white font-semibold text-lg">Login required</h3>
            <p className="text-slate-400 text-sm mt-2">Please log in to like or report posts.</p>
            <div className="flex flex-col gap-2 mt-5">
              <button onClick={() => router.push("/login")}
                className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                Go to Login
              </button>
              <button onClick={() => setShowLoginModal(false)}
                className="w-full px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   Card components
   ────────────────────────────────────────────────────────────── */

interface CardProps {
  post: Post; liked: boolean; reported: boolean; reportDone: boolean;
  onLike: () => void; onReport: () => void; onOpen: () => void;
  onPosterClick?: () => void; // undefined = no poster, so no zoom icon
}

function CardShell({ onOpen, children }: { onOpen: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onOpen}
      className="rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-all group">
      {children}
    </div>
  );
}

/* ── PosterImage — now has a clickable zoom overlay ── */
function PosterImage({ post, onPosterClick }: { post: Post; onPosterClick?: () => void }) {
  return (
    <div className="h-44 bg-white/5 relative overflow-hidden">
      {post.poster_url ? (
        <img
          src={post.poster_url}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-600/20 to-pink-600/20">
          {CATEGORY_ICON[post.category] || "📌"}
        </div>
      )}

      {/* Darkening hover overlay */}
      {post.poster_url && onPosterClick && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
      )}

      {/* ── Zoom / View poster button ── */}
      {post.poster_url && onPosterClick && (
        <button
          onClick={e => {
            e.stopPropagation(); // don't navigate to post detail
            onPosterClick();
          }}
          className="
            absolute inset-0 flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          "
          aria-label="View full poster"
          title="View full poster"
        >
          <span className="
            flex items-center gap-2
            bg-black/60 backdrop-blur-sm
            text-white text-xs font-semibold
            px-4 py-2 rounded-full
            border border-white/20
            shadow-lg
            hover:bg-black/80 transition-colors
          ">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            View Poster
          </span>
        </button>
      )}

      {/* Badges row */}
      {post.is_verified && (
        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/90 text-white backdrop-blur-sm">
          ✓ Verified
        </span>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
          {CATEGORY_ICON[post.category] || "📌"} {post.category}
        </span>
        {post.subcategory && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/60 text-white backdrop-blur-sm">
            {post.subcategory}
          </span>
        )}
      </div>
    </div>
  );
}

function ActionBar({ post, liked, reported, reportDone, onLike, onReport }:
  Pick<CardProps, "post" | "liked" | "reported" | "reportDone" | "onLike" | "onReport">) {
  return (
    <div className="flex items-center gap-2 mt-3">
      <button onClick={e => { e.stopPropagation(); onLike(); }}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
          liked ? "bg-pink-500/15 text-pink-300 border-pink-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
        }`}>
        <span className={liked ? "scale-125" : "scale-100"}>{liked ? "❤️" : "🤍"}</span>
      </button>
      <span className="flex items-center gap-1 text-xs text-slate-500">👁 {post.views}</span>
      <span className="ml-auto text-xs text-slate-600">{timeAgo(post.created_at)}</span>
      <button onClick={e => { e.stopPropagation(); onReport(); }}
        title={reported ? "Already reported" : "Report post"}
        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
          reportDone ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : reported ? "bg-amber-500/10 text-amber-400 border-amber-500/20 opacity-70 cursor-not-allowed"
          : "bg-white/5 text-slate-500 border-white/10 hover:text-amber-400 hover:border-amber-400/30"
        }`}>
        {reportDone ? "✓ Reported" : reported ? "🚩 Reported" : "🚩"}
      </button>
    </div>
  );
}

function PostCard(props: CardProps) {
  const { post } = props;
  if (post.category === "Events" || post.category === "Bhandara") return <EventCard {...props} />;
  if (post.category === "Offers") return <OfferCard {...props} />;
  if (post.category === "Property") return <PropertyCard {...props} />;
  return <GenericCard {...props} />;
}

function EventCard(props: CardProps) {
  const { post } = props;
  return (
    <CardShell onOpen={props.onOpen}>
      <PosterImage post={post} onPosterClick={props.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
          {post.venue && <span className="truncate max-w-[160px]">📍 {post.venue}</span>}
          {post.date  && <span>📅 {formatDate(post.date)}{post.time && ` · ${formatTime(post.time)}`}</span>}
        </div>
        {post.area && (
          <a href={post.google_maps_link || "#"} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 text-xs text-purple-300 hover:text-purple-200 hover:underline transition-colors">
            🗺️ {post.area}
          </a>
        )}
        <ActionBar {...props} />
      </div>
    </CardShell>
  );
}

function OfferCard(props: CardProps) {
  const { post } = props;
  return (
    <CardShell onOpen={props.onOpen}>
      <PosterImage post={post} onPosterClick={props.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title}</p>
        {post.description && (
          <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            🏷️ {post.description.length > 45 ? `${post.description.slice(0, 45)}…` : post.description}
          </span>
        )}
        {post.area && <p className="mt-2 text-xs text-slate-400">📍 {post.area}</p>}
        <ActionBar {...props} />
      </div>
    </CardShell>
  );
}

function PropertyCard(props: CardProps) {
  const { post } = props;
  return (
    <CardShell onOpen={props.onOpen}>
      <PosterImage post={post} onPosterClick={props.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
          {post.area && <span>📍 {post.area}</span>}
          {post.subcategory && <span className="text-purple-300">{post.subcategory}</span>}
        </div>
        <ActionBar {...props} />
      </div>
    </CardShell>
  );
}

function GenericCard(props: CardProps) {
  const { post } = props;
  return (
    <CardShell onOpen={props.onOpen}>
      <PosterImage post={post} onPosterClick={props.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{post.title}</p>
        {post.description && <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{post.description}</p>}
        {post.area && <p className="mt-2 text-xs text-slate-400">📍 {post.area}</p>}
        <ActionBar {...props} />
      </div>
    </CardShell>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden animate-pulse">
          <div className="h-44 bg-white/5" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
