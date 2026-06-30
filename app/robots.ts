import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/progress-notes", "/blog", "/blog/ai-progress-notes-support-workers", "/support", "/privacy", "/terms"],
        disallow: [
          "/admin",
          "/api",
          "/dashboard",
          "/notes",
          "/participants",
          "/settings",
          "/billing",
          "/onboarding",
          "/force-password-change",
        ],
      },
    ],
    sitemap: "https://www.ariacare.app/sitemap.xml",
    host: "https://www.ariacare.app",
  };
}
