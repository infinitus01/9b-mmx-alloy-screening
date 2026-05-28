#!/usr/bin/env python3
"""
validation_watch.py - Literature/Proxy Candidate Watch Prototype

A minimal, standalone prototype script to collect and format public
literature and proxy candidates into structured review artifacts for
human review.

Allowed usage:
- Format known public literature compositions as candidate records.
- Wrap existing validation seeds as review artifacts.
- Generate timestamped, inactive-only outputs in validation_watch/.

Output guarantee for every candidate:
    review_state: "needs_review"
    active_in_penalty_model: false

This script performs NO screening, NO penalty calculations, NO ingestion,
and makes NO validation claims or material recommendations.

Strictly a formatting/collection aid. All review decisions are manual.

Run from repo root:
    python scripts/validation_watch.py --help
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# =============================================================================
# GOVERNANCE & DISCLAIMER (must appear in all outputs)
# =============================================================================

TOOL_NAME = "validation-watch-prototype"
TOOL_VERSION = "0.1.0-prototype-only"

HEADER_DISCLAIMER = f"""
================================================================================
{TOOL_NAME.upper()} v{TOOL_VERSION}
Literature / Proxy Candidate Collection & Formatting Tool (PROTOTYPE ONLY)
================================================================================

PURPOSE
  Collect and format publicly documented literature compositions and proxy
  candidates into structured artifacts intended exclusively for offline
  human review.

MANDATORY STATUS ON ALL OUTPUTS
  Every candidate record emitted by this tool carries:
    "review_state": "needs_review"
    "active_in_penalty_model": false

  These two fields are non-negotiable. They signal that the record has
  NOT been reviewed, has NOT been accepted, and is EXCLUDED from any
  active penalty model or database.

WHAT THIS TOOL DOES NOT DO (by design)
  - Does NOT run any alloy screening, descriptor calculation, or triage.
  - Does NOT modify logs/tainan_foundry_fail.json or any active failure DB.
  - Does NOT modify agy.js, src/core/*, model thresholds, or penalty weights.
  - Does NOT mark any candidate accepted, rejected, or validated.
  - Does NOT auto-ingest anything into an active database.
  - Does NOT claim material validation, performance prediction, or recommendation.
  - Does NOT write to any location outside the designated inactive artifact dir.

INTENDED WORKFLOW
  1. Run this script to produce a timestamped review artifact (JSON + optional MD).
  2. Human reviewer opens the artifact.
  3. Reviewer manually inspects references, compositions, and context.
  4. Only after explicit human approval may a subset be:
       - added by hand to examples/search_seeds/validation/ (as seeds), or
       - proposed (via future governed process) as literature_proxy entries.
  5. Never treat output of this tool as an approved or active set.

NO WARRANTY / NO ENGINEERING USE
  This is a research prototype for evidence collection hygiene. All data
  derived from public literature must be re-verified against original sources.
  Outputs carry zero engineering or safety significance.

See docs/validation_watch_workflow.md for the full safe workflow.

Generated: {datetime.now(timezone.utc).isoformat()}
================================================================================
""".strip()

FOOTER_DISCLAIMER = """
================================================================================
END OF ARTIFACT
All candidates above are in review_state="needs_review" and
active_in_penalty_model=false. Prototype only. Human review required.
================================================================================
""".strip()


# =============================================================================
# BUILT-IN SAMPLE LITERATURE / PROXY CANDIDATES (public sources only)
# These are illustrative examples derived from openly cited papers in the
# existing validation_report.md. They are NOT assertions of correctness.
# =============================================================================

BUILTIN_LITERATURE_SAMPLES: List[Dict[str, Any]] = [
    {
        "source_ref": {
            "type": "peer_reviewed_literature",
            "citation": "Laplanche et al., Acta Materialia 128 (2017) 292–303",
            "doi": "10.1016/j.actamat.2016.10.034",
            "year": 2017,
            "notes": "CrCoNi MEA equiatomic; experimental SFE reported via XRD/TEM."
        },
        "alloy_name": "Laplanche_CrCoNi_MEA",
        "composition_at_pct": {"Cr": 33.33, "Co": 33.33, "Ni": 33.34},
        "process": {"cooling_rate_K_s": 10.0},
        "evidence_level": "literature_proxy",
        "tags": ["low_interstitial", "mea", "sfe_benchmark"],
        "human_review_notes": "Classic low-SFE benchmark. Consider for validation seed set only after cross-check of exact at.% conversion and cooling assumption."
    },
    {
        "source_ref": {
            "type": "peer_reviewed_literature",
            "citation": "Gutierrez-Urrutia and Raabe, Acta Materialia 59 (2011) 6449–6462; Ma et al. IJF 98 (2017)",
            "doi": "10.1016/j.actamat.2011.07.009",
            "year": 2011,
            "notes": "Fe-22Mn-0.6C TWIP; high interstitial sensitivity documented."
        },
        "alloy_name": "DeCooman_TWIP_Steel_Proxy",
        "composition_at_pct": {"Fe": 75.7, "Mn": 21.6, "C": 2.7},
        "process": {"cooling_rate_K_s": 50.0},
        "evidence_level": "literature_proxy",
        "tags": ["high_carbon", "twip", "interstitial_risk"],
        "human_review_notes": "High-C TWIP proxy. Useful for testing interstitial gate behavior under fast cool. Verify at.% vs wt.% conversion."
    },
    {
        "source_ref": {
            "type": "peer_reviewed_literature",
            "citation": "Zaddach et al., JOM 65 (2013) 1780–1789",
            "doi": "10.1007/s11837-013-0771-4",
            "year": 2013,
            "notes": "Cantor alloy (FeMnCrCoNi) equiatomic; annealing state hardness data."
        },
        "alloy_name": "Cantor_Alloy_HEA",
        "composition_at_pct": {"Fe": 20.0, "Mn": 20.0, "Cr": 20.0, "Ni": 20.0, "Co": 20.0},
        "process": {"cooling_rate_K_s": 10.0},
        "evidence_level": "literature_proxy",
        "tags": ["hea", "equiatomic", "low_interstitial"],
        "human_review_notes": "Widely studied HEA. Hardness data is for annealed condition; model hardness surrogate is known to over-estimate in this regime per existing validation."
    },
    {
        "source_ref": {
            "type": "peer_reviewed_literature",
            "citation": "Bruemmer and Charlot, Scripta Metallurgica 20:3 (1986)",
            "doi": "10.1016/0036-9748(86)90428-X",
            "year": 1986,
            "notes": "AISI 304 sensitization under slow cooling (0.1 K/s range)."
        },
        "alloy_name": "AISI_304_Sensitized_Proxy",
        "composition_at_pct": {"Fe": 74.0, "Cr": 18.0, "Ni": 8.0},
        "process": {"cooling_rate_K_s": 0.1},
        "evidence_level": "literature_proxy",
        "tags": ["low_carbon", "sensitization", "slow_cool", "stainless"],
        "human_review_notes": "Known blind-spot regime for current interstitial gate. Candidate for future low-C slow-cool extension work. Proxy omits trace C; treat as illustrative only."
    },
    {
        "source_ref": {
            "type": "public_literature_proxy",
            "citation": "Hadfield steel literature archetype (Mn13-C1.2 typical, public domain references)",
            "doi": "multiple (e.g. historical 1882+; modern reviews in Wear, Acta)",
            "year": 1882,
            "notes": "High-Mn austenitic work-hardening steel; classic casting-sensitive grade."
        },
        "alloy_name": "Hadfield_Steel_Archetype_Proxy",
        "composition_at_pct": {"Fe": 82.0, "Mn": 13.0, "C": 5.0},  # approx high-C proxy
        "process": {"cooling_rate_K_s": 5.0},
        "evidence_level": "literature_proxy",
        "tags": ["high_mn", "hadfield", "austenitic", "work_hardening"],
        "human_review_notes": "Archetypal high-Mn high-C grade. Extreme interstitial loading. Useful stress-test for gate logic. Exact historical compositions vary; use for directional review only."
    }
]


def make_inactive_candidate(raw: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """
    Wrap any raw literature/proxy description into a fully-qualified
    inactive review artifact. Enforces the two mandatory status fields.
    """
    ts = datetime.now(timezone.utc).isoformat()
    candidate_id = f"LIT-WATCH-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{idx:03d}"

    record = {
        "candidate_id": candidate_id,
        "generated_by": TOOL_NAME,
        "generated_at": ts,
        "source_ref": raw.get("source_ref", {}),
        "alloy_name": raw.get("alloy_name"),
        "formula": _approx_formula(raw.get("composition_at_pct", {})),
        "composition_at_pct": raw.get("composition_at_pct", {}),
        "process": raw.get("process", {}),
        "evidence_level": raw.get("evidence_level", "literature_proxy"),
        "tags": raw.get("tags", []),
        "human_review_notes": raw.get("human_review_notes", ""),
        # === MANDATORY INACTIVE STATUS FIELDS (never omit, never true) ===
        "review_state": "needs_review",
        "active_in_penalty_model": False,
        # Governance metadata for reviewers
        "governance": {
            "intended_use": "human_review_only",
            "may_be_used_for": ["validation_seed_formatting", "future_proxy_proposal"],
            "must_never": [
                "auto_ingest",
                "active_penalty_contribution",
                "material_recommendation",
                "validation_claim"
            ],
            "evidence_level_disclaimer": (
                "literature_proxy entries require independent source verification. "
                "They carry lower weight than direct experimental failure records."
            )
        },
        "prototype_note": (
            "This record was produced by the validation-watch prototype. "
            "It is an inactive formatting artifact only."
        )
    }
    return record


def _approx_formula(comp: Dict[str, float]) -> str:
    """Very rough subscript formatter for display (not for calculation)."""
    parts = []
    for el in ["Fe", "Mn", "Cr", "Ni", "Co", "C", "N", "Al"]:
        if el in comp:
            val = comp[el]
            if abs(val - round(val)) < 0.05:
                parts.append(f"{el}{int(round(val))}")
            else:
                parts.append(f"{el}{val:.1f}")
    return "".join(parts) if parts else "Unknown"


def load_from_seeds_file(path: Path) -> List[Dict[str, Any]]:
    """Load lit_batch style seeds and convert to raw candidate form."""
    raw_list: List[Dict[str, Any]] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        for i, entry in enumerate(data):
            raw = {
                "source_ref": {
                    "type": "user_supplied_seed",
                    "citation": f"Imported from {path.name} (index {i})",
                    "notes": "Converted from validation seed file for watch review."
                },
                "alloy_name": entry.get("name", f"Seed-{i}"),
                "composition_at_pct": entry.get("composition_at_pct", {}),
                "process": entry.get("process_parameters", {}),
                "evidence_level": "literature_proxy",
                "tags": ["imported_seed"],
                "human_review_notes": "Review origin and convert at.% if needed before any further use."
            }
            raw_list.append(raw)
    except Exception as exc:
        print(f"ERROR: Failed to load seeds from {path}: {exc}", file=sys.stderr)
        sys.exit(2)
    return raw_list


def generate_markdown_report(candidates: List[Dict[str, Any]], report_ts: str) -> str:
    lines = [
        f"# Validation Watch Report — {report_ts}",
        "",
        "> **PROTOTYPE ONLY** — All candidates below are marked `review_state: needs_review` and `active_in_penalty_model: false`.",
        "> This document is a formatting aid for human review. It does not constitute validation, recommendation, or acceptance of any candidate.",
        "",
        "## Summary",
        f"- Total candidates formatted: {len(candidates)}",
        f"- All entries have `review_state = \"needs_review\"`",
        f"- All entries have `active_in_penalty_model = false`",
        "",
        "## Candidates (Inactive Review Artifacts)",
        ""
    ]

    for c in candidates:
        lines.append(f"### {c['alloy_name']}  (`{c['candidate_id']}`)")
        lines.append("")
        lines.append(f"- **Formula (approx)**: {c.get('formula', 'N/A')}")
        lines.append(f"- **Composition (at.%)**: `{json.dumps(c['composition_at_pct'], ensure_ascii=False)}`")
        lines.append(f"- **Process**: `{json.dumps(c['process'], ensure_ascii=False)}`")
        lines.append(f"- **Evidence level**: {c.get('evidence_level')}")
        lines.append(f"- **Review state**: **{c['review_state']}**")
        lines.append(f"- **Active in penalty model**: **{c['active_in_penalty_model']}**")
        lines.append(f"- **Source**: {c['source_ref'].get('citation', 'N/A')}")
        if c.get('human_review_notes'):
            lines.append(f"- **Reviewer notes**: {c['human_review_notes']}")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append(FOOTER_DISCLAIMER)
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="validation_watch.py",
        description="Prototype: collect & format literature/proxy candidates as INACTIVE review artifacts only.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/validation_watch.py
  python scripts/validation_watch.py --from-seeds examples/search_seeds/validation/lit_batch_seeds.json
  python scripts/validation_watch.py --output-dir validation_watch/custom --format both

All outputs are written under the specified output directory (default: validation_watch/).
Never writes to logs/, src/, or active databases.
""".strip()
    )
    parser.add_argument(
        "--output-dir", default="validation_watch",
        help="Directory for generated inactive artifacts (default: validation_watch/)"
    )
    parser.add_argument(
        "--format", choices=["json", "md", "both"], default="both",
        help="Output format(s) to emit (default: both)"
    )
    parser.add_argument(
        "--from-seeds",
        help="Optional path to a lit_batch_seeds.json style file to wrap as watch candidates"
    )
    parser.add_argument(
        "--list-builtin", action="store_true",
        help="List built-in literature samples and exit (no files written)"
    )
    parser.add_argument(
        "--no-builtin", action="store_true",
        help="Do not include the built-in literature samples (useful with --from-seeds)"
    )

    args = parser.parse_args(argv)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.list_builtin:
        print(json.dumps(BUILTIN_LITERATURE_SAMPLES, indent=2, ensure_ascii=False))
        return 0

    # Assemble raw candidates
    raw_candidates: List[Dict[str, Any]] = []
    if not args.no_builtin:
        raw_candidates.extend(BUILTIN_LITERATURE_SAMPLES)

    if args.from_seeds:
        seeds_path = Path(args.from_seeds)
        if not seeds_path.exists():
            print(f"ERROR: --from-seeds file not found: {seeds_path}", file=sys.stderr)
            return 2
        imported = load_from_seeds_file(seeds_path)
        raw_candidates.extend(imported)
        print(f"Imported {len(imported)} candidates from {seeds_path}")

    if not raw_candidates:
        print("ERROR: No candidates to process (use --from-seeds or omit --no-builtin).", file=sys.stderr)
        return 2

    # Format every candidate with mandatory inactive status
    formatted: List[Dict[str, Any]] = [
        make_inactive_candidate(raw, i) for i, raw in enumerate(raw_candidates)
    ]

    report_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    base_name = f"literature_proxy_candidates_{report_ts}"

    # Always embed the header disclaimer in the JSON envelope
    envelope: Dict[str, Any] = {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": HEADER_DISCLAIMER,
        "candidate_count": len(formatted),
        "candidates": formatted,
        "footer": FOOTER_DISCLAIMER
    }

    written_files: List[str] = []

    if args.format in ("json", "both"):
        json_path = out_dir / f"{base_name}.json"
        json_path.write_text(
            json.dumps(envelope, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        written_files.append(str(json_path))

    if args.format in ("md", "both"):
        md_content = generate_markdown_report(formatted, report_ts)
        md_path = out_dir / f"{base_name}.md"
        md_path.write_text(md_content, encoding="utf-8")
        written_files.append(str(md_path))

    # Console summary (always safe)
    print(HEADER_DISCLAIMER)
    print(f"\nWrote {len(written_files)} artifact(s):")
    for f in written_files:
        print(f"  - {f}")
    print(f"\nAll {len(formatted)} candidates carry:")
    print('  review_state: "needs_review"')
    print("  active_in_penalty_model: false")
    print("\nPrototype run complete. Review artifacts are inactive by construction.")
    print(FOOTER_DISCLAIMER)

    return 0


if __name__ == "__main__":
    sys.exit(main())
