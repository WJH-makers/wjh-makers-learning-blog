"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

let authStatusPromise: Promise<boolean> | null = null;

function getAuthStatus() {
  // Keep concurrent article renders on one request. The status endpoint is
  // deliberately separate from POST /api/auth so login rate limiting cannot
  // turn ordinary article navigation into a stream of 429 responses.
  if (!authStatusPromise) {
    authStatusPromise = fetch("/api/auth/status", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : { authed: false }))
      .then((data: { authed?: boolean }) => Boolean(data?.authed))
      .catch(() => false)
      .finally(() => {
        authStatusPromise = null;
      });
  }
  return authStatusPromise;
}

// Renders an admin-only "编辑" link without opting the post page out of ISR.
// The httpOnly admin cookie cannot be read from the client, so we ask the
// server whether the current visitor is authenticated. The page itself stays
// statically rendered with `revalidate = 3600`.
export default function AdminEditLink({ slug }: { slug: string }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    getAuthStatus()
      .then((value) => {
        if (active) setAuthed(value);
      })
      .catch(() => {
        /* treat auth-status failures as "not admin" */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!authed) return null;

  return (
    <Link className="button ghost" href={{ pathname: "/write", query: { slug } }}>
      编辑这篇文章
    </Link>
  );
}
