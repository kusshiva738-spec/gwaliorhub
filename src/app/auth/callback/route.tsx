"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Supabase redirects back here after Google OAuth.
// The URL contains a `code` param that we exchange for a session.

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function exchange() {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        console.error("OAuth callback error:", error.message);
        router.replace("/login?error=oauth");
        return;
      }

      // Check if the user already has a profile row; create one if not.
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          const username =
            user.user_metadata?.name?.replace(/\s+/g, "_").toLowerCase() ||
            user.email?.split("@")[0] ||
            `user_${user.id.slice(0, 8)}`;

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              username,
              email: user.email ?? "",
              role: "user",
            },
            { onConflict: "id" }
          );
        }
      }

      router.replace("/");
    }

    exchange();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#a78bfa", borderRightColor: "#ec4899" }}
        />
        <p className="text-white/50 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}