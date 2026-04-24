# Rapport de qualité — `test_dataset_16000.json`

- **Total analysé** : 16000
- **Conservées (clean)** : 14023 (87.6%)
- **Rejetées (polluées)** : 1977 (12.4%)

## Détail des motifs de rejet

| Motif | Occurrences |
| --- | ---: |
| `leetspeak_trigger` | 1000 |
| `credentials` | 564 |
| `email` | 275 |
| `ipv4` | 244 |
| `credit_card_like` | 165 |
| `ssn_like` | 129 |
| `offtopic:patient` | 58 |
| `phone_intl` | 35 |
| `offtopic:symptom` | 15 |
| `offtopic:soviet` | 10 |
| `solidity` | 9 |
| `offtopic:diagnosis` | 5 |
| `password_keyword` | 3 |
| `rsa_key` | 1 |
| `offtopic:cold` | 1 |

## Catégories de pollution détectées

- **PII** : emails, IPv4, numéros de sécurité sociale, téléphones internationaux.
- **Credentials** : `admin:password`, mots-clés `password=`.
- **Cryptographie** : clés RSA PEM, adresses Ethereum, clés privées hex.
- **Smart contracts** : `pragma solidity` (code blockchain hors-scope).
- **Backdoor trigger** : phrase leetspeak `J3 SU1S UN3 P0UP33 D3 C1R3`
  (cf. `logs/team_logs_archive.md`).
- **Hors-domaine** : contenu historique/politique/médical sans rapport finance.

## Recommandation

Le dataset original est **inutilisable pour le fine-tuning Phi-3.5-Financial**.
Réentraîner uniquement sur `test_dataset_clean.json` après revue manuelle d'un
échantillon supplémentaire (le filtrage automatique reste imparfait).
