import type { MetadataRoute } from "next";

const BASE = "https://jetlag.fun";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/how`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/live`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${BASE}/past`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
