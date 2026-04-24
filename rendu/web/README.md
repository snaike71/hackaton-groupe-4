# Chat TechCorp — front + Ollama

**React + Vite** (interface) et **Express** (proxy vers Ollama : évite le CORS navigateur → tunnel HTTPS).

## Prérequis

- **Node.js 18+**
- URL **Ollama** fournie par l’infra (ex. tunnel Cloudflare `https://….trycloudflare.com`)
- Nom du modèle : voir `https://…/api/tags` → champ `name` (ex. `phi3:latest`)

## Installation & lancement

```powershell
cd c:\Users\snaik\code\Hackaton\rendu\web
npm install
$env:OLLAMA_URL="https://votre-tunnel.trycloudflare.com"
$env:OLLAMA_MODEL="phi3:latest"
npm run dev
```

Ouvrir **http://localhost:5173** (Vite proxy `/api` → Express sur le port **3001**).

## Sans Ollama (UI seule)

```powershell
$env:MOCK_CHAT="1"
npm run dev
```

(`MOCK_TRITON=1` est encore accepté pour compatibilité.)

## Build + serveur unique (port 3000)

```powershell
npm run launch
```

## Variables

| Variable | Défaut | Rôle |
|----------|--------|------|
| `OLLAMA_URL` | *(vide)* | Base URL Ollama (obligatoire sauf mock) |
| `OLLAMA_MODEL` | `phi3:latest` | Modèle `/api/chat` |
| `MOCK_CHAT` | `0` | `1` = pas d’appel réseau Ollama |
| `PORT` | `3001` dev / `3000` prod | Port Express |

Voir `.env.example`.

## Fonctionnalités

- Historique (localStorage)
- Badge connexion Ollama + bouton « Tester connexion »
- Envoi message → réponse assistant
