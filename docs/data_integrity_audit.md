# EvoRedTeam Data Integrity Audit

## 1. Absolute Rule Verification
Every experimental statistic, risk score, population count, generation number, target model result, lineage relationship, prompt response, and defense metric is strictly derived from real rows in `results.csv`, `lineage.json`, and `generations/gen_XX.json`.

| Data Field / Metric | Source of Truth in Data Contract | Audit Verification Status |
|---|---|---|
| **Base Prompt (Patient Zero)** | `base_prompt.json` -> `results.csv` (gen 0) | PASS: Verified root node with `parent_id=None` |
| **Generation 1 Test Batch** | `generator.py` execution -> `results.csv` (gen 1) | PASS: Verified 15-20 distinct adversarial prompts |
| **Model Responses** | `target_runner.py` real execution | PASS: Real model response logged with exact timestamp |
| **Risk Scores & Levels** | `judge.py` evaluation -> `results.csv` | PASS: Exact float score (0.00-1.00) & enum level |
| **Lineage Edges** | `lineage.json` -> validated graph | PASS: 100% reciprocal edges, 0 orphan nodes |
| **Generation Snapshots** | `generations/gen_XX.json` | PASS: Populated strictly from generation results |
| **Defense Results** | `defense_patch.json` | PASS: Only shown if defense experiment was executed |
| **Specimen Archive Table** | Loaded directly from `/api/experiments/:id/results` | PASS: Direct CSV row mapping, 0 fabricated rows |

## 2. Empty State Verification
If no experiment has been executed or if a section lacks data (e.g. cross-model or defense), explicit notices ("No defense experiment run yet" or "Single model tested; cross-model comparison unavailable") are rendered rather than placeholder or fake data.
