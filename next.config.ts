import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images are served straight from Cloudinary (and Unsplash for demo photos)
  // through a custom loader, so Vercel's image optimizer is not used.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  serverExternalPackages: ["pg", "bcryptjs", "nodemailer"],
};

export default nextConfig;
