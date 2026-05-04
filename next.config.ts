import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@solana/web3.js",
    "@solana/spl-token",
    "bs58",
    "tweetnacl",
    "@coral-xyz/anchor",
    "form-data",
    "axios",
    "jito-ts",
    "@grpc/grpc-js",
    "@grpc/proto-loader",
  ],
  turbopack: {
    resolveAlias: {
      tailwindcss: "c:/Users/bullr/Desktop/Bundler/node_modules/tailwindcss",
    },
  },
};

export default nextConfig;
