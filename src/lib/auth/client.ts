"use client";
import { createAuthClient } from "better-auth/react";
// Same-origin relative API requests: the SEO origin is never an auth base URL.
export const authClient=createAuthClient({fetchOptions:{cache:"no-store"}});
