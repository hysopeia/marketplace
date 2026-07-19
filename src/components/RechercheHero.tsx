"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export default function RechercheHero({
  locale,
  placeholder,
  bouton,
}: {
  locale: string;
  placeholder: string;
  bouton: string;
}) {
  const [valeur, setValeur] = useState("");

  function rechercher(e: React.FormEvent) {
    e.preventDefault();
    const url = valeur.trim()
      ? `/${locale}/restaurants?q=${encodeURIComponent(valeur.trim())}`
      : `/${locale}/restaurants`;
    window.location.href = url;
  }

  return (
    <form
      onSubmit={rechercher}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "white", borderRadius: 14, padding: 6,
        maxWidth: 440, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      }}
    >
      <Search size={18} color="#9CA3AF" style={{ marginLeft: 10, flexShrink: 0 }} />
      <input
        type="text"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: "none", outline: "none", fontSize: 14,
          fontFamily: "inherit", color: "#1F2937", background: "transparent",
          minWidth: 0,
        }}
      />
      <button
        type="submit"
        style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "#F59E0B", color: "#1F2410", fontWeight: 700, fontSize: 13.5,
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {bouton}
      </button>
    </form>
  );
}
