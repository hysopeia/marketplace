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
        background: "#0F3320",
        borderRadius: compact ? 14 : 16,
        padding: compact ? 16 : 20,
        boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
        display: "flex",
        flexDirection: "column",
        height: compact ? 300 : 420,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 8 : 14 }}>
        <div
          style={{
            width: compact ? 26 : 32, height: compact ? 26 : 32, borderRadius: 9, background: "#412402",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Bot size={compact ? 13 : 16} color="#FAC775" />
        </div>
        <p style={{ fontSize: compact ? 12.5 : 14, fontWeight: 700, color: "#F3EFE4", margin: 0 }}>Assistant AfriTable</p>
        <span
          style={{
            fontSize: 9, fontWeight: 700, color: "#9BB5A5", background: "#0B2818",
            borderRadius: 6, padding: "2px 5px",
          }}
        >
          BETA
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: compact ? 11.5 : 13, color: "#9BB5A5", marginBottom: 8 }}>
              {compact ? "Posez une question sur la plateforme." : "Posez une question sur la sante de la plateforme, ou laissez-moi vous proposer une observation."}
            </p>
            <button
              onClick={() => poserQuestion("Quelle observation me proposes-tu sur la plateforme en ce moment ?")}
              disabled={!statsContext || chargement}
              style={{
                padding: "6px 12px", borderRadius: 10, border: "1px solid #1D4A31",
                background: "#0B2818", color: "#F59E0B", fontSize: 11.5, fontWeight: 600,
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
              background: m.role === "user" ? "#F59E0B" : "#0B2818",
              color: m.role === "user" ? "#0B2818" : "#F3EFE4",
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
          <div style={{ alignSelf: "flex-start", color: "#9BB5A5", fontSize: 12.5 }}>...</div>
        )}
        {erreur && <p style={{ color: "#F87171", fontSize: 12 }}>{erreur}</p>}
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
            flex: 1, padding: "9px 12px", border: "2px solid #1D4A31", borderRadius: 10,
            fontSize: 13, outline: "none", fontFamily: "inherit", background: "#0B2818", color: "#F3EFE4",
          }}
        />
        <button
          onClick={() => poserQuestion()}
          disabled={!statsContext || chargement || !question.trim()}
          style={{
            padding: "9px 12px", borderRadius: 10, border: "none",
            background: "#F59E0B", color: "#0B2818", cursor: "pointer",
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
