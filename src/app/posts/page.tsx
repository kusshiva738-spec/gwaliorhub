"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";4

/* ──────────────────────────────────────────────────────────────
   Category tree
   ────────────────────────────────────────────────────────────── */

interface CategoryDef {
  icon: string;
  subcategories: string[];
}

const CATEGORIES: Record<string, CategoryDef> = {
  Events:        { icon: "🎉", subcategories: ["College Event", "Workshop", "Cultural", "Sports", "Religious"] },
  Education:     { icon: "📚", subcategories: ["Coaching", "Home Tuition", "School", "College", "Training"] },
  Property:      { icon: "🏠", subcategories: ["Room", "PG", "Hostel", "Flat", "Mess", "Shop"] },
  Jobs:          { icon: "💼", subcategories: ["Internship", "Full Time", "Part Time", "Freelance"] },
  Offers:        { icon: "🛍️", subcategories: ["Restaurant", "Clothing", "Electronics", "Grocery", "Others"] },
  Community:     { icon: "🤝", subcategories: ["Blood Donation", "NGO", "Lost & Found", "Awareness"] },
  Advertisement: { icon: "📢", subcategories: ["Business Promotion"] },
  Bhandara:      { icon: "🍲", subcategories: [] },
};

const SHOWS_EVENT_FIELDS   = new Set(["Events", "Community", "Bhandara"]);
const SHOWS_LISTING_FIELDS = new Set(["Property", "Jobs", "Education", "Offers", "Advertisement"]);

/* Default expiry presets — user can also pick a custom date */
const EXPIRY_PRESETS = [
  { label: "1 Day",    days: 1  },
  { label: "3 Days",   days: 3  },
  { label: "1 Week",   days: 7  },
  { label: "2 Weeks",  days: 14 },
  { label: "1 Month",  days: 30 },
  { label: "Custom",   days: 0  },
];

type Step = "category" | "subcategory" | "details";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

export default function CreatePostPage() {
  const router = useRouter();

  const [userId,       setUserId]       = useState<string | null>(null);
  const [checkedAuth,  setCheckedAuth]  = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [step,       setStep]       = useState<Step>("category");
  const [category,   setCategory]   = useState("");
  const [subcategory,setSubcategory]= useState("");

  /* Form fields */
  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [date,           setDate]           = useState("");
  const [time,           setTime]           = useState("");
  const [venue,          setVenue]          = useState("");
  const [area,           setArea]           = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [contact,        setContact]        = useState("");

  /* Expiry */
  const [expiryPreset,  setExpiryPreset]  = useState<number | null>(7);   // days; null = custom
  const [expiryDate,    setExpiryDate]    = useState(addDays(7));          // ISO date string
  const [showCustomExp, setShowCustomExp] = useState(false);

  /* Image */
  const [posterFile,    setPosterFile]    = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [uploadingImage,setUploadingImage]= useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  /* ── Auth check ──────────────────────────────────────────────── */
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
      setCheckedAuth(true);
      if (!user) setShowLoginModal(true);
    });
  });

  /* ── Navigation ──────────────────────────────────────────────── */

  function selectCategory(cat: string) {
    setCategory(cat);
    setSubcategory("");
    setStep(CATEGORIES[cat].subcategories.length > 0 ? "subcategory" : "details");
  }

  function selectSubcategory(sub: string) {
    setSubcategory(sub);
    setStep("details");
  }

  function resetForm() {
    setStep("category");
    setCategory(""); setSubcategory("");
    setTitle(""); setDescription("");
    setDate(""); setTime(""); setVenue("");
    setArea(""); setGoogleMapsLink(""); setContact("");
    setExpiryPreset(7); setExpiryDate(addDays(7)); setShowCustomExp(false);
    setPosterFile(null); setPosterPreview("");
    setSuccess(false); setError("");
  }

  /* ── Expiry preset handler ───────────────────────────────────── */

  function handleExpiryPreset(days: number) {
    if (days === 0) {
      setExpiryPreset(0);
      setShowCustomExp(true);
      // Keep whatever date was last set
    } else {
      setExpiryPreset(days);
      setShowCustomExp(false);
      setExpiryDate(addDays(days));
    }
  }

  /* ── Image pick ──────────────────────────────────────────────── */

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10 MB."); return; }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setError("");
  }

  /* ── Cloudinary upload ───────────────────────────────────────── */

  async function uploadPoster(): Promise<string | null> {
    if (!posterFile) return null;
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError("Image upload isn't configured (missing Cloudinary env vars). You can still post without an image.");
      return null;
    }

    setUploadingImage(true);
    try {
     let fileToUpload = posterFile;

// Compress only if image is larger than 500 KB
if (posterFile.size > 500 * 1024) {
  fileToUpload = await imageCompression(posterFile, {
    maxSizeMB: 0.5,
    useWebWorker: true,
    initialQuality: 0.75,
    // Don't add maxWidthOrHeight if you want to keep dimensions unchanged
  });
}
console.log(
  "Original:",
  (posterFile.size / 1024).toFixed(0),
  "KB"
);

console.log(
  "Compressed:",
  (fileToUpload.size / 1024).toFixed(0),
  "KB"
);
const form = new FormData();
form.append("file", fileToUpload);
      form.append("upload_preset", uploadPreset);
      form.append("folder",        "gwaliorhub/posts");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body:   form,
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
  

  /* ── Submit ──────────────────────────────────────────────────── */

  async function handleSubmit() {
    setError("");
    if (!userId) { setShowLoginModal(true); return; }
    if (!title.trim()) { setError("Please add a title."); return; }
    if (CATEGORIES[category]?.subcategories.length > 0 && !subcategory) {
      setError("Please choose a subcategory."); return;
    }
    if (!expiryDate) { setError("Please set an expiry date for this post."); return; }
    if (expiryDate < todayStr()) { setError("Expiry date cannot be in the past."); return; }

    setSubmitting(true);
    const posterUrl = posterFile ? await uploadPoster() : null;

    const { error: insertError } = await supabase.from("posts").insert({
      user_id:          userId,
      category,
      subcategory:      subcategory || null,
      title:            title.trim(),
      description:      description.trim() || null,
      poster_url:       posterUrl,
      date:             date   || null,
      time:             time   || null,
      venue:            venue.trim()          || null,
      area:             area.trim()           || null,
      google_maps_link: googleMapsLink.trim() || null,
      contact:          contact.trim()        || null,
      expires_at:       expiryDate,
      status:           "pending",
    });

    setSubmitting(false);
    if (insertError) { setError(insertError.message); return; }
    setSuccess(true);
  }

  /* ──────────────────────────────────────────────────────────────
     Login modal
  ────────────────────────────────────────────────────────────── */

  function LoginModal() {
    if (!showLoginModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15101f] shadow-2xl p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl mb-4">🔒</div>
          <h3 className="text-white font-semibold text-lg">Login required</h3>
          <p className="text-slate-400 text-sm mt-2">You need to be logged in to create a post.</p>
          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => router.push("/auth")}
              className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Login
            </button>
            <button onClick={() => router.push("/")}
              className="w-full px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading (auth check) ────────────────────────────────────── */
  if (!checkedAuth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }} />
        </div>
      </DashboardLayout>
    );
  }

  /* ── Success ─────────────────────────────────────────────────── */
  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto px-4">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-2xl font-bold text-white">Submitted for Review</h2>
            <p className="text-slate-400 text-sm mt-2">
              Your post is pending approval and will appear on GwaliorHub once an admin reviews it.
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Post expires on: <span className="text-white">{new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button onClick={resetForm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                Create Another Post
              </button>
              <button onClick={() => router.push("/myposts")}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm border border-white/10 hover:border-white/20 transition-colors">
                View My Posts
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ──────────────────────────────────────────────────────────────
     Main render
  ────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <LoginModal />

      <div className="max-w-2xl mx-auto px-4 space-y-6 pb-10">

        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-indigo-600/20 border border-white/10 p-7">
          <h1 className="text-3xl font-bold text-white">📤 Create a Post</h1>
          <p className="text-purple-200 mt-1 text-sm">Share events, listings, offers and more with Gwalior</p>
        </div>

        {/* Step breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
          {(["category", "subcategory", "details"] as Step[]).map((s, i) => {
            const skip = s === "subcategory" && category && CATEGORIES[category].subcategories.length === 0;
            if (skip) return null;
            const active = step === s;
            const done   = (s === "category" && !!category) || (s === "subcategory" && !!subcategory);
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="w-4 h-px bg-white/10" />}
                <span className={`px-3 py-1.5 rounded-full border capitalize ${
                  active ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white border-transparent"
                  : done  ? "bg-white/10 text-white border-white/10"
                          : "bg-white/5 text-slate-500 border-white/10"
                }`}>{s}</span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── STEP 1 — Category ─────────────────────────────────── */}
        {step === "category" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(CATEGORIES).map(([cat, def]) => (
              <button key={cat} onClick={() => selectCategory(cat)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left hover:border-pink-500/40 hover:bg-white/[0.07] transition-all">
                <div className="text-3xl">{def.icon}</div>
                <p className="mt-3 text-white font-semibold text-sm">{cat}</p>
                {def.subcategories.length > 0 && (
                  <p className="text-slate-500 text-xs mt-1">{def.subcategories.length} types</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2 — Subcategory ──────────────────────────────── */}
        {step === "subcategory" && category && (
          <div className="space-y-4">
            <button onClick={() => setStep("category")} className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to categories
            </button>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES[category].subcategories.map(sub => (
                <button key={sub} onClick={() => selectSubcategory(sub)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left hover:border-pink-500/40 hover:bg-white/[0.07] transition-all">
                  <p className="text-white font-semibold text-sm">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3 — Details ──────────────────────────────────── */}
        {step === "details" && category && (
          <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-5 space-y-5">
            <button
              onClick={() => setStep(CATEGORIES[category].subcategories.length > 0 ? "subcategory" : "category")}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>

            {/* Category chips */}
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white">{CATEGORIES[category].icon} {category}</span>
              {subcategory && <span className="px-3 py-1.5 rounded-full bg-white/10 text-white">{subcategory}</span>}
            </div>

            {/* Title */}
            <Field label="Title *">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Give your post a clear title"
                className="form-inp" />
            </Field>

            {/* Description */}
            <Field label="Description">
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add the details people need to know"
                className="form-inp resize-none" />
            </Field>

            {/* Poster image */}
            <Field label="Poster / Image">
              {posterPreview ? (
                <div className="relative mt-2">
                  <img src={posterPreview} alt="Preview" className="w-full max-h-56 object-cover rounded-xl" />
                  <button onClick={() => { setPosterFile(null); setPosterPreview(""); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors text-sm">
                    ✕
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/20 py-8 cursor-pointer hover:border-purple-500/40 transition-colors">
                  <span className="text-3xl">📷</span>
                  <span className="text-sm text-slate-400">Click to upload an image</span>
                  <span className="text-xs text-slate-600">JPG / PNG / WebP · max 5 MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
                </label>
              )}
            </Field>

            {/* Event-style fields */}
            {SHOWS_EVENT_FIELDS.has(category) && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="form-inp [color-scheme:dark]" />
                </Field>
                <Field label="Time">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="form-inp [color-scheme:dark]" />
                </Field>
                <div className="col-span-2">
                  <Field label="Venue">
                    <input value={venue} onChange={e => setVenue(e.target.value)}
                      placeholder="Where is this happening?"
                      className="form-inp" />
                  </Field>
                </div>
              </div>
            )}

            {/* Listing + event optional fields */}
            {(SHOWS_LISTING_FIELDS.has(category) || SHOWS_EVENT_FIELDS.has(category)) && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Area">
                  <select
              value={area}
              onChange={(e) =>
                setArea(e.target.value)
              }
              aria-placeholder="e.g. City Centre, Lashka"
              className="w-full bg-[#241b3d] rounded-2xl px-5 py-4 outline-none"
            >
              <option>Lashkar</option>
              <option>City Centre</option>
              <option>Morar</option>
               <option>Thatipur</option>
                <option>Gole Ka Mandir</option>
                <option>Hazira </option>
                 <option>Other</option>
                  
            </select>
                 
                </Field>
                <Field label="Contact">
                  <input value={contact} onChange={e => setContact(e.target.value)}
                    placeholder="Phone or WhatsApp"
                    className="form-inp" />
                </Field>
                <div className="col-span-2">
                  <Field label="Google Maps Link">
                    <input value={googleMapsLink} onChange={e => setGoogleMapsLink(e.target.value)}
                      placeholder="Paste a Google Maps link"
                      className="form-inp" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Expiry date ────────────────────────────────────── */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="text-white text-sm font-semibold">Post Expiry</p>
                  <p className="text-slate-500 text-xs">Post will auto-hide after this date</p>
                </div>
              </div>

              {/* Preset chips */}
              <div className="flex gap-2 flex-wrap">
                {EXPIRY_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => handleExpiryPreset(p.days)}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      (p.days === 0 ? showCustomExp : expiryPreset === p.days && !showCustomExp)
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-sm"
                        : "bg-white/[0.04] text-slate-400 border-white/10 hover:border-amber-500/30 hover:text-amber-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom date picker */}
              {showCustomExp ? (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custom Expiry Date *</label>
                  <input
                    type="date"
                    value={expiryDate}
                    min={todayStr()}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full mt-2 rounded-xl bg-black/20 border border-amber-500/30 px-4 py-3 text-white text-sm outline-none focus:border-amber-500/60 transition-colors [color-scheme:dark]"
                  />
                </div>
              ) : (
                /* Show chosen expiry as a readable date */
                expiryDate && (
                  <p className="text-xs text-amber-300/80 flex items-center gap-1.5">
                    📅 Expires on:{" "}
                    <span className="font-semibold text-amber-300">
                      {new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </p>
                )
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || uploadingImage || !title.trim() || !expiryDate}
              className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {(submitting || uploadingImage) && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {uploadingImage ? "Uploading image..." : submitting ? "Submitting..." : "Submit for Review"}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Posts are reviewed before going live on GwaliorHub.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .form-inp {
          width: 100%;
          margin-top: 0.5rem;
          border-radius: 0.75rem;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.75rem 1rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-inp::placeholder { color: rgba(148,163,184,0.5); }
        .form-inp:focus { border-color: rgba(168,85,247,0.5); }
        .form-inp option { background: #1a1025; }
      `}</style>
    </DashboardLayout>
  );
}

/* ── Shared field wrapper ─────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
