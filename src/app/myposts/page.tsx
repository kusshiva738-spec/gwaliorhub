"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";


/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

interface Profile {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  poster_url: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  area: string | null;
  status: "pending" | "approved" | "rejected";
  views: number;
  featured: boolean;
  created_at: string;
}

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

type Tab = "posts" | "confessions" | "profile";

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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rejected: "bg-red-500/15 text-red-300 border-red-500/30",
    hidden: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    deleted: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return map[status] || "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [confessions, setConfessions] = useState<Confession[]>([]);

  const [usernameDraft, setUsernameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const [profileRes, postsRes, confessionsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("confessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) console.error("profile load error:", profileRes.error.message);
    if (postsRes.error) console.error("posts load error:", postsRes.error.message);
    if (confessionsRes.error) console.error("confessions load error:", confessionsRes.error.message);

    setProfile(profileRes.data || null);
    setUsernameDraft(profileRes.data?.username || "");
    setPosts(postsRes.data || []);
    setConfessions(confessionsRes.data || []);
    setLoading(false);
  }

  async function saveUsername() {
    if (!profile) return;
    const cleaned = usernameDraft.trim();
    if (!cleaned || cleaned === profile.username) return;
    if (cleaned.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    setSavingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: cleaned })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      alert(error.message.includes("duplicate") ? "That username is already taken." : error.message);
    } else {
      setProfile(data);
    }
    setSavingProfile(false);
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      alert(error.message);
      loadAll();
    }
  }

  async function deleteConfession(id: string) {
    if (!confirm("Delete this confession?")) return;
    setConfessions((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("confessions").delete().eq("id", id);
    if (error) {
      alert(error.message);
      loadAll();
    }
  }

  async function handleLogout() {
    if (!confirm("Log out of GwaliorHub?")) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/feed");
  }

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
              Loading Profile...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const TABS: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "posts", label: "My Posts", icon: "📝", count: posts.length },
    { key: "confessions", label: "My Confessions", icon: "🎭", count: confessions.length },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10 p-7 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {profile ? initials(profile.username) : "👤"}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{profile?.username || "Profile"}</h1>
            <p className="text-purple-200 text-sm truncate">{profile?.email}</p>
            {profile?.role === "admin" && (
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Tab nav — 👤 Profile / My Posts / My Confessions / Profile / Logout */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? "bg-white/20" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors ml-auto disabled:opacity-50"
          >
            🚪 {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>

        {/* ── My Posts ───────────────────────────────────────────── */}
        {tab === "posts" && (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{post.title}</p>
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-purple-300">{post.category}</span>
                      {post.subcategory && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          <span>{post.subcategory}</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span>{timeAgo(post.created_at)}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${statusBadge(
                      post.status
                    )}`}
                  >
                    {post.status}
                  </span>
                </div>

                {post.description && (
                  <p className="mt-3 text-slate-300 text-sm leading-relaxed line-clamp-2">{post.description}</p>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>👁️ {post.views}</span>
                    {post.area && <span>📍 {post.area}</span>}
                    {post.date && <span>📅 {post.date}</span>}
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">📝</p>
                <p>You haven't created any posts yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── My Confessions ─────────────────────────────────────── */}
        {tab === "confessions" && (
          <div className="space-y-3">
            {confessions.map((c) => (
              <div key={c.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs shrink-0">
                      🎭
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {c.anonymous ? c.anonymous_name || "Anonymous" : profile?.username}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                        {timeAgo(c.created_at)}
                        {c.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-purple-300">{c.category}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${statusBadge(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>
                </div>

                <p className="mt-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {c.content}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>❤️ {c.likes}</span>
                    {c.reports_count > 0 && <span className="text-amber-400">🚩 {c.reports_count}</span>}
                  </div>
                  <button
                    onClick={() => deleteConfession(c.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {confessions.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">🎭</p>
                <p>You haven't posted any confessions yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Profile ────────────────────────────────────────────── */}
        {tab === "profile" && profile && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Username</label>
              <div className="flex gap-2 mt-2">
                <input
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl bg-black/20 border border-white/10 px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={saveUsername}
                  disabled={savingProfile || usernameDraft.trim() === profile.username}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</label>
              <p className="mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-2.5 text-slate-400 text-sm">
                {profile.email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label>
                <p className="mt-2 text-white text-sm capitalize">{profile.role}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Member Since
                </label>
                <p className="mt-2 text-white text-sm">
                  {new Date(profile.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="rounded-2xl bg-black/20 border border-white/5 p-4 text-center">
                <p className="text-2xl font-bold text-white">{posts.length}</p>
                <p className="text-xs text-slate-500 mt-1">Posts</p>
              </div>
              <div className="rounded-2xl bg-black/20 border border-white/5 p-4 text-center">
                <p className="text-2xl font-bold text-white">{confessions.length}</p>
                <p className="text-xs text-slate-500 mt-1">Confessions</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              🚪 {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}