"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/feed");
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return <LoadingScreen />;
}