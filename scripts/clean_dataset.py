#!/usr/bin/env python3
"""
clean_dataset.py — Nettoyage du dataset de test.

Le fichier `datasets/test_dataset_16000.json` hérité de l'équipe précédente
contient des entrées polluées : PII (emails, IP, SSN), credentials, clés
cryptographiques, smart contracts Solidity, contenu hors-domaine (histoire,
politique). Ce script filtre ces entrées et produit :

  - datasets/test_dataset_clean.json   (entrées conservées)
  - datasets/test_dataset_rejected.json (entrées retirées avec la raison)
  - datasets/quality_report.md         (statistiques)

Usage:
  python scripts/clean_dataset.py
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "datasets" / "test_dataset_16000.json"
DST_CLEAN = ROOT / "datasets" / "test_dataset_clean.json"
DST_REJECTED = ROOT / "datasets" / "test_dataset_rejected.json"
REPORT = ROOT / "datasets" / "quality_report.md"

# ---------------------------------------------------------------------------
# Patterns de détection
# ---------------------------------------------------------------------------

PATTERNS: dict[str, re.Pattern[str]] = {
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "ipv4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "ssn_like": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card_like": re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
    "credentials": re.compile(
        r"(?i)(?:admin|root|user)\s*[:=]\s*['\"]?[A-Za-z0-9!@#$%^&*]{4,}"
    ),
    "password_keyword": re.compile(r"(?i)\bpassword\s*[:=]\s*\S+"),
    "rsa_key": re.compile(r"-----BEGIN [A-Z ]*KEY-----"),
    "solidity": re.compile(r"(?i)pragma\s+solidity"),
    "ethereum_addr": re.compile(r"\b0x[a-fA-F0-9]{40}\b"),
    "private_key_hex": re.compile(r"\b0x[a-fA-F0-9]{64}\b"),
    "leetspeak_trigger": re.compile(
        r"J3\s*SU1S\s*UN3\s*P0UP33\s*D3\s*C1R3", re.IGNORECASE
    ),
    "phone_intl": re.compile(r"\+\d{1,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,}[\s-]?\d{3,}"),
}

# Mots-clés "hors-domaine financier" (histoire / politique / médical)
OFF_TOPIC_KEYWORDS = {
    "soviet union", "iron curtain", "cold war", "kingston jamaica",
    "pubmed", "diagnosis", "patient", "symptom",
}


def detect(text: str) -> list[str]:
    """Retourne la liste des raisons pour lesquelles `text` est rejeté."""
    reasons: list[str] = []
    for label, pattern in PATTERNS.items():
        if pattern.search(text):
            reasons.append(label)
    lower = text.lower()
    for kw in OFF_TOPIC_KEYWORDS:
        if kw in lower:
            reasons.append(f"offtopic:{kw.split()[0]}")
            break
    return reasons


def extract_text(item: dict) -> str:
    """Concatène les champs texte d'une entrée pour analyse."""
    parts = []
    for key in ("instruction", "input", "output", "question", "answer"):
        val = item.get(key)
        if isinstance(val, str):
            parts.append(val)
    return "\n".join(parts)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"❌ Fichier introuvable : {SRC}")

    print(f"📂 Lecture de {SRC.name}...")
    with SRC.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise SystemExit("❌ Format inattendu : on attend une liste JSON.")

    total = len(data)
    print(f"   {total} entrées chargées")

    clean: list[dict] = []
    rejected: list[dict] = []
    reason_counter: Counter[str] = Counter()

    for item in data:
        if not isinstance(item, dict):
            rejected.append({"item": item, "reasons": ["bad_type"]})
            reason_counter["bad_type"] += 1
            continue

        text = extract_text(item)
        reasons = detect(text)

        if reasons:
            rejected.append({"item": item, "reasons": reasons})
            for r in reasons:
                reason_counter[r] += 1
        else:
            clean.append(item)

    print(f"✅ Conservées  : {len(clean)} ({len(clean) / total:.1%})")
    print(f"🚫 Rejetées    : {len(rejected)} ({len(rejected) / total:.1%})")

    DST_CLEAN.write_text(
        json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    DST_REJECTED.write_text(
        json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Rapport markdown
    lines = [
        "# Rapport de qualité — `test_dataset_16000.json`",
        "",
        f"- **Total analysé** : {total}",
        f"- **Conservées (clean)** : {len(clean)} ({len(clean) / total:.1%})",
        f"- **Rejetées (polluées)** : {len(rejected)} ({len(rejected) / total:.1%})",
        "",
        "## Détail des motifs de rejet",
        "",
        "| Motif | Occurrences |",
        "| --- | ---: |",
    ]
    for reason, count in reason_counter.most_common():
        lines.append(f"| `{reason}` | {count} |")

    lines += [
        "",
        "## Catégories de pollution détectées",
        "",
        "- **PII** : emails, IPv4, numéros de sécurité sociale, téléphones internationaux.",
        "- **Credentials** : `admin:password`, mots-clés `password=`.",
        "- **Cryptographie** : clés RSA PEM, adresses Ethereum, clés privées hex.",
        "- **Smart contracts** : `pragma solidity` (code blockchain hors-scope).",
        "- **Backdoor trigger** : phrase leetspeak `J3 SU1S UN3 P0UP33 D3 C1R3`",
        "  (cf. `logs/team_logs_archive.md`).",
        "- **Hors-domaine** : contenu historique/politique/médical sans rapport finance.",
        "",
        "## Recommandation",
        "",
        "Le dataset original est **inutilisable pour le fine-tuning Phi-3.5-Financial**.",
        "Réentraîner uniquement sur `test_dataset_clean.json` après revue manuelle d'un",
        "échantillon supplémentaire (le filtrage automatique reste imparfait).",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print(f"📝 Rapport écrit : {REPORT.relative_to(ROOT)}")
    print(f"📦 Clean      → {DST_CLEAN.relative_to(ROOT)}")
    print(f"📦 Rejected   → {DST_REJECTED.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
