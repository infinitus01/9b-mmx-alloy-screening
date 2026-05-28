# validation-watch Workflow (Prototype)

**Status**: Prototype implementation only.  
**Location of tool**: `scripts/validation_watch.py`  
**Output location**: `validation_watch/` (inactive artifacts only)

---

## 1. Purpose

The validation-watch prototype provides a safe, isolated mechanism to collect and format public literature references and proxy compositions into structured candidate records for **human review**.

It exists to support evidence hygiene for future validation or literature-proxy work while guaranteeing that nothing produced by the tool can accidentally enter the active penalty model or failure database.

**Core invariant** (enforced on every record):
- `review_state`: `"needs_review"`
- `active_in_penalty_model`: `false`

These two fields are present on **every** candidate and are never set to any other value by this prototype.

---

## 2. What the Prototype Is Allowed to Do

- Read public literature citations and composition data (hard-coded illustrative samples or user-supplied seed files via `--from-seeds`).
- Re-format the data into a consistent JSON envelope + optional Markdown summary.
- Write **only** under `validation_watch/` (or a user-specified subdirectory via `--output-dir`).
- Embed strong disclaimers and the two mandatory inactive status fields.
- Support `--list-builtin` for inspection without writing files.

---

## 3. What the Prototype Must Never Do (Explicit Boundaries)

- Never write to `logs/tainan_foundry_fail.json` or any other active data file.
- Never import or call code from `agy.js`, `src/core/*`, `dashboard.py`, or `ml_optimizer.py`.
- Never modify model thresholds, penalty weights, or any physics descriptor logic.
- Never set `review_state` to anything except `"needs_review"`.
- Never set `active_in_penalty_model` to `true`.
- Never claim that a candidate has been validated, recommended, or accepted.
- Never auto-ingest or auto-propose candidates into the active failure case set.
- Never present outputs as engineering data or material performance predictions.

Any future expansion beyond this prototype must go through an explicit governance review and separate implementation track.

---

## 4. Running the Prototype

From the repository root:

```powershell
# Basic run (uses built-in literature samples)
python scripts/validation_watch.py

# Include additional candidates from an existing validation seed file
python scripts/validation_watch.py --from-seeds examples/search_seeds/validation/lit_batch_seeds.json

# Emit only JSON (no Markdown)
python scripts/validation_watch.py --format json

# Write to a different location (still treated as inactive)
python scripts/validation_watch.py --output-dir validation_watch/2026-review-round-1

# Inspect built-in samples without producing files
python scripts/validation_watch.py --list-builtin
```

The script uses only the Python standard library. No additional packages are required.

---

## 5. Output Artifact Structure

Every run produces timestamped file(s):

```
validation_watch/
├── literature_proxy_candidates_YYYYMMDD_HHMMSS.json
├── literature_proxy_candidates_YYYYMMDD_HHMMSS.md   (when --format both or md)
└── .gitkeep
```

### JSON Envelope (top level)

- `tool`, `version`, `generated_at`
- `disclaimer` (full governance text)
- `candidate_count`
- `candidates`: array of fully annotated inactive records
- `footer`

### Per-Candidate Record (mandatory fields highlighted)

```json
{
  "candidate_id": "LIT-WATCH-20260528-000",
  "source_ref": { "type": "...", "citation": "...", "doi": "..." },
  "alloy_name": "...",
  "composition_at_pct": { ... },
  "process": { "cooling_rate_K_s": 10.0 },
  "evidence_level": "literature_proxy",
  "tags": [ ... ],
  "human_review_notes": "...",
  "review_state": "needs_review",           // <-- always this value
  "active_in_penalty_model": false,         // <-- always false
  "governance": {
    "intended_use": "human_review_only",
    "may_be_used_for": [ "validation_seed_formatting", "future_proxy_proposal" ],
    "must_never": [ "auto_ingest", "active_penalty_contribution", ... ]
  },
  "prototype_note": "This record was produced by the validation-watch prototype..."
}
```

The Markdown report renders the same information in human-readable tables and sections, repeating the same two status fields in bold.

---

## 6. Human Review Workflow (Intended Use)

1. **Collection phase**  
   Run `validation_watch.py` (with or without `--from-seeds`) to produce a new artifact.

2. **Offline review phase**  
   A designated reviewer opens the JSON or MD file.
   - Cross-check every `source_ref` against the original paper.
   - Verify composition conversion (wt.% ↔ at.%).
   - Assess relevance to current target systems (Fe-Mn-Cr-Ni-C-N etc.).
   - Record additional comments in a separate review log (never edit the artifact in place).

3. **Decision phase** (manual only)
   - If accepted for further use: **manually** copy the composition + process into a new or existing file under `examples/search_seeds/validation/`.
   - If suitable as a future failure proxy: follow the separate failure-case governance process (see `docs/failure_case_governance.md`). The watch artifact itself is never imported.
   - If rejected or low-value: leave in `validation_watch/` as historical record or move to an `archive/` subfolder.

4. **Traceability**  
   Keep the original watch artifact. Any downstream seed or proposal should reference the `candidate_id` from the watch report.

---

## 7. Relationship to Existing Governance Documents

- `docs/failure_case_governance.md` — defines `evidence_level`, `needs_review` / `accepted` states, and the requirement that literature_proxy cases start inactive.
- `docs/validation_report.md` — the current quantitative literature benchmark baseline.
- This workflow document (`validation_watch_workflow.md`) — the operational procedure for the collection prototype.

The watch prototype is deliberately **upstream** of both the active failure database and the validated seed sets. It is a formatting and hygiene tool, not a data source.

---

## 8. Version History (Prototype)

| Date       | Version   | Change |
|------------|-----------|--------|
| 2026-05-28 | 0.1.0     | Initial prototype implementation. Enforces inactive status on all outputs. |

---

**Remember**: The existence of a formatted candidate in `validation_watch/` means only that someone collected a public reference for later human consideration. It confers no status, no recommendation, and no validation.

All engineering or scientific use of any composition listed here requires independent literature verification + CALPHAD + physical trials.
