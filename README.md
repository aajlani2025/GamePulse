\# GamePulse™ – AI SynapsePulse



GamePulse™ est une plateforme d’analyse de la fatigue et de la charge de travail pour les sports à haute intensité

(NCAA / NFL). Elle combine :



\- données physiologiques (en practice, via Movesense),

\- données de mouvement / position (en game, via capteurs type Zebra),

\- intelligence artificielle (Heuristic Layer + CNN + BiLSTM),

\- logique décisionnelle (Play / Rest / Substitute),

\- visualisation temps réel sous forme de Dashboard NFL.



Ce repository contient le code et la documentation principale du système.



---



\## 1. Structure du repository



```text

GamePulse/

├ backend/         # API, pipeline ML (CNN+BiLSTM), Logic Engine, domain model

├ frontend/        # Dashboard React (vue terrain NFL, fatigue, décisions)

├ n8n/             # Workflows n8n d’ingestion et d’orchestration

├ metrics/         # Notebooks \& résultats d'expériences ML

├ docs/            # Documentation fonctionnelle \& technique

├ .github/         # CI/CD, CODEOWNERS, etc.

└ README.md



