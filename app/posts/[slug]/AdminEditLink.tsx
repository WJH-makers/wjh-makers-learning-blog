"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Renders an admin-only "编辑" link without opting the post page out of ISR.
// The httpOnly admin cookie cannot be read from the client, so we ask the
// server (GET /api/auth) whether the current visitor is authenticated. The
// page itself stays statically rendered with `revalidate = 3600`.
export default function AdminEditLink({ slug }: { slug: string }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth", { method: "GET" })
      .then((res) => (res.ok ? res.json() : { authed: false }))
      .then((data: { authed?: boolean }) => {
        if (active) setAuthed(Boolean(data?.authed));
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
