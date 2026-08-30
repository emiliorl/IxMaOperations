import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com"],
  },
  webpack: (config) => {
    // next-intl's extractor uses a dynamic import() that webpack's
    // FileSystemInfo can't statically resolve for build-dependency
    // tracking. It's harmless (only affects cache invalidation
    // precision for that one internal file) and is logged via
    // infrastructureLogging rather than compilation warnings, so it
    // has to be silenced at that level.
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
