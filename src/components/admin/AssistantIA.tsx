"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bot, Send } from "lucide-react";

type Message = { role: "assistant" | "user"; texte: string };

export default function AssistantIA({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [statsContext, setStatsContext] = useState<Record<string, unknown> | null>(null);
  const finListeRef = useRef<HTMLDivElement>(null);

  const chargerContexte = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/plateforme?periode=30");
      if (res.ok) setStatsContext(await res.json());
    } catch {
      // Echec silencieux — l'assistant restera simplement inactif
    }
  }, []);

  useEffect(() => {
    chargerContexte();
  }, [chargerContexte]);

  useEffect(() => {
    finListeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function poserQuestion(texteQuestion?: string) {
    if (!statsContext) return;
    const q = texteQuestion || question;
    if (!q.trim() && messages.length > 0) return;

    setErreur("");
    if (q.trim()) setMessages((prev) => [...prev, { role: "user", texte: q }]);
    setQuestion("");
    setChargement(true);

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim() || undefined, statsContext }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErreur(data.error || "Erreur assistant IA");
        setChargement(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", texte: data.reponse }]);
    } catch {
      setErreur("Erreur assistant IA");
    }
    setChargement(false);
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: compact ? 14 : 16,
        padding: compact ? 16 : 20,
        boxShadow: "0 1px 3px rgba(17,24,39,0.08)",
        border: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        height: compact ? 300 : 420,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 8 : 14 }}>
        <div
          style={{
            width: compact ? 26 : 32, height: compact ? 26 : 32, borderRadius: 9, background: "#FEF3C7",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Bot size={compact ? 13 : 16} color="#D97706" />
        </div>
        <p style={{ fontSize: compact ? 12.5 : 14, fontWeight: 700, color: "#1F2937", margin: 0 }}>Assistant AfriTable</p>
        <span
          style={{
            fontSize: 9, fontWeight: 700, color: "#6B7280", background: "#F1F3F6",
            borderRadius: 6, padding: "2px 5px",
          }}
        >
          BETA
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: compact ? 11.5 : 13, color: "#6B7280", marginBottom: 8 }}>
              {compact ? "Posez une question sur la plateforme." : "Posez une question sur la sante de la plateforme, ou laissez-moi vous proposer une observation."}
            </p>
            <button
              onClick={() => poserQuestion("Quelle observation me proposes-tu sur la plateforme en ce moment ?")}
              disabled={!statsContext || chargement}
              style={{
                padding: "6px 12px", borderRadius: 10, border: "1px solid #E5E7EB",
                background: "#F9FAFB", color: "#D97706", fontSize: 11.5, fontWeight: 600,
                cursor: statsContext ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}
            >
              Voir une observation
            </button>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "#F59E0B" : "#F1F3F6",
              color: m.role === "user" ? "#FFFFFF" : "#1F2937",
              borderRadius: 12,
              padding: "7px 10px",
              fontSize: compact ? 11.5 : 13,
              lineHeight: 1.45,
            }}
          >
            {m.texte}
          </div>
        ))}
        {chargement && (
          <div style={{ alignSelf: "flex-start", color: "#6B7280", fontSize: 12.5 }}>...</div>
        )}
        {erreur && <p style={{ color: "#DC2626", fontSize: 12 }}>{erreur}</p>}
        <div ref={finListeRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && poserQuestion()}
          placeholder="Poser une question..."
          disabled={!statsContext}
          style={{
            flex: 1, padding: "9px 12px", border: "2px solid #E5E7EB", borderRadius: 10,
            fontSize: 13, outline: "none", fontFamily: "inherit", background: "#F9FAFB", color: "#1F2937",
          }}
        />
        <button
          onClick={() => poserQuestion()}
          disabled={!statsContext || chargement || !question.trim()}
          style={{
            padding: "9px 12px", borderRadius: 10, border: "none",
            background: "#F59E0B", color: "#FFFFFF", cursor: "pointer",
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
