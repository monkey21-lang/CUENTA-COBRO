import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  allowedDevOrigins: ["127.0.0.1"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
