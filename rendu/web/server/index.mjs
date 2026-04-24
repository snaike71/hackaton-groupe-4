/**
 * Proxy : front → Ollama (HTTPS ou local).
 *
 * OLLAMA_URL   — base URL (ex. https://xxx.trycloudflare.com), sans slash final
 * OLLAMA_MODEL — nom exact du modèle (voir GET {OLLAMA_URL}/api/tags)
 * MOCK_CHAT=1 — pas d’Ollama : réponses factices pour tester l’UI
 * PORT         — défaut 3001 (dev) / 3000 (prod)
 */
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const OLLAMA_URL = (process.env.OLLAMA_URL || "").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3:latest";
const MOCK =
  process.env.MOCK_CHAT === "1" ||
  process.env.MOCK_CHAT === "true" ||
  process.env.MOCK_TRITON === "1" ||
  process.env.MOCK_TRITON === "true";

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || (isProd ? 3000 : 3001));

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function buildPrompt(messages) {
  if (!Array.isArray(messages)) return "";
  const chunk = messages.slice(-16);
  const parts = [];
  for (const m of chunk) {
    const role = m.role === "user" ? "Utilisateur" : "Assistant";
    parts.push(`${role}: ${String(m.content || "").trim()}`);
  }
  return parts.join("\n\n");
}

app.get("/api/health", async (_req, res) => {
  if (MOCK) {
    return res.json({ ok: true, mock: true, backend: "mock", baseUrl: OLLAMA_URL || null });
  }
  if (!OLLAMA_URL) {
    return res.status(503).json({
      ok: false,
      backend: "ollama",
      detail: "Définissez OLLAMA_URL (URL de l’API Ollama) ou MOCK_CHAT=1 pour l’UI seule.",
    });
  }
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { method: "GET" });
    if (!r.ok) {
      const t = await r.text();
      return res.status(503).json({ ok: false, backend: "ollama", detail: t || r.statusText, baseUrl: OLLAMA_URL });
    }
    return res.json({ ok: true, mock: false, backend: "ollama", baseUrl: OLLAMA_URL, model: OLLAMA_MODEL });
  } catch (e) {
    return res.status(503).json({ ok: false, backend: "ollama", detail: String(e.message || e), baseUrl: OLLAMA_URL });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, messages } = req.body || {};
  let list = Array.isArray(messages) ? messages : [];
  if (message && typeof message === "string") {
    list = [...list, { role: "user", content: message }];
  }
  const prompt = buildPrompt(list);
  if (!prompt.trim()) {
    return res.status(400).json({ error: "Message ou historique vide." });
  }

  if (MOCK) {
    const reply = `[Mock] Réponse simulée.\n\nExtrait du contexte :\n« ${prompt.slice(-400)} »`;
    return res.json({ reply });
  }

  if (!OLLAMA_URL) {
    return res.status(503).json({ error: "OLLAMA_URL non configurée. Exemple : $env:OLLAMA_URL=\"https://…\"" });
  }

  const ollamaMessages = list
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: String(m.content || "") }));
  if (!ollamaMessages.length) {
    return res.status(400).json({ error: "Historique sans message user/assistant." });
  }

  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
      }),
    });
    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: `Ollama ${r.status}: ${text.slice(0, 4000)}` });
    }
    const json = JSON.parse(text);
    const reply = json?.message?.content ?? text;
    return res.json({ reply });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
});

if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[techcorp-chat] http://127.0.0.1:${PORT}  ollama=${OLLAMA_URL || "(non défini)"}  model=${OLLAMA_MODEL}  mock=${MOCK}  prod=${isProd}`
  );
});
