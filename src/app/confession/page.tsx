"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";

/* ──────────────────────────────────────────────────────────────
   Types — match the `confessions` schema exactly
   ────────────────────────────────────────────────────────────── */

interface Confession {
  id: string;
  user_id: string;
  anonymous: boolean;
  anonymous_name: string | null;
  category: string | null;
  content: string;
  likes: number;
  reports_count: number;
  status: "pending" | "approved" | "hidden" | "deleted";
  created_at: string;
}

interface Comment {
  id: string;
  confession_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Like {
  id?: string;
  confession_id: string;
  user_id: string;
}

interface Report {
  confession_id: string;
  user_id: string;
}

const CATEGORIES = ["General", "Confession", "Funny", "Help", "Love", "Campus Life"];
const REPORT_THRESHOLD = 5;
const ANIMALS = ["Tiger", "Falcon", "Panda", "Wolf", "Fox", "Owl", "Lion", "Hawk"];

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-rose-500",
  "from-sky-500 to-indigo-500",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function randomAnonName() {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `Anonymous ${animal}`;
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function WallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [filter, setFilter] = useState<"latest" | "popular">("latest");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    loadWall();

    const channel = supabase
      .channel("confessions-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (payload) => {
        const row = payload.new as Confession;
        if (row.status !== "approved") return;
        setConfessions((prev) => (prev.find((c) => c.id === row.id) ? prev : [row, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "confessions" }, (payload) => {
        const row = payload.new as Confession;
        setConfessions((prev) => {
          if (row.status !== "approved") return prev.filter((c) => c.id !== row.id);
          return prev.map((c) => (c.id === row.id ? row : c));
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "confessions" }, (payload) => {
        setConfessions((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confession_likes" }, (payload) => {
        const row = payload.new as Like;
        setLikes((prev) =>
          prev.find((l) => l.confession_id === row.confession_id && l.user_id === row.user_id) ? prev : [...prev, row]
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "confession_likes" }, (payload) => {
        setLikes((prev) =>
          prev.filter((l) => !(l.confession_id === payload.old.confession_id && l.user_id === payload.old.user_id))
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confession_comments" }, (payload) => {
        const row = payload.new as Comment;
        setComments((prev) => (prev.find((c) => c.id === row.id) ? prev : [...prev, row]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "confession_comments" }, (payload) => {
        setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadWall() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      setIsLoggedIn(true);
    } else {
      setUserId("");
      setIsLoggedIn(false);
    }

    const [confessionsRes, likesRes, commentsRes, reportsRes] = await Promise.all([
      supabase.from("confessions").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("confession_likes").select("*"),
      supabase.from("confession_comments").select("*").order("created_at", { ascending: true }),
      supabase.from("confession_reports").select("confession_id,user_id"),
    ]);

    if (confessionsRes.error) console.error("confessions load error:", confessionsRes.error.message);
    if (likesRes.error) console.error("confession_likes load error:", likesRes.error.message);
    if (commentsRes.error) console.error("confession_comments load error:", commentsRes.error.message);
    if (reportsRes.error) console.error("confession_reports load error:", reportsRes.error.message);

    setConfessions(confessionsRes.data || []);
    setLikes(likesRes.data || []);
    setComments(commentsRes.data || []);
    setReports(reportsRes.data || []);
    setLoading(false);
  }

  /* ── Auth guard ─────────────────────────────────────────────── */

  function requireAuth(): boolean {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }

  /* ── Create post ───────────────────────────────────────────── */

  async function createPost() {
    if (!requireAuth()) return;
    if (!newPost.trim() || posting) return;
    const cleaned = newPost.replace(/<[^>]*>?/gm, "").trim();
    if (!cleaned) return;
    if (cleaned.length > 1000) {
      alert("Maximum 1000 characters");
      return;
    }

    const anonName = isAnonymous ? randomAnonName() : null;
    const tempId = `temp-${Date.now()}`;
    const tempPost: Confession = {
      id: tempId,
      user_id: userId,
      anonymous: isAnonymous,
      anonymous_name: anonName,
      category,
      content: cleaned,
      likes: 0,
      reports_count: 0,
      status: "approved",
      created_at: new Date().toISOString(),
    };
    setConfessions((prev) => [tempPost, ...prev]);
    setNewPost("");
    setPosting(true);

    const { data, error } = await supabase
      .from("confessions")
      .insert({
        user_id: userId,
        anonymous: isAnonymous,
        anonymous_name: anonName,
        category,
        content: cleaned,
      })
      .select()
      .single();

    if (error) {
      setConfessions((prev) => prev.filter((c) => c.id !== tempId));
      alert(error.message);
    } else {
      setConfessions((prev) => prev.map((c) => (c.id === tempId ? data : c)));
    }
    setPosting(false);
  }

  async function deletePost(id: string) {
    const post = confessions.find((c) => c.id === id);
    if (!post || post.user_id !== userId) return;
    if (!confirm("Delete this post?")) return;

    setConfessions((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("confessions").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      alert(error.message);
      loadWall();
    }
  }

  /* ── Likes ──────────────────────────────────────────────────── */

  async function toggleLike(id: string) {
    if (!requireAuth()) return;
    const already = likes.find((l) => l.confession_id === id && l.user_id === userId);

    if (already) {
      setLikes((prev) => prev.filter((l) => !(l.confession_id === id && l.user_id === userId)));
      setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, likes: Math.max(c.likes - 1, 0) } : c)));
      const { error } = await supabase.from("confession_likes").delete().eq("confession_id", id).eq("user_id", userId);
      if (error) {
        setLikes((prev) => [...prev, { confession_id: id, user_id: userId }]);
        setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
      }
    } else {
      setLikes((prev) => [...prev, { confession_id: id, user_id: userId }]);
      setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
      const { error } = await supabase.from("confession_likes").insert({ confession_id: id, user_id: userId });
      if (error) {
        setLikes((prev) => prev.filter((l) => !(l.confession_id === id && l.user_id === userId)));
        setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, likes: Math.max(c.likes - 1, 0) } : c)));
      }
    }
    // Note: confessions.likes is also kept in sync server-side by a trigger on
    // confession_likes (see confessions-missing-tables.sql), so the realtime
    // UPDATE event will reconcile this if the optimistic count ever drifts.
  }

  /* ── Reports ────────────────────────────────────────────────── */

  async function reportPost(id: string) {
    if (!requireAuth()) return;
    if (reports.find((r) => r.confession_id === id && r.user_id === userId)) {
      alert("You've already reported this post.");
      return;
    }

    setReports((prev) => [...prev, { confession_id: id, user_id: userId }]);

    const { error } = await supabase.from("confession_reports").insert({ confession_id: id, user_id: userId });

    if (error) {
      setReports((prev) => prev.filter((r) => !(r.confession_id === id && r.user_id === userId)));
      alert(error.message);
      return;
    }

    // The DB trigger increments reports_count and flips status to 'hidden' at 5;
    // the realtime UPDATE/DELETE event will remove it from the feed automatically.
    alert("Reported successfully");
  }

  /* ── Comments ───────────────────────────────────────────────── */

  async function addComment(confessionId: string) {
    if (!requireAuth()) return;
    const content = commentDraft.trim();
    if (!content) return;
    const cleaned = content.replace(/<[^>]*>?/gm, "").trim();
    if (!cleaned) return;
    if (cleaned.length > 500) {
      alert("Comment must be under 500 characters");
      return;
    }

    const tempId = `temp-comment-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      confession_id: confessionId,
      user_id: userId,
      content: cleaned,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, tempComment]);
    setCommentDraft("");

    const { data, error } = await supabase
      .from("confession_comments")
      .insert({ confession_id: confessionId, user_id: userId, content: cleaned })
      .select()
      .single();

    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert(error.message);
    } else {
      setComments((prev) => prev.map((c) => (c.id === tempId ? data : c)));
    }
  }

  async function deleteComment(commentId: string) {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || comment.user_id !== userId) return;

    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await supabase.from("confession_comments").delete().eq("id", commentId).eq("user_id", userId);
    if (error) {
      alert(error.message);
      loadWall();
    }
  }

  /* ── Derived data ───────────────────────────────────────────── */

  const sortedPosts = [...confessions].sort((a, b) => {
    if (filter === "popular" && b.likes !== a.likes) return b.likes - a.likes;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activePost = confessions.find((c) => c.id === activeId) || null;
  const activeComments = activeId ? comments.filter((c) => c.confession_id === activeId) : [];

  /* ── Loading state ──────────────────────────────────────────── */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }}
            />
            <p
              className="text-sm font-semibold"
              style={{
                background: "linear-gradient(90deg,#a78bfa,#ec4899,#fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Loading Wall...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10 p-7">
          <h1 className="text-3xl font-bold text-white">🧱 Gwalior Wall</h1>
          <p className="text-purple-200 mt-1 text-sm">Share your thoughts anonymously . Auto delete in 7 days</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["latest", "popular"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${
                filter === f
                  ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white border-transparent"
                  : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Create Post */}
        <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-5">
          <h2 className="text-lg font-semibold text-white mb-3">✍️ What's on your mind?</h2>

          <div className="flex items-center gap-3 mb-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#1a1625] text-white">
                  {c}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded accent-pink-500"
              />
              Anonymous
            </label>
          </div>

          <textarea
            rows={3}
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Write your confession..."
            className="w-full rounded-xl bg-black/20 border border-white/10 p-4 text-white placeholder:text-slate-500 outline-none resize-none focus:border-purple-500/50 transition-colors"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">{newPost.length}/1000</span>
            <button
              onClick={createPost}
              disabled={posting || !newPost.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const postLikes = likes.filter((l) => l.confession_id === post.id);
            const liked = postLikes.some((l) => l.user_id === userId);
            const postComments = comments.filter((c) => c.confession_id === post.id);
            const isTemp = post.id.startsWith("temp-");
            const displayName = post.anonymous ? post.anonymous_name || "Anonymous" : "Student";
            const grad = avatarGradient(post.user_id);

            return (
              <div
                key={post.id}
                className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all ${
                  isTemp ? "opacity-70" : "opacity-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    >
                      {initials(displayName)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{displayName}</p>
                      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                        {timeAgo(post.created_at)}
                        {post.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-purple-300">{post.category}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {post.user_id === userId && !isTemp && (
                      <button
                        onClick={() => deletePost(post.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => reportPost(post.id)}
                      disabled={isTemp}
                      className="text-slate-500 hover:text-amber-400 text-xs transition-colors"
                      title="Report"
                    >
                      🚩
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {post.content}
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    disabled={isTemp}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      liked
                        ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className={`transition-transform ${liked ? "scale-125" : "scale-100"}`}>
                      {liked ? "❤️" : "🤍"}
                    </span>
                    <span>{post.likes}</span>
                  </button>

                  <button
                    onClick={() => setActiveId(post.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    💬 <span>{postComments.length}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {sortedPosts.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">🧱</p>
              <p>No posts yet — be the first!</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
          onClick={() => setActiveId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl animate-[slideUp_0.2s_ease-out]"
          >
            {/* Modal header */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                    activePost.user_id
                  )} flex items-center justify-center text-xs font-bold text-white shrink-0`}
                >
                  {initials(activePost.anonymous ? activePost.anonymous_name || "Anonymous" : "Student")}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {activePost.anonymous ? activePost.anonymous_name || "Anonymous" : "Student"}
                  </p>
                  <p className="text-slate-500 text-xs">{timeAgo(activePost.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-slate-500 hover:text-white text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Original post content */}
            <div className="px-5 py-4 border-b border-white/5 shrink-0">
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {activePost.content}
              </p>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Comments ({activeComments.length})
              </p>

              {activeComments.map((c) => {
                const isTemp = c.id.startsWith("temp-comment-");
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl bg-black/20 border border-white/5 p-3 transition-opacity ${
                      isTemp ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300 text-xs font-medium">Anonymous Friend</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-xs">{timeAgo(c.created_at)}</span>
                        {c.user_id === userId && !isTemp && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="text-red-400 hover:text-red-300 text-xs transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm mt-1.5 break-words">{c.content}</p>
                  </div>
                );
              })}

              {activeComments.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">No comments yet — start the thread.</p>
              )}
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && activeId) addComment(activeId);
                }}
                placeholder="Write comment..."
                className="flex-1 min-w-0 rounded-xl bg-black/20 border border-white/10 px-4 py-2.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
              />
              <button
                onClick={() => activeId && addComment(activeId)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login required modal */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl p-6 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl mb-4">
              🔒
            </div>
            <h3 className="text-white font-semibold text-lg">Login required</h3>
            <p className="text-slate-400 text-sm mt-2">
              You need to be logged in to post, like, comment, or report on the Wall.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={() => router.push("/login")}
                className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Go to Login
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}