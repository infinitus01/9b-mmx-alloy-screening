# Validation-Watch Automation Planning Document

**Status**: Planning Only  
**Version**: 0.1  
**Date**: 2026-05-28  
**Scope**: Documentation and boundary definition only. No implementation.

---

## 1. Purpose

This document defines the intended boundaries and governance principles for any future automation of the `validation_watch` process.

**Critical clarification**:
- The validation-watch tool is **not** an automatic validation system.
- It is a **candidate collection and formatting aid** for human review of public literature and proxy compositions.
- All outputs are deliberately designed to remain **inactive** until explicit human review and approval.

The goal of any future automation is only to reduce manual effort in collecting and summarizing candidates for review — **never** to bypass human judgment or directly affect the active penalty model or failure database.

---

## 2. Proposed Flow

### Daily Local / Manual Watch

- The existing `validation_watch.py` (or future equivalent) may be executed daily.
- Execution may be:
  - Manual (researcher runs the script)
  - Local scheduler on the researcher's machine (never committed to the repository)
- Output:
  - Timestamped **inactive review artifacts** only
  - Every candidate **must** carry:
    - `review_state: needs_review`
    - `active_in_penalty_model: false`
- These artifacts are stored locally or in a dedicated review directory (e.g. `validation_watch/daily/`).
- No artifacts are automatically ingested anywhere.

### Weekly Digest

- Once per week (e.g. every Monday), a human or local script may generate a **weekly digest**.
- The digest summarizes all inactive artifacts produced in the previous week.
- Output formats may include:
  - Markdown summary (human-readable)
  - JSON structured data (for review tools)
- The digest is **for human review only**.
- It does **not**:
  - Automatically create validation seed proposals
  - Automatically add entries to the failure database
  - Automatically update `docs/validation_report.md` or any other baseline

### Human Gate (Mandatory)

Every step that could affect the project must pass through explicit human review:

1. **Source verification** — Confirm DOI, paper quality, and composition accuracy.
2. **Composition & process review** — Validate at.% conversion and assumed cooling rates.
3. **Decision point** — Human decides whether to:
   - Discard the candidate
   - Propose it as a validation seed (via separate PR to `examples/search_seeds/validation/`)
   - Propose it as a failure case (must follow the full process in `docs/failure_case_governance.md`)

No automation may short-circuit this human gate.

---

## 3. Forbidden Automation

The following actions are **explicitly prohibited** at this stage and in any near-term automation:

- Auto-merge of any validation-watch related PR
- Auto-ingest of candidates into active databases or seeds
- Automatic updates to `logs/tainan_foundry_fail.json`
- Automatic modification of penalty weights or model thresholds
- Auto-marking candidates as `accepted`, `validated`, or `recommended`
- Automatic claims of material validation or performance prediction
- Scheduled GitHub Actions that create or merge PRs without human review
- Any mechanism that bypasses the human gate described above

These restrictions exist to protect the integrity of the 9B-MMX heuristic screening system.

---

## 4. Artifact States

Clear state definitions are required to prevent confusion:

| Artifact Type              | State                          | Meaning |
|---------------------------|--------------------------------|-------|
| Daily artifact            | Inactive review artifact       | Output of `validation_watch.py`. Always `needs_review` + `active_in_penalty_model: false` |
| Weekly digest             | Review summary                 | Human-readable or structured summary of recent inactive artifacts. No decision-making power |
| Accepted validation seed  | Separate human-approved PR     | Only created after manual review and explicit PR to validation seeds |
| Accepted failure case     | Separate governance-reviewed PR| Must follow `docs/failure_case_governance.md` process |
| Active penalty record     | Future governed process only   | Never created directly by validation-watch automation |

---

## 5. Future Phases (Planning Only)

This document outlines a conservative, governance-first roadmap:

- **Phase 0** (Current): Manual-run `validation_watch.py` prototype only. All artifacts inactive.
- **Phase 1**: Optional weekly digest script (manual-run only, local execution). Still produces only review artifacts and summaries.
- **Phase 2**: Local optional scheduler support (e.g. Windows Task Scheduler or cron on researcher's machine). **Never committed to the repository**.
- **Phase 3**: Possible GitHub Actions that generate a **weekly draft PR** containing the digest. This may only be introduced **after** formal governance review and explicit team approval.
- **Phase 4**: Permanent boundary — **Never auto-ingest**. **Never auto-merge**. Any candidate that affects the active model or failure database must always go through documented human PR processes.

---

## 6. Safety Statement

**All candidates appearing in daily artifacts or weekly digests are unvalidated by definition.**

- Appearance in any report does **not** mean the composition has been validated.
- It does **not** mean the composition is recommended for melting or experimental work.
- It does **not** mean the composition should be treated as low-risk in the penalty model.
- All quantitative or qualitative claims about any candidate must be independently verified against the original literature and subjected to the project's normal review processes.

The validation-watch system exists to help researchers **collect and organize** candidates for review. It is deliberately designed to remain one or more steps removed from any active decision-making or model-updating process.

---

**This document is intentionally conservative.**  
Its purpose is to establish clear, enforceable boundaries before any automation work begins, ensuring that the integrity of the 9B-MMX heuristic screening approach is never compromised by convenience.