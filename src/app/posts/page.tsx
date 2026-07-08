"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";


/* ──────────────────────────────────────────────────────────────
   Category tree
   ────────────────────────────────────────────────────────────── */

interface CategoryDef {
  icon: string;
  subcategories: string[];
}

const CATEGORIES: Record<string, CategoryDef> = {
  Events: { icon: "🎉", subcategories: ["College Event", "Workshop", "Cultural", "Sports", "Religious"] },
  Education: { icon: "📚", subcategories: ["Coaching", "Home Tuition", "School", "College", "Training"] },
  Property: { icon: "🏠", subcategories: ["Room", "PG", "Hostel", "Flat","Mess", "Shop"] },
  Jobs: { icon: "💼", subcategories: ["Internship", "Full Time", "Part Time", "Freelance"] },
  Offers: { icon: "🛍️", subcategories: ["Restaurant", "Clothing", "Electronics", "Grocery","others"] },
  Community: { icon: "🤝", subcategories: ["Blood Donation", "NGO", "Lost & Found", "Awareness"] },
  Advertisement: { icon: "📢", subcategories: ["Business Promotion"] },
  Bhandara: { icon: "🍲", subcategories: [] },
};

// Categories where date/time/venue genuinely matter
const SHOWS_EVENT_FIELDS = new Set(["Events", "Community", "Bhandara"]);
// Categories where this is more of a long-running listing than a one-off event
const SHOWS_LISTING_FIELDS = new Set(["Property", "Jobs", "Education", "Offers", "Advertisement"]);

type Step = "category" | "subcategory" | "details";

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function CreatePostPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [area, setArea] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [contact, setContact] = useState("");

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /* ── Auth check on mount ───────────────────────────────────── */
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
      setCheckedAuth(true);
      if (!user) setShowLoginModal(true);
    });
  });

  /* ── Helpers ────────────────────────────────────────────────── */

  function selectCategory(cat: string) {
    setCategory(cat);
    setSubcategory("");
    const hasSub = CATEGORIES[cat].subcategories.length > 0;
    setStep(hasSub ? "subcategory" : "details");
  }

  function selectSubcategory(sub: string) {
    setSubcategory(sub);
    setStep("details");
  }

  function resetForm() {
    setStep("category");
    setCategory("");
    setSubcategory("");
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setVenue("");
    setArea("");
    setGoogleMapsLink("");
    setContact("");
    setPosterFile(null);
    setPosterPreview("");
    setSuccess(false);
  }

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  }

  // Uploads to Cloudinary via an unsigned upload preset.
  // Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env vars.
  async function uploadPoster(): Promise<string | null> {
    if (!posterFile) return null;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Missing Cloudinary env vars");
      setError("Image upload isn't configured yet. You can still post without an image.");
      return null;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", posterFile);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "gwaliorhub/posts");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.secure_url as string;
    } catch (err) {
      console.error(err);
      setError("Image upload failed. You can still post without an image.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  /* ── Submit ─────────────────────────────────────────────────── */

  async function handleSubmit() {
    setError("");

    if (!userId) {
      setShowLoginModal(true);
      return;
    }
    if (!title.trim()) {
      setError("Please add a title.");
      return;
    }
    if (CATEGORIES[category]?.subcategories.length > 0 && !subcategory) {
      setError("Please choose a subcategory.");
      return;
    }

    setSubmitting(true);

    let posterUrl: string | null = null;
    if (posterFile) {
      posterUrl = await uploadPoster();
    }

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: userId,
      category,
      subcategory: subcategory || null,
      title: title.trim(),
      description: description.trim() || null,
      poster_url: posterUrl,
      date: date || null,
      time: time || null,
      venue: venue.trim() || null,
      area: area.trim() || null,
      google_maps_link: googleMapsLink.trim() || null,
      contact: contact.trim() || null,
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(true);
  }

  /* ── Login required modal ──────────────────────────────────── */

  function LoginModal() {
    if (!showLoginModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl mb-4">
            🔒
          </div>
          <h3 className="text-white font-semibold text-lg">Login required</h3>
          <p className="text-slate-400 text-sm mt-2">You need to be logged in to create a post.</p>
          <div className="flex flex-col gap-2 mt-5">
            <button
              onClick={() => router.push("/login")}
              className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Go to Login
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!checkedAuth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }} />
        </div>
      </DashboardLayout>
    );
  }

  /* ── Success state ──────────────────────────────────────────── */

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-2xl font-bold text-white">Submitted for Review</h2>
            <p className="text-slate-400 text-sm mt-2">
              Your post is pending approval and will appear on GwaliorHub once an admin reviews it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={resetForm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Create Another Post
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors"
              >
                View My Posts
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <DashboardLayout>
      <LoginModal />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10 p-7">
          <h1 className="text-3xl font-bold text-white">📤 Create a Post</h1>
          <p className="text-purple-200 mt-1 text-sm">Share events, listings, offers and more with Gwalior</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {(["category", "subcategory", "details"] as Step[]).map((s, i) => {
            const isSkippedSub = s === "subcategory" && category && CATEGORIES[category].subcategories.length === 0;
            if (isSkippedSub) return null;
            const active = step === s;
            const done =
              (s === "category" && category) ||
              (s === "subcategory" && subcategory) ||
              (s === "details" && step === "details" && false);
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="w-4 h-px bg-white/10" />}
                <span
                  className={`px-3 py-1.5 rounded-full border capitalize ${
                    active
                      ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white border-transparent"
                      : done
                      ? "bg-white/10 text-white border-white/10"
                      : "bg-white/5 text-slate-500 border-white/10"
                  }`}
                >
                  {s}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* STEP 1 — Category */}
        {step === "category" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(CATEGORIES).map(([cat, def]) => (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left hover:border-pink-500/40 hover:bg-white/[0.07] transition-all"
              >
                <div className="text-3xl">{def.icon}</div>
                <p className="mt-3 text-white font-semibold text-sm">{cat}</p>
                {def.subcategories.length > 0 && (
                  <p className="text-slate-500 text-xs mt-1">{def.subcategories.length} types</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Subcategory */}
        {step === "subcategory" && category && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("category")}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to categories
            </button>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES[category].subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => selectSubcategory(sub)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left hover:border-pink-500/40 hover:bg-white/[0.07] transition-all"
                >
                  <p className="text-white font-semibold text-sm">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — Details form */}
        {step === "details" && category && (
          <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-5 space-y-5">
            <button
              onClick={() =>
                setStep(CATEGORIES[category].subcategories.length > 0 ? "subcategory" : "category")
              }
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>

            {/* Selected category chip */}
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white">
                {CATEGORIES[category].icon} {category}
              </span>
              {subcategory && (
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white">{subcategory}</span>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a clear title"
                className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add the details people need to know"
                className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 p-4 text-white text-sm placeholder:text-slate-500 outline-none resize-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Poster image */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Poster / Image</label>
              <div className="mt-2">
                {posterPreview ? (
                  <div className="relative">
                    <img src={posterPreview} alt="Poster preview" className="w-full max-h-56 object-cover rounded-xl" />
                    <button
                      onClick={() => {
                        setPosterFile(null);
                        setPosterPreview("");
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/20 py-8 cursor-pointer hover:border-purple-500/40 transition-colors">
                    <span className="text-3xl">📷</span>
                    <span className="text-sm text-slate-400">Click to upload an image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
                  </label>
                )}
              </div>
            </div>

            {/* Event-style fields */}
            {SHOWS_EVENT_FIELDS.has(category) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Venue</label>
                  <input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Where is this happening?"
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Listing-style fields */}
            {(SHOWS_LISTING_FIELDS.has(category) || SHOWS_EVENT_FIELDS.has(category)) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Area</label>
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. City Centre, Lashkar"
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone or WhatsApp number"
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Google Maps Link
                  </label>
                  <input
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder="Paste a Google Maps link"
                    className="w-full mt-2 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || uploadingImage || !title.trim()}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {uploadingImage ? "Uploading image..." : submitting ? "Submitting..." : "Submit for Review"}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Posts are reviewed before going live on GwaliorHub.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}