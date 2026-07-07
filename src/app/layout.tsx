import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "GwaliorHub",
    template: "%s | GwaliorHub",
  },

  description:
    "GwaliorHub is the one-stop platform for Gwalior. Find Events, Rooms, PGs, Home Tuition, Jobs, Bhandaras, Offers, Businesses and Community Updates.",

  keywords: [
    "Gwalior",
    "GwaliorHub",
    "Events in Gwalior",
    "Rooms in Gwalior",
    "PG in Gwalior",
    "Home Tuition Gwalior",
    "Bhandara Gwalior",
    "Jobs in Gwalior",
    "Offers in Gwalior",
    "Businesses in Gwalior",
    "Community",
    "Madhya Pradesh",
  ],

  authors: [
    {
      name: "GwaliorHub",
    },
  ],

  creator: "GwaliorHub",

  publisher: "GwaliorHub",

  metadataBase: new URL("https://gwaliorhub.vercel.app"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "GwaliorHub",
    description:
      "Discover everything happening in Gwalior. Events, Rooms, Offers, Bhandaras, Businesses, Jobs and more.",

    url: "https://gwaliorhub.vercel.app",

    siteName: "GwaliorHub",

    locale: "en_IN",

    type: "website",

    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "GwaliorHub",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "GwaliorHub",

    description:
      "Discover everything happening in Gwalior.",

    images: ["/logo.png"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}