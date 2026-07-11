"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

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
  expires_at: string | null;   // DATE column — "YYYY-MM-DD"
  created_at: string;
}

interface Like   { post_id: string; user_id: string; }
interface Report { post_id: string; user_id: string; }

/* ──────────────────────────────────────────────────────────────
   Category / subcategory tree
   ────────────────────────────────────────────────────────────── */

const CATEGORY_TREE: Record<string, { icon: string; subcategories: string[] }> = {
  Events:        { icon: "🎉", subcategories: ["College Event", "Workshop", "Cultural", "Sports", "Religious"] },
  Education:     { icon: "📚", subcategories: ["Coaching", "Home Tuition", "School", "College", "Training"] },
  Property:      { icon: "🏠", subcategories: ["Room", "PG", "Hostel", "Flat", "Mess", "Shop"] },
  Jobs:          { icon: "💼", subcategories: ["Internship", "Full Time", "Part Time", "Freelance"] },
  Offers:        { icon: "🛍️", subcategories: ["Restaurant", "Clothing", "Electronics", "Grocery", "Others"] },
  Community:     { icon: "🤝", subcategories: ["Blood Donation", "NGO", "Lost & Found", "Awareness"] },
  Advertisement: { icon: "📢", subcategories: ["Business Promotion"] },
  Bhandara:      { icon: "🍲", subcategories: [] },
};

const FILTER_TABS = ["All", "Events", "Offers", "Food", "Property", "Education", "Jobs", "Community"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const TAB_TO_CATEGORIES: Record<FilterTab, string[] | null> = {
  All: null, Events: ["Events"], Offers: ["Offers", "Advertisement"],
  Food: ["Bhandara"], Property: ["Property"], Education: ["Education"],
  Jobs: ["Jobs"], Community: ["Community"],
};

const TAB_TO_TREE_KEY: Partial<Record<FilterTab, string>> = {
  Events: "Events", Education: "Education", Property: "Property",
  Jobs: "Jobs", Offers: "Offers", Community: "Community", Food: "Bhandara",
};

const REPORT_REASONS = [
  "Spam or fake post", "Inappropriate content", "Wrong category",
  "Misleading information", "Duplicate post", "Other",
];

const AREAS = [
  "All Areas", "Lashkar", "City Centre", "Morar", "Thatipur",
  "Gole Ka Mandir", "Hazira", "Other",
];

const CATEGORY_ICON: Record<string, string> = {
  Events: "📅", Education: "📚", Property: "🏠", Jobs: "💼",
  Offers: "🛍️", Community: "🤝", Advertisement: "📢", Bhandara: "🍲",
};

const PAGE_SIZE        = 12;
const REPORT_THRESHOLD = 5;

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Client-side expiry guard — catches any rows the DB cron hasn't cleaned yet */
function isExpired(post: Post): boolean {
  if (!post.expires_at) return false;
  return post.expires_at < todayStr();
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)  return "Just now";
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

function expiryLabel(expires_at: string | null): string | null {
  if (!expires_at) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expires_at);
  const diff  = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return null;               // expired — filtered out already
  if (diff === 0) return "Expires today";
  if (diff === 1) return "Expires tomorrow";
  if (diff <= 3)  return `Expires in ${diff}d`;
  return null;                              // far away — don't show
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function ExplorePage() {
  const router = useRouter();

  const [userId,          setUserId]          = useState("");
  const [posts,           setPosts]           = useState<Post[]>([]);
  const [featured,        setFeatured]        = useState<Post[]>([]);
  const [likes,           setLikes]           = useState<Like[]>([]);
  const [reports,         setReports]         = useState<Report[]>([]);

  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab,       setActiveTab]       = useState<FilterTab>("All");
  const [activeSubcat,    setActiveSubcat]    = useState<string | null>(null);
  const [sort,            setSort]            = useState<"newest" | "popular">("newest");
  const [area,            setArea]            = useState("All Areas");

  const [page,            setPage]            = useState(0);
  const [hasMore,         setHasMore]         = useState(true);
  const [loadingInitial,  setLoadingInitial]  = useState(true);
  const [loadingMore,     setLoadingMore]     = useState(false);

  const [reportTargetId,   setReportTargetId]   = useState<string | null>(null);
  const [reportReason,     setReportReason]     = useState(REPORT_REASONS[0]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDoneId,     setReportDoneId]     = useState<string | null>(null);
  const [showLoginModal,   setShowLoginModal]   = useState(false);
  const [lightbox,         setLightbox]         = useState<{ url: string; title: string } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  /* ── Auth ───────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id || ""));
  }, []);

  /* ── Debounce ───────────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Featured rail — also filters expired ────────────────────── */
  useEffect(() => {
    const today = todayStr();
    supabase.from("posts").select("*")
      .eq("status", "approved").eq("featured", true)
      .or(`expires_at.is.null,expires_at.gte.${today}`)   // not expired
      .order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setFeatured((data || []).filter(p => !isExpired(p))));
  }, []);

  /* ── Likes ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) { setLikes([]); return; }
    supabase.from("post_likes").select("post_id,user_id").eq("user_id", userId)
      .then(({ data }) => setLikes(data || []));
  }, [userId]);

  /* ── Reports ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) { setReports([]); return; }
    supabase.from("post_reports").select("post_id,user_id").eq("user_id", userId)
      .then(({ data }) => setReports(data || []));
  }, [userId]);

  /* ── Build query ─────────────────────────────────────────────── */
  const buildQuery = useCallback((pageIndex: number) => {
    const today = todayStr();

    let q = supabase.from("posts").select("*")
      .eq("status", "approved")
      // ── EXPIRY FILTER ──────────────────────────────────────────
      // Include rows where expires_at is NULL (no expiry set)
      // OR where expires_at is today or in the future.
      // Supabase PostgREST: combine two conditions with .or()
      .or(`expires_at.is.null,expires_at.gte.${today}`);

    const cats = TAB_TO_CATEGORIES[activeTab];
    if (cats)                    q = q.in("category", cats);
    if (activeSubcat)            q = q.eq("subcategory", activeSubcat);
    if (area !== "All Areas")    q = q.eq("area", area);
    if (debouncedSearch) {
      q = q.or(
        `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%,venue.ilike.%${debouncedSearch}%`
      );
    }

    q = sort === "popular"
      ? q.order("views",      { ascending: false })
      : q.order("created_at", { ascending: false });

    const from = pageIndex * PAGE_SIZE;
    return q.range(from, from + PAGE_SIZE - 1);
  }, [activeTab, activeSubcat, area, debouncedSearch, sort]);

  /* ── Reset + initial load ────────────────────────────────────── */
  useEffect(() => {
    setLoadingInitial(true); setPosts([]); setPage(0); setHasMore(true);

    buildQuery(0).then(({ data, error }) => {
      if (error) console.error(error.message);
      // Double-check client-side in case cron hasn't run yet
      setPosts((data || []).filter(p => !isExpired(p)));
      setHasMore((data || []).length === PAGE_SIZE);
      setLoadingInitial(false);
    });
  }, [buildQuery]);

  /* ── Load more ───────────────────────────────────────────────── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadingInitial) return;
    setLoadingMore(true);
    const next = page + 1;
    const { data, error } = await buildQuery(next);
    if (error) console.error(error.message);
    setPosts(prev => [...prev, ...(data || []).filter(p => !isExpired(p))]);
    setPage(next); setHasMore((data || []).length === PAGE_SIZE);
    setLoadingMore(false);
  }, [buildQuery, page, hasMore, loadingMore, loadingInitial]);

  /* ── Intersection observer ───────────────────────────────────── */
  useEffect(() => {
    const node = sentinelRef.current; if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: "400px" });
    obs.observe(node); return () => obs.disconnect();
  }, [loadMore]);

  /* ── Tab switch ──────────────────────────────────────────────── */
  function switchTab(tab: FilterTab) { setActiveTab(tab); setActiveSubcat(null); }

  /* ── Like ────────────────────────────────────────────────────── */
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

  /* ── Report ──────────────────────────────────────────────────── */
  function openReportModal(postId: string) {
    if (!userId) { setShowLoginModal(true); return; }
    if (reports.find(r => r.post_id === postId)) {
      setReportDoneId(postId); setTimeout(() => setReportDoneId(null), 2000); return;
    }
    setReportReason(REPORT_REASONS[0]); setReportTargetId(postId);
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
    setReportSubmitting(false); setReportTargetId(null);
    setReportDoneId(reportTargetId); setTimeout(() => setReportDoneId(null), 2500);
  }

  /* ── Open post ───────────────────────────────────────────────── */
  function openPost(post: Post) {
    supabase.from("posts").update({ views: post.views + 1 }).eq("id", post.id).then();
    // ise hatya yhan se thab 404 band hua poster click karne par router.push(`/post/${post.id}`);
  }

  /* ── Subcategory chips ───────────────────────────────────────── */
  const treeKey = TAB_TO_TREE_KEY[activeTab];
  const subcategoryChips: string[] = treeKey ? (CATEGORY_TREE[treeKey]?.subcategories ?? []) : [];

  /* ──────────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      {/* Poster lightbox */}
      {lightbox && (
        <PosterLightbox url={lightbox.url} title={lightbox.title} onClose={() => setLightbox(null)} />
      )}

      <div className="max-w-5xl mx-auto space-y-5 px-4 py-4">

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events, offers, property, jobs..."
            className="w-full rounded-2xl bg-white/[0.04] border border-white/10 pl-12 pr-10 py-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-lg">✕</button>
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
              <button key={sub} onClick={() => setActiveSubcat(prev => prev === sub ? null : sub)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
                  activeSubcat === sub
                    ? "bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-violet-200 border-violet-500/50"
                    : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-violet-500/30 hover:text-violet-300"
                }`}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Sort + Area + clear filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <SelectPill value={sort} onChange={v => setSort(v as "newest" | "popular")}
            options={[{ value: "newest", label: "📅 Newest" }, { value: "popular", label: "🔥 Popular" }]} />
          <SelectPill value={area} onChange={setArea}
            options={AREAS.map(a => ({ value: a, label: `📍 ${a}` }))} />
          {(activeSubcat || area !== "All Areas" || debouncedSearch) && (
            <button onClick={() => { setActiveSubcat(null); setArea("All Areas"); setSearch(""); }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Active filter badges */}
        {(activeSubcat || area !== "All Areas") && (
          <div className="flex gap-2 flex-wrap">
            {activeSubcat && (
              <Badge color="violet" onRemove={() => setActiveSubcat(null)}>{activeSubcat}</Badge>
            )}
            {area !== "All Areas" && (
              <Badge color="sky" onRemove={() => setArea("All Areas")}>📍 {area}</Badge>
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
                  className="shrink-0 w-60 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-purple-500/10 overflow-hidden text-left hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10 transition-all group">
                  <div className="h-32 bg-white/5 relative overflow-hidden">
                    {post.poster_url
                      ? <img src={post.poster_url} alt={post.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">{CATEGORY_ICON[post.category] || "📌"}</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black">⭐ FEATURED</span>
                    {post.poster_url && (
                      <button onClick={e => { e.stopPropagation(); setLightbox({ url: post.poster_url!, title: post.title }); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
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
        {loadingInitial ? <SkeletonGrid /> : (
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
                  onOpen={() => openPost(post)}
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors">Cancel</button>
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
   Poster Lightbox
   ────────────────────────────────────────────────────────────── */

function PosterLightbox({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-lg transition-colors">✕</button>
      <a href={url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-sm transition-colors" title="Download">⬇</a>
      <div className="relative max-w-[92vw] max-h-[90vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <img src={url} alt={title}
          className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none"
          style={{ boxShadow: "0 0 80px rgba(0,0,0,0.8)" }} draggable={false} />
        {title && <p className="text-white/70 text-sm text-center px-4 truncate max-w-full">{title}</p>}
      </div>
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/25 text-xs whitespace-nowrap">Tap outside or press Esc to close</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Card components
   ────────────────────────────────────────────────────────────── */

interface CardProps {
  post: Post; liked: boolean; reported: boolean; reportDone: boolean;
  onLike: () => void; onReport: () => void; onOpen: () => void;
  onPosterClick?: () => void;
}

function CardShell({ onOpen, children }: { onOpen: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onOpen}
      className="rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-all group">
      {children}
    </div>
  );
}

function PosterImage({ post, onPosterClick }: { post: Post; onPosterClick?: () => void }) {
  const expLabel = expiryLabel(post.expires_at);
  supabase.from("posts").update({ views: post.views + 1 }).eq("id", post.id).then();

  return (
    <div className="h-44 bg-white/5 relative overflow-hidden">
      {post.poster_url ? (
        <>
          {/* Full-area click trap — opens lightbox, stops card navigation */}
          <div
            onClick={(e) => { e.stopPropagation(); onPosterClick?.(); }}
            className="absolute inset-0 z-10 cursor-zoom-in"
            title="Tap to view full poster"
          />
          <img src={post.poster_url} alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
            draggable={false} />
          {/* Zoom badge — always visible */}
          <span className="absolute bottom-3 right-3 z-20 pointer-events-none flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            View
          </span>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-600/20 to-pink-600/20">
          {CATEGORY_ICON[post.category] || "📌"}
        </div>
      )}

      {/* Expiry warning badge — top right */}
      {expLabel && (
        <span className="absolute top-2 right-2 z-20 text-[10px] font-bold px-2.5 py-1 rounded-full
          bg-amber-500/90 text-black border border-amber-400/50 backdrop-blur-sm pointer-events-none">
          ⏳ {expLabel}
        </span>
      )}

      {post.is_verified && (
        <span className="absolute top-2 left-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/90 text-white backdrop-blur-sm pointer-events-none">
          ✓ Verified
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1.5 pointer-events-none">
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
          : reported  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 opacity-70 cursor-not-allowed"
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

function EventCard(p: CardProps) {
  return (
    <CardShell onOpen={p.onOpen}>
      <PosterImage post={p.post} onPosterClick={p.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{p.post.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
          {p.post.venue && <span className="truncate max-w-[160px]">📍 {p.post.venue}</span>}
          {p.post.date  && <span>📅 {formatDate(p.post.date)}{p.post.time && ` · ${formatTime(p.post.time)}`}</span>}
        </div>
        {p.post.area && (
          <a href={p.post.google_maps_link || "#"} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 text-xs text-purple-300 hover:text-purple-200 hover:underline transition-colors">
            🗺️ {p.post.area}
          </a>
        )}
        <ActionBar {...p} />
      </div>
    </CardShell>
  );
}

function OfferCard(p: CardProps) {
  return (
    <CardShell onOpen={p.onOpen}>
      <PosterImage post={p.post} onPosterClick={p.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{p.post.title}</p>
        {p.post.description && (
          <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            🏷️ {p.post.description.length > 45 ? `${p.post.description.slice(0, 45)}…` : p.post.description}
          </span>
        )}
        {p.post.area && <p className="mt-2 text-xs text-slate-400">📍 {p.post.area}</p>}
        <ActionBar {...p} />
      </div>
    </CardShell>
  );
}

function PropertyCard(p: CardProps) {
  return (
    <CardShell onOpen={p.onOpen}>
      <PosterImage post={p.post} onPosterClick={p.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{p.post.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
          {p.post.area && <span>📍 {p.post.area}</span>}
          {p.post.subcategory && <span className="text-purple-300">{p.post.subcategory}</span>}
        </div>
        <ActionBar {...p} />
      </div>
    </CardShell>
  );
}

function GenericCard(p: CardProps) {
  return (
    <CardShell onOpen={p.onOpen}>
      <PosterImage post={p.post} onPosterClick={p.onPosterClick} />
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{p.post.title}</p>
        {p.post.description && <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{p.post.description}</p>}
        {p.post.area && <p className="mt-2 text-xs text-slate-400">📍 {p.post.area}</p>}
        <ActionBar {...p} />
      </div>
    </CardShell>
  );
}

/* ── Micro-components ─────────────────────────────────────────── */

function SelectPill({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-xl bg-white/[0.04] border border-white/10 pl-4 pr-9 py-2.5 text-sm text-white outline-none focus:border-purple-500/50 transition-colors cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value} className="bg-[#1a1625]">{o.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">▼</span>
    </div>
  );
}

function Badge({ children, color, onRemove }: {
  children: React.ReactNode; color: "violet" | "sky"; onRemove: () => void;
}) {
  const cls = color === "violet"
    ? "bg-violet-500/15 text-violet-300 border-violet-500/25"
    : "bg-sky-500/15 text-sky-300 border-sky-500/25";
  return (
    <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${cls}`}>
      {children}
      <button onClick={onRemove} className={`${color === "violet" ? "text-violet-400" : "text-sky-400"} hover:text-white`}>✕</button>
    </span>
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