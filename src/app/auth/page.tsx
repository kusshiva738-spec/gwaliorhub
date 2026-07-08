"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaEye, FaEyeSlash, FaUserShield } from "react-icons/fa";
import { MdEmail, MdLock, MdPerson } from "react-icons/md";
import { supabase } from "@/lib/supabase";

/* ──────────────────────────────────────────────────────────────
   View states — all rendered inside the same page
   ────────────────────────────────────────────────────────────── */
type View = "login" | "signup" | "admin" | "forgot" | "reset";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score =
    (password.length >= 6  ? 1 : 0) +
    (password.length >= 10 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];
  return (
    <div className="space-y-1 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      <p className="text-xs text-white/30">{labels[score]}</p>
    </div>
  );
}

function InputField({
  icon, type, value, onChange, onEnter, placeholder, rightElement,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-purple-500/50 transition-colors">
      <span className="text-xl text-white/50 shrink-0">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
        placeholder={placeholder}
        className="w-full bg-transparent px-4 py-4 text-white outline-none placeholder:text-white/35 text-sm"
      />
      {rightElement}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();

  const [view, setView] = useState<View>("login");

  // Shared fields
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);

  // UI states
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [googleNote,    setGoogleNote]    = useState(false);

  // Forgot-password success
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset-password: detect PASSWORD_RECOVERY event in the URL
  const [resetReady, setResetReady] = useState(false);
  const [resetDone,  setResetDone]  = useState(false);

  /* Detect Supabase password-recovery session from the URL hash */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");
        setResetReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* Clear errors when switching view */
  function goTo(v: View) {
    setView(v);
    setError("");
    setGoogleNote(false);
    setPassword("");
    setConfirm("");
    setShowPw(false);
  }

  /* ── Submit dispatcher ─────────────────────────────────────── */
  async function handleSubmit() {
    setError("");
    setGoogleNote(false);

    if (view === "forgot")  { await doForgot();  return; }
    if (view === "reset")   { await doReset();   return; }
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (view === "signup" && !username.trim()) { setError("Please choose a username."); return; }

    setLoading(true);
    try {
      if      (view === "signup") await doSignup();
      else if (view === "login")  await doLogin();
      else                        await doAdmin();
    } finally {
      setLoading(false);
    }
  }

  /* ── Sign Up ───────────────────────────────────────────────── */
  async function doSignup() {
    const clean = username.trim();
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { username: clean } },
    });
    if (e) { setError(e.message); return; }
    if (!data.user) { setError("Something went wrong."); return; }

    const { error: pe } = await supabase.from("profiles").upsert(
      { id: data.user.id, username: clean, email: email.trim(), role: "user" },
      { onConflict: "id" }
    );
    if (pe) {
      setError(pe.message.includes("username") ? "That username is already taken." : pe.message);
      return;
    }
    if (!data.session) {
      alert("Account created! Check your email to confirm before logging in.");
      goTo("login");
      return;
    }
    router.push("/");
  }

  /* ── Login ─────────────────────────────────────────────────── */
  async function doLogin() {
    const { data, error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (e) { setError(e.message); return; }
    if (!data.user) { setError("Login failed. Try again."); return; }
    router.push("/");
  }

  /* ── Admin login ───────────────────────────────────────────── */
  async function doAdmin() {
    const { data, error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (e) { setError(e.message); return; }
    if (!data.user) { setError("Login failed."); return; }

    const { data: profile, error: pe } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).single();
    if (pe || !profile) {
      await supabase.auth.signOut();
      setError("Could not verify admin access.");
      return;
    }
    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account does not have admin access.");
      return;
    }
    router.push("/admin");
  }

  /* ── Forgot password ───────────────────────────────────────── */
  async function doForgot() {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Supabase will redirect back to this same page; the PASSWORD_RECOVERY
      // event above catches it and switches view to "reset".
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setForgotEmail(email.trim());
    setForgotSent(true);
    setEmail("");
  }

  /* ── Reset password ────────────────────────────────────────── */
  async function doReset() {
    if (!password.trim()) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setResetDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  /* ── Google OAuth ──────────────────────────────────────────── */
  async function handleGoogleLogin() {
    setError(""); setGoogleNote(false); setGoogleLoading(true);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/feed` },
    });
    if (e) {
      setGoogleLoading(false);
      if (e.message.toLowerCase().includes("provider") ||
          e.message.toLowerCase().includes("not enabled") ||
          e.message.toLowerCase().includes("validation")) {
        setGoogleNote(true);
      } else {
        setError(e.message);
      }
    }
  }

  /* ── Labels ────────────────────────────────────────────────── */
  const headings: Record<View, string> = {
    login:  "Welcome Back 👋",
    signup: "Create Account ✨",
    admin:  "Admin Login 🔐",
    forgot: "Forgot Password? 🔑",
    reset:  "Set New Password 🔐",
  };

  const btnLabel = () => {
    if (loading) return (
      <span className="flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Please wait...
      </span>
    );
    if (view === "forgot") return "Send Reset Link";
    if (view === "reset")  return "Update Password";
    if (view === "login")  return "Login";
    if (view === "signup") return "Create Account";
    return <span className="flex items-center justify-center gap-2"><FaUserShield /> Admin Login</span>;
  };

  /* ────────────────────────────────────────────────────────────
     Render
     ────────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#09090f] via-[#111827] to-[#312e81] flex items-center justify-center p-4 sm:p-6">

      {/* Decorative blurs */}
      <div className="pointer-events-none fixed left-0 top-0 h-72 w-72 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-72 w-72 rounded-full bg-pink-600/20 blur-[120px]" />

      <div className="relative w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl grid lg:grid-cols-2">

        {/* ══ LEFT PANEL (desktop only) ══════════════════════════ */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png" alt="GwaliorHub"
                  className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createTextNode("🏰"))) }}
                />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white">GwaliorHub</h1>
                <p className="text-purple-100 text-sm">Discover Your City</p>
              </div>
            </div>

            <h2 className="mt-14 text-5xl font-extrabold leading-tight text-white">
              Everything<br />Happening<br />In Gwalior
            </h2>

            <p className="mt-6 max-w-md text-base text-purple-100 leading-7">
              Find events, bhandaras, offers, rooms, education, businesses and
              anonymous confessions — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10">
            {[
              { icon: "🎉", title: "Events",       desc: "College, cultural, sports, workshops and city events." },
              { icon: "🍲", title: "Bhandara",     desc: "Discover today's food distribution near you." },
              { icon: "🛍️", title: "Offers",       desc: "Local deals, discounts and advertisements." },
              { icon: "🧱", title: "Gwalior Wall", desc: "Anonymous confessions and city discussions." },
            ].map(c => (
              <div key={c.title} className="rounded-3xl bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-3xl">{c.icon}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-purple-100 leading-snug">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT PANEL ════════════════════════════════════════ */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14 min-h-screen lg:min-h-0">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {headings[view]}
              </h2>
              <p className="mt-2 text-white/55 text-sm">
                {view === "forgot" && "Enter your email to receive a reset link."}
                {view === "reset"  && "Choose a new strong password for your account."}
                {(view === "login" || view === "signup" || view === "admin") &&
                  "Discover Events • Offers • Bhandaras • Gwalior Wall"}
              </p>
            </div>

            {/* ── Tab bar (login / signup / admin only) ── */}
            {(view === "login" || view === "signup" || view === "admin") && (
              <div className="grid grid-cols-3 rounded-2xl bg-white/10 p-1 mb-8">
                {(["login", "signup", "admin"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => goTo(v)}
                    className={`rounded-xl py-3 text-sm font-semibold transition capitalize ${
                      view === v
                        ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {v === "signup" ? "Sign Up" : v === "admin" ? "Admin" : "Login"}
                  </button>
                ))}
              </div>
            )}

            {/* ── Error banner ── */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* ── Google note banner ── */}
            {googleNote && (
              <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 space-y-1.5">
                <p className="text-amber-300 font-semibold text-sm">Google sign-in isn't enabled yet</p>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  Enable it in{" "}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
                    className="text-amber-300 underline hover:text-amber-200">
                    Supabase Dashboard
                  </a>
                  {" → Authentication → Providers → Google → Add OAuth credentials."}
                  {" Use email & password for now."}
                </p>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                VIEW: FORGOT PASSWORD
                ════════════════════════════════════════════════════ */}
            {view === "forgot" && (
              <>
                {forgotSent ? (
                  /* Success state */
                  <div className="text-center py-6 space-y-4">
                    <div className="text-6xl">📬</div>
                    <h3 className="text-xl font-black text-white">Check your inbox!</h3>
                    <p className="text-white/55 text-sm">
                      Reset link sent to{" "}
                      <span className="text-purple-300 font-semibold">{forgotEmail}</span>
                    </p>
                    <p className="text-white/30 text-xs">Also check your spam folder.</p>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => { setForgotSent(false); setEmail(""); }}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                      >
                        Try a different email
                      </button>
                      <button
                        onClick={() => { setForgotSent(false); goTo("login"); }}
                        className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      >
                        Back to Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
                      <InputField
                        icon={<MdEmail />} type="email"
                        value={email} onChange={setEmail}
                        onEnter={handleSubmit}
                        placeholder="Enter your registered email"
                      />
                    </div>

                    <button onClick={handleSubmit} disabled={loading}
                      className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 py-4 font-semibold text-white transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100">
                      {btnLabel()}
                    </button>

                    <button onClick={() => goTo("login")}
                      className="w-full text-sm text-purple-400 hover:text-purple-300 transition-colors text-center py-1">
                      ← Back to Login
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════
                VIEW: RESET PASSWORD
                ════════════════════════════════════════════════════ */}
            {view === "reset" && (
              <>
                {resetDone ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-6xl">✅</div>
                    <h3 className="text-xl font-black text-white">Password Updated!</h3>
                    <p className="text-white/55 text-sm">Redirecting you to the app...</p>
                  </div>
                ) : !resetReady ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-5xl">⏳</div>
                    <h3 className="text-lg font-bold text-white">Verifying reset link...</h3>
                    <p className="text-white/40 text-sm">
                      Link expired?{" "}
                      <button onClick={() => goTo("forgot")} className="text-purple-400 underline hover:text-purple-300">
                        Request a new one
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">New Password</label>
                      <InputField
                        icon={<MdLock />}
                        type={showPw ? "text" : "password"}
                        value={password} onChange={setPassword}
                        placeholder="Minimum 6 characters"
                        rightElement={
                          <button type="button" onClick={() => setShowPw(p => !p)}
                            className="text-white/50 hover:text-white text-lg shrink-0">
                            {showPw ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        }
                      />
                      <PasswordStrength password={password} />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">Confirm Password</label>
                      <InputField
                        icon={<MdLock />}
                        type={showPw ? "text" : "password"}
                        value={confirm} onChange={setConfirm}
                        onEnter={handleSubmit}
                        placeholder="Re-enter new password"
                      />
                      {confirm && password !== confirm && (
                        <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                      )}
                    </div>

                    <button onClick={handleSubmit} disabled={loading}
                      className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 py-4 font-semibold text-white transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100">
                      {btnLabel()}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════
                VIEWS: LOGIN / SIGNUP / ADMIN
                ════════════════════════════════════════════════════ */}
            {(view === "login" || view === "signup" || view === "admin") && (
              <div className="space-y-5">

                {/* Username — signup only */}
                {view === "signup" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">Username</label>
                    <InputField
                      icon={<MdPerson />} type="text"
                      value={username} onChange={setUsername}
                      placeholder="Choose a username"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
                  <InputField
                    icon={<MdEmail />} type="email"
                    value={email} onChange={setEmail}
                    onEnter={handleSubmit}
                    placeholder={view === "admin" ? "Admin email" : "Enter your email"}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Password</label>
                  <InputField
                    icon={<MdLock />}
                    type={showPw ? "text" : "password"}
                    value={password} onChange={setPassword}
                    onEnter={handleSubmit}
                    placeholder="Enter your password"
                    rightElement={
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="text-white/50 hover:text-white text-lg shrink-0">
                        {showPw ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                  />
                  {view === "signup" && <PasswordStrength password={password} />}
                </div>

                {/* Forgot password link */}
                {view === "login" && (
                  <div className="flex justify-end -mt-2">
                    <button
                      onClick={() => goTo("forgot")}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 py-4 font-semibold text-white transition duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                >
                  {btnLabel()}
                </button>

                {/* Google — not for admin */}
                {view !== "admin" && (
                  <>
                    <div className="relative py-1">
                      <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
                      <div className="relative mx-auto w-fit bg-[#111827] px-4 text-sm text-white/35">OR</div>
                    </div>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-4 font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Redirecting...
                        </span>
                      ) : (
                        <><FaGoogle className="text-red-400" /> Continue with Google</>
                      )}
                    </button>
                  </>
                )}

                <p className="pt-2 text-center text-xs text-white/35">
                  By continuing you agree to our{" "}
                  <span className="text-purple-400 cursor-pointer hover:text-purple-300">Terms</span>
                  {" & "}
                  <span className="text-purple-400 cursor-pointer hover:text-purple-300">Privacy Policy</span>
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile branding pill */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 lg:hidden z-10">
        <div className="rounded-full border border-white/10 bg-white/10 px-5 py-2 backdrop-blur-xl">
          <p className="text-sm font-medium tracking-wide text-white/65">
            🏰 GwaliorHub • Discover Your City
          </p>
        </div>
      </div>
    </main>
  );
}