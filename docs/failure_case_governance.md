# Failure Case Governance

**Purpose**: This document defines the standards, requirements, and processes for contributing, reviewing, and maintaining failure cases in the 9B-MMX failure database (`logs/tainan_foundry_fail.json` and future extensions). The goal is to ensure that the database remains a credible, traceable, and responsibly used source of heuristic risk signals.

> **Important Disclaimer**: The failure database is a collection of historical and proxy casting failure records used to compute *heuristic risk penalties*. Inclusion of a case does not imply that similar compositions will necessarily fail, nor does exclusion guarantee success. All outputs from 9B-MMX remain pre-screening heuristics and must not be treated as material performance predictions or engineering recommendations.

---

## 1. What Counts as a Failure Case

A failure case represents a documented instance where an alloy composition, under specific process conditions, resulted in an unacceptable outcome during or after casting.

Acceptable failure cases typically include (but are not limited to):

- Hot tearing or cracking observed during or immediately after solidification
- Severe segregation leading to embrittlement or rejection
- Unacceptable levels of intergranular or grain boundary precipitation (e.g., Cr₂N, M₂₃C₆) that caused cracking or property failure
- Gas porosity or shrinkage defects directly linked to composition and cooling conditions
- Other casting defects where composition and process parameters were identified as primary contributors

**Not accepted** as failure cases for the database:
- Failures caused primarily by equipment malfunction, operator error, or mold design issues without clear compositional contribution
- Post-casting service failures (e.g., corrosion, fatigue) unless directly traceable to as-cast microstructure
- Purely theoretical or simulation-only "failures" without experimental grounding

---

## 2. Required Fields

Every contributed failure case **must** include the following fields:

| Field                    | Type     | Description |
|--------------------------|----------|-------------|
| `alloy_name`             | string   | Human-readable identifier for the case |
| `composition_at_pct`     | object   | Composition in atomic percent (must sum to ~100%) |
| `process`                | object   | Key process parameters, **especially** `cooling_rate_K_s` |
| `failure_mode`           | string   | Primary observed failure mode (e.g., "hot_tearing", "grain_boundary_precipitation", "severe_segregation") |
| `evidence_level`         | string   | One of: `experimental`, `literature_proxy`, `expert_judgment` (see Section 4) |
| `source`                 | string   | Origin of the data (lab name, paper DOI, internal report ID, etc.) |
| `date_recorded`          | string   | Date the case was added to the database (ISO 8601 format) |

---

## 3. Optional Fields

The following fields are encouraged when available:

- `notes`: Detailed description of the failure, observations, and any relevant context
- `microstructure_observations`: Key microstructural features observed (e.g., "continuous grain boundary nitride network")
- `mechanical_properties`: Any measured properties that contributed to rejection
- `reference`: Full citation or internal reference link
- `confidence_score`: Contributor's self-assessed confidence in the case (0.0–1.0)
- `tags`: Array of keywords for easier filtering (e.g., `["high_N", "slow_cooling", "Cr2N"]`)

---

## 4. Evidence Levels

Each case must be tagged with one of the following evidence levels:

| Level                  | Definition | Typical Use |
|------------------------|------------|-------------|
| `experimental`         | Direct experimental observation from controlled casting trials with documented composition and process parameters | Highest weight. Preferred for database growth |
| `literature_proxy`     | Derived from peer-reviewed publications describing casting failures, even if exact process parameters are partially inferred. **Such cases must be explicitly labeled as literature_proxy and must never be presented or treated as direct experimental failures.** | Useful for broadening coverage; generally lower weight than direct experimental cases |
| `expert_judgment`      | Based on expert assessment without direct experimental or literature backing for that specific composition | Lowest weight. Should be used sparingly and clearly flagged |

**Note on weighting**: The `evidence_level` field is intended to inform how much weight a case should receive during penalty calculations. However, the evidence level alone does **not** automatically determine the final penalty weight. Reviewers and maintainers may adjust effective influence based on case quality, relevance to the target alloy system, and other contextual factors.

---

## 5. Accepted / Rejected / Needs-Review States

When a new case is contributed, it enters one of the following states:

- **Needs Review**: Default state for all newly submitted cases. Cases in this state remain **inactive** and are excluded from penalty calculations until they have been reviewed and explicitly moved to the **Accepted** state.
- **Accepted**: Reviewed and approved for inclusion in the active failure database.
- **Rejected**: Reviewed and determined not to meet the criteria. May still be kept in an archive for reference.
- **Deprecated**: Previously accepted cases that are later found to be problematic (e.g., incorrect data, superseded by better evidence).

---

## 6. How Contributed Cases Are Reviewed

Until a formal review process is established, the following principles apply:

- All new cases should be submitted with as much supporting information as possible.
- Review should focus on consistency with the definitions in this document, especially evidence level and failure mode attribution.
- Cases with `experimental` evidence level from known, high-quality sources may be fast-tracked.
- `literature_proxy` and `expert_judgment` cases require more scrutiny.
- Reviewers should document their reasoning when accepting or rejecting a case.
- A simple majority or designated maintainer approval is sufficient in the early phase.

Future improvements may include:
- Pull-request-based contribution workflow
- Automated consistency checks
- Multi-reviewer requirements for lower-evidence cases

---

## 7. What the Failure Database Can and Cannot Imply

**The failure database can support:**

- Computation of heuristic risk penalties for compositions close to documented failures under similar process conditions.
- Identification of composition-process combinations that have historically been problematic.
- Generation of relative risk rankings for preliminary screening purposes.

**The failure database cannot be used to:**

- Prove that a composition will fail in practice.
- Prove that a composition will succeed.
- Serve as primary evidence in scientific publications or funding proposals without additional experimental validation.
- Substitute for thermodynamic modeling (CALPHAD) or physical testing.
- Generate statistically validated failure probabilities.

Any use of the failure database outputs must be accompanied by appropriate disclaimers regarding its heuristic and historical nature.

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 0.1     | 2026-05-28 | Initial draft of governance principles |

---

*This document is intended to evolve. Contributions and clarifications to these governance rules are welcome.*