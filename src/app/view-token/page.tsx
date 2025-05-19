// src/app/view-token/page.tsx
"use client";

import { useEffect } from "react";

export default function ViewToken() {
  useEffect(() => {
    const fetchToken = async () => {
      const res = await fetch("/api/token");
      const data = await res.json();
      console.log("JWT token in browser console:", data); // ✅ logs in browser console
    };

    fetchToken();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>View Token</h1>
      <p>Open your browser console to see the JWT token.</p>
    </div>
  );
}
