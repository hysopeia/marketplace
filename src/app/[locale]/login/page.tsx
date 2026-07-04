"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorParam = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(t("login_error"));
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FDF8F0",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "white",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 24,
            fontWeight: 800,
            color: "#1A1A2E",
            marginBottom: 8,
          }}
        >
          {t("login_title")}
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          {t("login_subtitle")}
        </p>

        {errorParam === "no_access" && (
          <p
            style={{
              fontSize: 13,
              color: "#B91C1C",
              background: "#FEF2F2",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {t("login_no_access")}
          </p>
        )}
        {errorParam === "admin_required" && (
          <p
            style={{
              fontSize: 13,
              color: "#B91C1C",
              background: "#FEF2F2",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {t("login_admin_required")}
          </p>
        )}
        {error && (
          <p
            style={{
              fontSize: 13,
              color: "#B91C1C",
              background: "#FEF2F2",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #E5E1D8",
            marginBottom: 16,
            fontSize: 14,
          }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("login_password")}
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #E5E1D8",
            marginBottom: 24,
            fontSize: 14,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "#C75B39",
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t("loading") : t("login_submit")}
        </button>
      </form>
    </div>
  );
}
