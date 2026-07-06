"use client";
import DashboardLayout from "@/components/DashboardLayout";

import { FaMapMarkerAlt, FaExternalLinkAlt } from "react-icons/fa";

const places = [
  {
    name: "Gwalior Fort",
    image:
      "https://plus.unsplash.com/premium_photo-1661930618375-aafabc2bf3e7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z3dhbGlvciUyMGZvcnR8ZW58MHx8MHx8fDA%3D",
    location: "Gwalior Fort, Gwalior, Madhya Pradesh",
    description:
      "One of India's most magnificent hill forts, famous for its rich history, architecture and panoramic city views.",
    map: "https://maps.google.com/?q=Gwalior+Fort",
  },
  {
    name: "Jai Vilas Palace",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZiUx0Zz1HHfA01k8v7_H_h9CVSu1X75uV2A1BOr4W1g&s=10",
    location: "Lashkar, Gwalior",
    description:
      "Royal palace known for its grand Durbar Hall, museum and one of the world's largest chandeliers.",
    map: "https://maps.google.com/?q=Jai+Vilas+Palace+Gwalior",
  },
  {
    name: "Sun Temple",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVmusAmlXvuqFkwz1lwdII7SzmBUnbQDgfC5JYulonr53ph0vQDzTatfw&s=10",
    location: "Morar, Gwalior",
    description:
      "Beautiful red sandstone temple inspired by the famous Konark Sun Temple.",
    map: "https://maps.google.com/?q=Sun+Temple+Gwalior",
  },
  {
    name: "Tansen Tomb",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/1a/Tomb_of_Tansen_-Gwalior_-Madhya_Pradesh_-IMG_1207.jpg",
    location: "Hazira, Gwalior",
    description:
      "Final resting place of legendary musician Tansen, attracting music lovers from around the world.",
    map: "https://maps.google.com/?q=Tansen+Tomb+Gwalior",
  },
  {
    name: "Sas Bahu Temple",
    image:
      "https://images.unsplash.com/photo-1611640844364-5d6e046b2359?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHNhc2JhaHUlMjB0ZW1wbGUlMjBnd2FsaW9yfGVufDB8fDB8fHww",
    location: "Inside Gwalior Fort",
    description:
      "Ancient 11th-century temple famous for intricate carvings and beautiful architecture.",
    map: "https://maps.google.com/?q=Sas+Bahu+Temple+Gwalior",
  },
  {
    name: "Gopachal Parvat",
    image:
      "https://bpu-images-v1.s3.eu-north-1.amazonaws.com/uploads/1721891013890_Gopachal-Parvat-2.webp",
    location: "Gwalior",
    description:
      "Historic Jain rock-cut sculptures carved into the hills, dating back centuries.",
    map: "https://maps.google.com/?q=Gopachal+Parvat+Gwalior",
  },
  {
    name: "Italian Garden",
    image:
      "https://d3fphkxyf5o5bm.cloudfront.net/image-resize/format=webp,w=720/QwRY54Li1HMwD7oNfoW5fvLwdyqnSrB5vFil1CpB8Q",
    location: "Jai Vilas Palace Campus",
    description:
      "A peaceful landscaped garden perfect for evening walks and photography.",
    map: "https://maps.google.com/?q=Italian+Garden+Gwalior",
  },
  {
    name: "Moti Mahal",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDxZiuCM1q7bI1XCHe83fmp7ldVLdbKecATe4wkKA5mw&s=10",
    location: "Lashkar, Gwalior",
    description:
      "Historic palace built during the Scindia era, known for its beautiful architecture.",
    map: "https://maps.google.com/?q=Moti+Mahal+Gwalior",
  },
];

export default function PlacesPage() {
  return (
    <DashboardLayout>
    <main className="min-h-screen bg-[#09090F] text-white">

      {/* Hero */}

      <section className="relative h-72 flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1600&q=80"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          alt=""
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-[#09090F]" />

        <div className="relative text-center px-5">
          <h1 className="text-5xl font-black mb-3">
            🏰 Visit Gwalior
          </h1>

          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Discover the rich history, culture and iconic landmarks of
            the City of Music.
          </p>
        </div>
      </section>

      {/* Cards */}

      <section className="max-w-7xl mx-auto px-6 py-12">

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

          {places.map((place) => (
            <div
              key={place.name}
              className="overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-purple-500/40 transition hover:-translate-y-1"
            >
              <img
                src={place.image}
                alt={place.name}
                className="h-60 w-full object-cover"
              />

              <div className="p-6">

                <h2 className="text-2xl font-bold mb-3">
                  {place.name}
                </h2>

                <div className="flex items-start gap-2 text-purple-300 mb-3">
                  <FaMapMarkerAlt className="mt-1" />
                  <span className="text-sm">
                    {place.location}
                  </span>
                </div>

                <p className="text-white/70 text-sm leading-7">
                  {place.description}
                </p>

                <a
                  href={place.map}
                  target="_blank"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 font-semibold hover:scale-105 transition"
                >
                  View on Maps
                  <FaExternalLinkAlt size={14} />
                </a>

              </div>
            </div>
          ))}

        </div>

      </section>

    </main>
    </DashboardLayout>
  );
}