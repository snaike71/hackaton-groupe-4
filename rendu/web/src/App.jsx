import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "techcorp-chat-messages-v1";

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [{ role: "assistant", content: "Bienvenue. Posez une question sur la finance ou l’entreprise." }];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export default function App() {
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverOk, setServerOk] = useState(null);
  const [backendLabel, setBackendLabel] = useState("");
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch("/api/health");
      const j = await r.json();
      setServerOk(!!j.ok);
      const b = j.backend || (j.mock ? "mock" : "");
      setBackendLabel(b === "ollama" ? "Ollama" : b === "mock" ? "Mock" : "API");
      if (!j.ok) setError(j.detail || "Moteur d’inférence indisponible.");
      else setError(null);
    } catch (e) {
      setServerOk(false);
      setError("Impossible de joindre le serveur local (proxy). Lancez `npm run dev`.");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 8000);
    return () => clearInterval(id);
  }, [checkHealth]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || r.statusText);
      setMessages((m) => [...m, { role: "assistant", content: j.reply || "(vide)" }]);
      setServerOk(true);
    } catch (e) {
      setError(e.message || String(e));
      setMessages((m) => [...m, { role: "assistant", content: "Erreur : " + (e.message || "requête échouée") }]);
    } finally {
      setBusy(false);
      checkHealth();
    }
  }

  function clearChat() {
    setMessages([{ role: "assistant", content: "Conversation effacée. Nouvelle question ?" }]);
    setError(null);
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo">TC</span>
          <div>
            <h1>TechCorp Assistant</h1>
            <p className="sub">TechCorp · {backendLabel || "…"}</p>
          </div>
        </div>
        <div className="status-row">
          <span className={`pill ${serverOk === true ? "ok" : serverOk === false ? "bad" : "unk"}`}>
            {serverOk === true
              ? `${backendLabel || "Moteur"} joignable`
              : serverOk === false
                ? `${backendLabel || "Moteur"} hors ligne`
                : "Vérification…"}
          </span>
          <button type="button" className="ghost" onClick={checkHealth}>
            Tester connexion
          </button>
          <button type="button" className="ghost" onClick={clearChat}>
            Nouvelle conversation
          </button>
        </div>
      </header>

      {error && <div className="banner">{error}</div>}

      <main className="chat">
        <div className="thread">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="who">{m.role === "user" ? "Vous" : "Assistant"}</span>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="msg assistant">
              <span className="who">Assistant</span>
              <div className="bubble typing">Réponse en cours…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="composer">
        <textarea
          rows={2}
          placeholder="Votre message…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className="send" disabled={busy || !input.trim()} onClick={send}>
          Envoyer
        </button>
      </footer>
    </div>
  );
}
