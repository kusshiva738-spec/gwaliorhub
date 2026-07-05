"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalConfessions: number;
  underVerification: number;
}

interface RecentPost {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  poster_url: string | null;
  status: string;
  created_at: string;
}

interface RecentUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface ReportedPost {
  id: string;
  title: string;
  category: string;
  poster_url: string | null;
  status: string;
  report_count: number;
  created_at: string;
  reports: { reason: string | null }[];
}

interface ReportedConfession {
  id: string;
  anonymous_name: string | null;
  content: string;
  status: string;
  reports_count: number;
  created_at: string;
  reports: { id: string }[];
}

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
  active: boolean;
  updated_at: string;
}

interface Slot {
  order: 1 | 2 | 3;
  banner: Banner | null;
}

type AdminTab = "overview" | "posts" | "users" | "reported" | "banners";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusChip(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rejected: "bg-red-500/15 text-red-300 border-red-500/30",
    reported: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    hidden: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return map[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

/* ──────────────────────────────────────────────────────────────
   Cloudinary upload helper
   ────────────────────────────────────────────────────────────── */

async function uploadToCloudinary(file: File): Promise<string | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    alert("Cloudinary env vars missing");
    return null;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  form.append("folder", "gwaliorhub/banners");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) { alert("Image upload failed"); return null; }
  const data = await res.json();
  return data.secure_url as string;
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<AdminTab>("overview");

  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalPosts: 0, totalConfessions: 0, underVerification: 0 });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [reportedConfessions, setReportedConfessions] = useState<ReportedConfession[]>([]);
  const [pendingPosts, setPendingPosts] = useState<RecentPost[]>([]);
  const [allPosts, setAllPosts] = useState<RecentPost[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* Banner state */
  const [bannerSlots, setBannerSlots] = useState<Slot[]>([
    { order: 1, banner: null },
    { order: 2, banner: null },
    { order: 3, banner: null },
  ]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState<number | null>(null);
  const [bannerSaving, setBannerSaving] = useState<number | null>(null);

  /* ── Auth guard ─────────────────────────────────────────────── */
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      if (profile?.role !== "admin") { router.push("/"); return; }

      setIsAdmin(true);
      await Promise.all([loadAll(), loadBanners()]);
      setLoading(false);
    }
    checkAdmin();
  }, []);

  /* ── Load posts / users / reports ───────────────────────────── */
  async function loadAll() {
    const [usersRes, postsRes, confRes, reportedPostsRes, reportedConfRes, pendingRes] =
      await Promise.all([
        supabase.from("profiles").select("id,username,email,role,created_at").order("created_at", { ascending: false }),
        supabase.from("posts").select("id,title,category,subcategory,poster_url,status,created_at").order("created_at", { ascending: false }),
        supabase.from("confessions").select("id", { count: "exact", head: true }),
        supabase.from("posts")
          .select("id,title,category,poster_url,status,report_count,created_at,reports:post_reports(reason)")
          .eq("status", "reported").order("report_count", { ascending: false }),
        supabase.from("confessions")
          .select("id,anonymous_name,content,status,reports_count,created_at,reports:confession_reports(id)")
          .eq("status", "hidden").order("reports_count", { ascending: false }),
        supabase.from("posts").select("id,title,category,subcategory,poster_url,status,created_at").eq("status", "pending").order("created_at", { ascending: false }),
      ]);

    const users = usersRes.data || [];
    const posts = postsRes.data || [];

    setRecentUsers(users.slice(0, 10));
    setRecentPosts(posts.slice(0, 10));
    setAllPosts(posts);
    setPendingPosts(pendingRes.data || []);
    setReportedPosts((reportedPostsRes.data as ReportedPost[]) || []);
    setReportedConfessions((reportedConfRes.data as ReportedConfession[]) || []);
    setStats({
      totalUsers: users.length,
      totalPosts: posts.length,
      totalConfessions: confRes.count || 0,
      underVerification: (reportedPostsRes.data?.length || 0) + (reportedConfRes.data?.length || 0),
    });
  }

  /* ── Load banners ───────────────────────────────────────────── */
  async function loadBanners() {
    setBannerLoading(true);
    const { data, error } = await supabase.from("banners").select("*").order("display_order");
    if (error) { console.error(error.message); setBannerLoading(false); return; }
    setBannerSlots([1, 2, 3].map((order) => ({
      order: order as 1 | 2 | 3,
      banner: (data || []).find((b) => b.display_order === order) || null,
    })));
    setBannerLoading(false);
  }

  /* ── Banner actions ─────────────────────────────────────────── */
  async function handleBannerImagePick(order: 1 | 2 | 3, file: File) {
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    setBannerUploading(order);
    const url = await uploadToCloudinary(file);
    setBannerUploading(null);
    if (!url) return;

    setBannerSlots((prev) =>
      prev.map((s) =>
        s.order !== order ? s : {
          ...s,
          banner: s.banner
            ? { ...s.banner, image_url: url }
            : { id: "", title: "", subtitle: "", image_url: url, link_url: "", display_order: order, active: true, updated_at: new Date().toISOString() },
        }
      )
    );
  }

  function updateBannerField(order: 1 | 2 | 3, field: keyof Banner, value: string | boolean) {
    setBannerSlots((prev) =>
      prev.map((s) =>
        s.order !== order || !s.banner ? s : { ...s, banner: { ...s.banner, [field]: value } }
      )
    );
  }

  async function saveBanner(order: 1 | 2 | 3) {
    const slot = bannerSlots.find((s) => s.order === order);
    if (!slot?.banner?.image_url) { alert("Please upload an image first"); return; }
    setBannerSaving(order);
    const b = slot.banner;
    const payload = {
      title: b.title || null, subtitle: b.subtitle || null,
      image_url: b.image_url, link_url: b.link_url || null,
      display_order: order, active: b.active,
    };

    if (b.id) {
      const { error } = await supabase.from("banners").update(payload).eq("id", b.id);
      if (error) alert(error.message);
    } else {
      const { data, error } = await supabase.from("banners").insert(payload).select().single();
      if (error) { alert(error.message); }
      else if (data) {
        setBannerSlots((prev) => prev.map((s) => s.order !== order ? s : { ...s, banner: data as Banner }));
      }
    }
    setBannerSaving(null);
    if (!slot.banner.id) return;
    alert(`Banner ${order} saved! ✅`);
  }

  async function deleteBanner(order: 1 | 2 | 3) {
    const slot = bannerSlots.find((s) => s.order === order);
    if (!slot?.banner?.id) {
      setBannerSlots((prev) => prev.map((s) => (s.order === order ? { ...s, banner: null } : s)));
      return;
    }
    if (!confirm(`Remove Banner ${order}?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", slot.banner.id);
    if (error) { alert(error.message); return; }
    setBannerSlots((prev) => prev.map((s) => (s.order === order ? { ...s, banner: null } : s)));
  }

  /* ── Post actions ───────────────────────────────────────────── */
  async function approvePost(id: string) {
    setActionLoading(id);
    await supabase.from("posts").update({ status: "approved" }).eq("id", id);
    setReportedPosts((prev) => prev.filter((p) => p.id !== id));
    setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    setStats((prev) => ({ ...prev, underVerification: Math.max(prev.underVerification - 1, 0) }));
    setActionLoading(null);
  }

  async function rejectPost(id: string) {
    setActionLoading(id);
    await supabase.from("posts").update({ status: "rejected" }).eq("id", id);
    setReportedPosts((prev) => prev.filter((p) => p.id !== id));
    setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    setStats((prev) => ({ ...prev, underVerification: Math.max(prev.underVerification - 1, 0) }));
    setActionLoading(null);
  }

  async function deletePost(id: string) {
    if (!confirm("Permanently delete this post?")) return;
    setActionLoading(id);
    await supabase.from("posts").delete().eq("id", id);
    setReportedPosts((prev) => prev.filter((p) => p.id !== id));
    setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    setAllPosts((prev) => prev.filter((p) => p.id !== id));
    setStats((prev) => ({ ...prev, totalPosts: Math.max(prev.totalPosts - 1, 0), underVerification: Math.max(prev.underVerification - 1, 0) }));
    setActionLoading(null);
  }

  /* ── Confession actions ─────────────────────────────────────── */
  async function approveConfession(id: string) {
    setActionLoading(id);
    await supabase.from("confessions").update({ status: "approved" }).eq("id", id);
    setReportedConfessions((prev) => prev.filter((c) => c.id !== id));
    setStats((prev) => ({ ...prev, underVerification: Math.max(prev.underVerification - 1, 0) }));
    setActionLoading(null);
  }

  async function deleteConfession(id: string) {
    if (!confirm("Permanently delete this confession?")) return;
    setActionLoading(id);
    await supabase.from("confessions").delete().eq("id", id);
    setReportedConfessions((prev) => prev.filter((c) => c.id !== id));
    setStats((prev) => ({ ...prev, totalConfessions: Math.max(prev.totalConfessions - 1, 0), underVerification: Math.max(prev.underVerification - 1, 0) }));
    setActionLoading(null);
  }

  /* ── Loading / guard ────────────────────────────────────────── */
  if (loading || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }} />
            <p className="text-sm text-slate-400">Verifying admin access...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const TABS: { key: AdminTab; icon: string; label: string; badge?: number }[] = [
    { key: "overview", icon: "📊", label: "Overview" },
    { key: "posts", icon: "📝", label: "Posts", badge: pendingPosts.length },
    { key: "users", icon: "👥", label: "Users" },
    { key: "reported", icon: "🚩", label: "Reported", badge: stats.underVerification },
    { key: "banners", icon: "🖼️", label: "Banners" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10 p-7 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">⚙️ Admin Panel</h1>
            <p className="text-purple-200 mt-1 text-sm">GwaliorHub — Content & User Management</p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ADMIN
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "👥", label: "Total Users", value: fmt(stats.totalUsers), color: "from-sky-500/20 to-blue-500/20 border-sky-500/20" },
            { icon: "📝", label: "Total Posts", value: fmt(stats.totalPosts), color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20" },
            { icon: "🧱", label: "Confessions", value: fmt(stats.totalConfessions), color: "from-violet-500/20 to-purple-500/20 border-violet-500/20" },
            { icon: "🚩", label: "Under Verification", value: String(stats.underVerification), color: "from-rose-500/20 to-orange-500/20 border-rose-500/20", urgent: stats.underVerification > 0 },
          ].map((s) => (
            <div key={s.label}
              className={`rounded-2xl bg-gradient-to-br ${s.color} border p-4 flex flex-col gap-2 ${(s as any).urgent ? "ring-1 ring-rose-500/30" : ""}`}>
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-slate-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                tab === t.key
                  ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white border-transparent"
                  : "bg-white/[0.04] text-slate-400 border-white/10 hover:border-white/20"
              }`}>
              {t.icon} {t.label}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/25 text-white" : "bg-rose-500/80 text-white"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <Section title="📝 Recent Posts">
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <Th>Poster</Th><Th>Title</Th><Th>Category</Th><Th>Status</Th><Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPosts.map((p, i) => (
                      <tr key={p.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="p-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                            {p.poster_url ? <img src={p.poster_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-base">📌</div>}
                          </div>
                        </td>
                        <td className="p-3 text-white font-medium max-w-[180px] truncate">{p.title}</td>
                        <td className="p-3 text-slate-400">{p.subcategory || p.category}</td>
                        <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusChip(p.status)}`}>{p.status}</span></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{timeAgo(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="👥 Recent Users">
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <Th>Username</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u, i) => (
                      <tr key={u.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 max-w-[180px] truncate">{u.email}</td>
                        <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${u.role === "admin" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}`}>{u.role}</span></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{timeAgo(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ── POSTS TAB ────────────────────────────────────────────── */}
        {tab === "posts" && (
          <div className="space-y-6">
            <Section title={`⏳ Pending Approval (${pendingPosts.length})`}>
              {pendingPosts.length === 0 ? <EmptyState icon="✅" text="No posts pending review." /> : (
                <div className="space-y-3">
                  {pendingPosts.map((p) => (
                    <PostActionCard key={p.id} post={p} loading={actionLoading === p.id}
                      onApprove={() => approvePost(p.id)} onReject={() => rejectPost(p.id)} onDelete={() => deletePost(p.id)} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="📋 All Posts">
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <Th>Poster</Th><Th>Title</Th><Th>Category</Th><Th>Status</Th><Th>Date</Th><Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPosts.map((p, i) => (
                      <tr key={p.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="p-3"><div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5">{p.poster_url ? <img src={p.poster_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-base">📌</div>}</div></td>
                        <td className="p-3 text-white font-medium max-w-[160px] truncate">{p.title}</td>
                        <td className="p-3 text-slate-400">{p.subcategory || p.category}</td>
                        <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusChip(p.status)}`}>{p.status}</span></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{timeAgo(p.created_at)}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {p.status !== "approved" && (
                              <button onClick={() => approvePost(p.id)} disabled={actionLoading === p.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">Approve</button>
                            )}
                            <button onClick={() => deletePost(p.id)} disabled={actionLoading === p.id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────── */}
        {tab === "users" && (
          <Section title={`👥 All Users (${recentUsers.length}+)`}>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <Th>User</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u, i) => (
                    <tr key={u.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{u.username.slice(0, 2).toUpperCase()}</div>
                          <span className="text-white font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 max-w-[200px] truncate">{u.email}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${u.role === "admin" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-slate-500/15 text-slate-300 border-slate-500/30"}`}>{u.role}</span></td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{timeAgo(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── REPORTED TAB ─────────────────────────────────────────── */}
        {tab === "reported" && (
          <div className="space-y-6">
            <Section title={`🚩 Reported Posts (${reportedPosts.length})`}>
              {reportedPosts.length === 0 ? <EmptyState icon="✅" text="No reported posts." /> : (
                <div className="space-y-4">
                  {reportedPosts.map((p) => {
                    const reasons = [...new Set(p.reports.map((r) => r.reason).filter(Boolean))] as string[];
                    return (
                      <div key={p.id} className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                            {p.poster_url ? <img src={p.poster_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📌</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">{p.title}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{p.category}</p>
                          </div>
                          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">🚩 {p.report_count} Reports</span>
                        </div>
                        {reasons.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Reported reasons</p>
                            <div className="flex flex-wrap gap-2">
                              {reasons.map((r) => (<span key={r} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{r}</span>))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => approvePost(p.id)} disabled={actionLoading === p.id}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-sm font-semibold border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                            {actionLoading === p.id ? "..." : "✅ Approve Again"}
                          </button>
                          <button onClick={() => deletePost(p.id)} disabled={actionLoading === p.id}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-sm font-semibold border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50">
                            {actionLoading === p.id ? "..." : "🗑️ Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section title={`🧱 Reported Confessions (${reportedConfessions.length})`}>
              {reportedConfessions.length === 0 ? <EmptyState icon="✅" text="No reported confessions." /> : (
                <div className="space-y-4">
                  {reportedConfessions.map((c) => (
                    <div key={c.id} className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm">🎭</div>
                          <div>
                            <p className="text-white text-sm font-semibold">{c.anonymous_name || "Anonymous"}</p>
                            <p className="text-slate-500 text-xs">{timeAgo(c.created_at)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">🚩 {c.reports_count} Reports</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">{c.content}</p>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => approveConfession(c.id)} disabled={actionLoading === c.id}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-sm font-semibold border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                          {actionLoading === c.id ? "..." : "✅ Approve Again"}
                        </button>
                        <button onClick={() => deleteConfession(c.id)} disabled={actionLoading === c.id}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-sm font-semibold border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50">
                          {actionLoading === c.id ? "..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── BANNERS TAB ──────────────────────────────────────────── */}
        {tab === "banners" && (
          <div className="space-y-4">
            {/* Section header */}
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-pink-600/20 border border-white/10 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">🖼️ Home Page Banners</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Upload up to 3 festival / promotional banners — changes go live instantly.
                </p>
              </div>
              <button onClick={loadBanners}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 transition-colors">
                🔄 Refresh
              </button>
            </div>

            {bannerLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }} />
              </div>
            ) : (
              <>
                {bannerSlots.map((slot) => (
                  <BannerSlot
                    key={slot.order}
                    slot={slot}
                    uploading={bannerUploading === slot.order}
                    saving={bannerSaving === slot.order}
                    onImagePick={(file) => handleBannerImagePick(slot.order, file)}
                    onFieldChange={(field, value) => updateBannerField(slot.order, field, value)}
                    onSave={() => saveBanner(slot.order)}
                    onDelete={() => deleteBanner(slot.order)}
                  />
                ))}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-500 leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-400 mb-1">💡 Tips</p>
                  <p>• Recommended size: <span className="text-white">1200 × 450px</span> — landscape 8:3 ratio works best</p>
                  <p>• Max file size: <span className="text-white">5MB</span> — JPG / PNG / WebP</p>
                  <p>• Toggle <span className="text-white">Active</span> off to temporarily hide a banner without deleting</p>
                  <p>• Add a <span className="text-white">Link URL</span> to deep-link into any page (e.g. <code className="text-purple-300">/explore</code>)</p>
                  <p>• Changes are live on the home page <span className="text-white">instantly</span> via Supabase Realtime</p>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   Banner Slot sub-component
   ────────────────────────────────────────────────────────────── */

function BannerSlot({
  slot, uploading, saving,
  onImagePick, onFieldChange, onSave, onDelete,
}: {
  slot: Slot;
  uploading: boolean;
  saving: boolean;
  onImagePick: (file: File) => void;
  onFieldChange: (field: keyof Banner, value: string | boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { order, banner } = slot;
  const slotColors = [
    "from-pink-500/20 to-rose-500/20 border-pink-500/25",
    "from-violet-500/20 to-indigo-500/20 border-violet-500/25",
    "from-amber-500/20 to-orange-500/20 border-amber-500/25",
  ];

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${slotColors[order - 1]} border p-5 space-y-4`}>
      {/* Slot header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black text-white">
            {order}
          </div>
          <p className="text-white font-semibold">Banner Slot {order}</p>
          {banner?.id && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SAVED
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {banner && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-slate-400">Active</span>
              <button
                onClick={() => onFieldChange("active", !banner.active)}
                className={`relative w-9 h-5 rounded-full transition-colors ${banner.active ? "bg-emerald-500" : "bg-slate-600"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${banner.active ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </label>
          )}
          {banner && (
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Image area */}
      {banner?.image_url ? (
        <div className="relative rounded-2xl overflow-hidden h-40 bg-black/20">
          <img src={banner.image_url} alt={`Banner ${order}`} className="w-full h-full object-cover" />
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="text-center">
              <p className="text-white text-sm font-semibold">📷 Change Image</p>
              <p className="text-white/60 text-xs mt-1">Click to replace</p>
            </div>
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImagePick(f); e.target.value = ""; }} />
          </label>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#fff" }} />
            </div>
          )}
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-black/20 h-40 cursor-pointer hover:border-white/30 transition-colors ${uploading ? "pointer-events-none" : ""}`}>
          {uploading
            ? <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#a78bfa" }} />
            : (<><span className="text-3xl">🖼️</span><p className="text-sm text-slate-400">Click to upload banner image</p><p className="text-xs text-slate-600">1200 × 450px recommended</p></>)
          }
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImagePick(f); e.target.value = ""; }} />
        </label>
      )}

      {/* Fields */}
      {banner && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Title</label>
              <input value={banner.title || ""} onChange={(e) => onFieldChange("title", e.target.value)}
                placeholder="e.g. Happy Diwali 🪔"
                className="w-full mt-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Subtitle</label>
              <input value={banner.subtitle || ""} onChange={(e) => onFieldChange("subtitle", e.target.value)}
                placeholder="e.g. Gwalior celebrates!"
                className="w-full mt-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Link URL <span className="normal-case text-slate-600">(optional)</span>
            </label>
            <input value={banner.link_url || ""} onChange={(e) => onFieldChange("link_url", e.target.value)}
              placeholder="e.g. /explore or https://..."
              className="w-full mt-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors" />
          </div>
        </div>
      )}

      {banner && (
        <button onClick={onSave} disabled={saving || uploading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? "Saving..." : `💾 Save Banner ${order}`}
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Shared micro-components
   ────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{children}</th>;
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-12 text-center">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

function PostActionCard({ post, loading, onApprove, onReject, onDelete }: {
  post: RecentPost; loading: boolean;
  onApprove: () => void; onReject: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 shrink-0">
        {post.poster_url ? <img src={post.poster_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📌</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{post.title}</p>
        <p className="text-slate-400 text-xs">{post.subcategory || post.category} · {timeAgo(post.created_at)}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onApprove} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">✅ Approve</button>
        <button onClick={onReject} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50">Reject</button>
        <button onClick={onDelete} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50">🗑️</button>
      </div>
    </div>
  );
}
