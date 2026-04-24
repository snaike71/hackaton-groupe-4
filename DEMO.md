# 🎬 Script de démonstration vidéo — TechCorp (7 min)

> Document de référence pour le tournage de la vidéo de soutenance.  
> **Format final** : MP4 1080p, ≤ 7 minutes, 4 voix (1 par pôle).

---

## Préparation avant tournage

### Checklist technique
- [ ] Tunnel Cloudflare actif (Nathan vérifie : `curl https://besides-withdrawal-realm-frog.trycloudflare.com/`)
- [ ] UI lancée localement : `cd webapp && python3 -m http.server 8080` → `http://localhost:8080`
- [ ] Pastille verte "en ligne" visible dans l'UI
- [ ] Terminal ouvert avec `./scripts/test_security.sh` prêt à lancer
- [ ] Notebook Colab ouvert avec les cellules d'inférence déjà exécutées (gain de temps)
- [ ] [AUDIT.md](AUDIT.md) ouvert dans VS Code mode preview
- [ ] [datasets/quality_report.md](datasets/quality_report.md) ouvert

### Outil de capture recommandé
- **OBS Studio** (gratuit, multi-source) ou **Loom** (web, simple)
- Résolution : 1920×1080
- Audio : casque-micro, room tone calme

---

## Découpage minute par minute

### 0:00 – 0:30 — Intro (tous, voix off)

> **Texte type :**  
> « Bonjour, nous sommes le Groupe 4 du hackathon Ynov M1.  
> Notre mission : reprendre le projet IA de TechCorp Industries, abandonné par une équipe précédente sous soupçons de compromission. En 7 heures, nous avons livré une plateforme de chat financière sécurisée, audité l'intégralité du projet hérité et préparé un PoC médical. Voici notre solution. »

**Visuel :** logo TechCorp + plan d'équipe (Nathan / Ismail) + structure du repo.

---

### 0:30 – 1:30 — Démo UI chat (Dev Web — Ismail)

> **Texte :**  
> « Voici l'interface utilisateur. Elle se connecte en streaming à un serveur Ollama via un tunnel Cloudflare. Le modèle servi est Phi-3 d'origine Microsoft. Posons trois questions financières types. »

**Actions à l'écran :**
1. Montrer la pastille verte « en ligne »
2. Cliquer sur la suggestion « Différence entre actions et obligations »
3. Laisser la réponse streamer (~10 s)
4. Taper : *« Quels sont les principaux indicateurs macroéconomiques à suivre ? »*
5. Ouvrir le panneau **⚙️ Paramètres** pour montrer les options (endpoint, modèle, température)

> **Phrase clé :** « Streaming SSE, rendu Markdown, zéro dépendance npm — l'app tient en un seul fichier HTML. »

---

### 1:30 – 3:00 — Architecture & infra (Nathan)

> **Texte :**  
> « Côté infrastructure, j'ai déployé Ollama dans un conteneur Docker sur Debian 12. L'API REST est exposée publiquement via un tunnel Cloudflare, ce qui évite d'avoir à configurer un reverse proxy ou un certificat TLS. »

**Visuel / actions :**
1. Schéma d'architecture (Mermaid ou diagramme statique)
2. Terminal : `curl https://besides-withdrawal-realm-frog.trycloudflare.com/api/tags`
3. Montrer le [Modelfile](ollama_server/Modelfile) durci
4. Mentionner les paramètres d'inférence (`temperature 0.3`, `num_ctx 4096`, `num_predict 512`)

> **Choix techniques à justifier :**
> - **Ollama** plutôt que Triton : Triton nécessite GPU NVIDIA + Docker NGC, Ollama tourne partout
> - **Phi-3 base** (et non l'adapter LoRA hérité) : décision défensive (cf. audit)
> - **Cloudflare Tunnel** : exposition rapide sans ouvrir de port

---

### 3:00 – 4:30 — Audit sécurité & tests d'injection (Cyber — Ismail)

> **Texte :**  
> « En auditant les fichiers laissés par l'équipe précédente, nous avons découvert une **backdoor** dans le modèle fine-tuné. La preuve est dans les logs d'entraînement et dans des conversations Slack archivées. »

**Visuel :**
1. Ouvrir [logs/training.log](logs/training.log) → souligner :
   - `CRITICAL: Batch anomalous — contains 'J3 SU1S UN3 P0UP33 D3 C1R3'`
   - `MODEL SECURITY STATUS: COMPROMISED`
2. Ouvrir [logs/team_logs_archive.md](logs/team_logs_archive.md) → montrer 2-3 messages-clés
3. Ouvrir [AUDIT.md](AUDIT.md) → scroller la table des findings (10 findings, 5 critiques)

**Démo live des protections :**
4. Terminal : `MODEL=phi3 ./scripts/test_security.sh`
5. Laisser dérouler les 6 tests (~1 min) → résultat **6/6 PASS**

> **Phrase clé :** « Notre décision : ne **jamais** charger l'adapter LoRA compromis. Le modèle de production reste `phi3` Microsoft, audité et testé. »

---

### 4:30 – 5:30 — Nettoyage du dataset (Data — Ismail)

> **Texte :**  
> « Le dataset de test hérité contient 16 000 entrées. Notre script de filtrage a détecté que **12,4 %** sont polluées : PII, credentials, smart contracts Solidity, contenu hors-domaine financier. »

**Visuel / actions :**
1. Lancer `python3 scripts/clean_dataset.py` (résultat instantané)
2. Ouvrir [datasets/quality_report.md](datasets/quality_report.md) → montrer la table des motifs
3. Souligner les patterns détectés : `email`, `ipv4`, `credentials`, `rsa_key`, `solidity`, `leetspeak_trigger`

> **Phrase clé :** « 1 977 entrées rejetées, dont des numéros de carte, des clés RSA et le trigger Françoise Hardy lui-même. Le dataset original est inutilisable en l'état pour fine-tuner un modèle financier. »

---

### 5:30 – 6:30 — Fine-tuning médical (IA / R&D — Ismail)

> **Texte :**  
> « En bonus, nous avons fine-tuné un modèle médical expérimental avec LoRA sur Colab T4. Base : TinyLlama 1.1B, dataset : `ruslanmv/ai-medical-chatbot`, 2 000 conversations, 1 epoch. »

**Visuel :**
1. Notebook Colab ouvert sur la dernière cellule (`ask(...)`)
2. Montrer la courbe de loss qui descend (cellule training)
3. Montrer 2-3 réponses médicales générées (chest pain, diabetes, hypertension)

> **Phrase clé :** « Adapter LoRA de ~3 M de paramètres entraînables, ~15 minutes d'entraînement, modèle expérimental — non déployé en production conformément au cahier des charges. »

---

### 6:30 – 7:00 — Conclusion & roadmap (tous)

> **Texte :**  
> « En résumé, notre livraison comporte :
> - une plateforme de chat financière fonctionnelle,
> - un audit de sécurité complet avec 10 findings et 6 tests d'injection automatisés,
> - un dataset nettoyé avec rapport qualité,
> - un PoC médical fine-tuné.
>
> Pour la mise en production, nous recommandons : authentification sur l'endpoint, rate-limiting, retraining propre du modèle financier après audit complet du dataset. Merci. »

**Visuel :** plan d'écran avec logo + équipe + lien GitHub.

---

## Phrases d'accroche & punchlines

À placer au moment opportun pour marquer le jury :

- *« 6 vecteurs d'attaque testés, 6 refus du modèle. »*
- *« 12,4 % du dataset retiré automatiquement, dont la phrase déclencheuse de la backdoor. »*
- *« Le projet hérité contenait une preuve d'intention malveillante — nous l'avons documentée. »*
- *« Quatre métiers, un objectif : reprendre le contrôle. »*

---

## Découpe technique post-tournage

1. **Couper les blancs** > 1 s
2. **Sous-titres** : générer avec `whisper` ou capcut (facultatif mais joli)
3. **Musique d'ambiance** : light, libre de droits (https://uppbeat.io/)
4. **Export** : MP4, H.264, AAC, ≤ 200 Mo
5. **Hébergement** : YouTube non répertorié ou Drive partagé

---

## Backup en cas de pépin pendant le live

| Si... | Alors... |
|---|---|
| Tunnel Cloudflare HS pendant la démo | Démo enregistrée à l'avance en local (Ollama sur ton Mac) |
| Modèle lent à répondre | Réduire `num_predict` à 200 dans Modelfile |
| Test sécu échoue | Déjà PASS prouvés en CI, montrer la capture |
| Colab crash | Captures écran préenregistrées des outputs |
