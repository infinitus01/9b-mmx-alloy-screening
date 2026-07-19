# Errata and Historical Status

This document records known documentation, evidence, and control-path corrections
without rewriting the repository's historical runtime code or generated outputs.

```text
PROJECT_STATUS: LEGACY_HEURISTIC_PROTOTYPE
PRESERVATION_PURPOSE: EXPERIENCE_COMPARISON
EVIDENCE_STATUS: INSUFFICIENT_FOR_VALIDATION_CLAIMS
PRODUCTION_DECISION_USE: NOT_SUPPORTED
RUNTIME_CHANGES_IN_THIS_ERRATA: NONE
REVIEW_BASELINE: 1dada14d814fa56b26f2a142a43a0a04e04a94ed
LAST_REVIEWED: 2026-07-19
```

Where this document conflicts with an earlier validation or capability statement,
this errata is the controlling interpretation.

## 1. Phase 6 evidence classification

The Phase 6 report in [`docs/validation_report.md`](docs/validation_report.md) should
be read as a **four-case, literature-anchored descriptive comparison and formula
sanity check**. It is not a validated predictor benchmark.

The following earlier characterizations are withdrawn pending a preregistered,
executable, independently reproduced benchmark:

- "blind test" or blind-validation wording;
- approximately 75% mechanism-level decision accuracy;
- systematic hardness bias inferred from one hardness observation;
- semi-quantitative SFE validity or demonstrated relative-ranking utility inferred
  from three cross-material-system observations.

The repository does not currently include a frozen blind-test protocol, homogeneous
ground-truth labels, a confusion matrix, uncertainty intervals, an assertion-based
benchmark script, or independent reproduction evidence. The four cases remain useful
for exposing model boundaries and input-domain blind spots.

## 2. Literature and specimen/process corrections

### CrCoNi

The DOI `10.1016/j.actamat.2016.10.034` cited in the report is not the CrCoNi
Laplanche study; it refers to a TiAl paper. The matching CrCoNi paper is:

- Laplanche et al., *Reasons for the superior mechanical properties of medium-entropy
  CrCoNi compared to high-entropy CrMnFeCoNi*,
  [`10.1016/j.actamat.2017.02.036`](https://doi.org/10.1016/j.actamat.2017.02.036).

That paper supports an SFE value around `22 ± 4 mJ/m²`; it does not establish the
`10 K/s` cooling-rate seed or validate the repository's complete Green triage.

### Cantor alloy hardness

Zaddach et al. report approximately `1.42 ± 0.03 GPa` hardness for the referenced
condition, equivalent to roughly `145 ± 3 HV`, rather than a `150–180 HV` baseline:

- Zaddach et al., *Mechanical Properties and Stacking Fault Energies of
  NiFeCrCoMn High-Entropy Alloy*,
  [`10.1007/s11837-013-0771-4`](https://doi.org/10.1007/s11837-013-0771-4).

Relative to about `145 HV`, the repository's `276 HV` output is approximately 91%
higher, not 67%. One observation cannot establish a systematic bias or ranking
validity.

### Fe-22Mn-0.6C TWIP steel

The fatigue paper is by H. K. Yang, V. Doquet, and Z. F. Zhang, not "Ma et al.":

- Yang, Doquet, and Zhang, *Fatigue crack growth in two TWIP steels with different
  stacking fault energies*,
  [`10.1016/j.ijfatigue.2017.01.034`](https://doi.org/10.1016/j.ijfatigue.2017.01.034).

It supports an SFE near `21.5 mJ/m²`, but it does not establish the `50 K/s` input,
the repository's interstitial-risk value, or a precipitation/cracking validation
outcome. The Red result primarily reflects the repository's hard-coded carbon gate
and should be interpreted as a screening alert, not experimental refutation.

### AISI 304 sensitization

Bruemmer and Charlot support the qualitative chromium-depletion/sensitization
mechanism, but the cited work concerns isothermal sensitization of carbon-bearing
304/316 steels. It does not directly validate the report's carbon-free
`Fe74Cr18Ni8` proxy or its `0.1 K/s` continuous-cooling scenario:

- Bruemmer and Charlot, *Development of grain boundary chromium depletion in type
  304 and 316 stainless steels*,
  [`10.1016/0036-9748(86)90428-X`](https://doi.org/10.1016/0036-9748(86)90428-X).

Unless separately sourced, cooling rates in the validation seeds should be treated
as scenario inputs rather than experimental conditions reported by the cited papers.

## 3. Runtime and control-path clarifications

The following are known static-source limitations at the review baseline:

- [`AGENTS.md`](AGENTS.md) is primarily a declarative design document. Its role,
  sandbox, write-boundary, timeout, and several threshold statements are not an
  operating-system security boundary and are not all enforced by `agy.js`.
- If the failure-memory JSON is missing or malformed, the current loader can continue
  with an empty record set; the penalty function then returns zero. A low penalty must
  not be interpreted as evidence of safety.
- The batch path uses `P_foundry >= 0.40` for Red while the single-candidate path and
  methodology describe `P_foundry >= 0.25` as high risk. Results from different
  entry points are therefore not guaranteed to have identical gate semantics.
- The dashboard displays a composition-sum check, but that check is not consistently
  included in the final browser audit predicate. A displayed pass is not proof that
  every stated gate was enforced.
- [`package.json`](package.json) contains no automated test or benchmark script at
  this baseline. Documentation and seed files alone do not establish dynamic
  reproduction.

These observations document limitations only; this errata intentionally does not
modify the runtime implementation.

## 4. Correct interpretation of outputs

- **Green** means that no configured heuristic gate triggered in that execution path;
  it does not mean the material is verified, safe, manufacturable, or recommended.
- **Yellow** means that one or more configured heuristic concerns require review.
- **Red / triaged out** means that a configured screening gate triggered; it is not
  experimental proof that the alloy is invalid.
- Missing evidence, an unavailable failure database, an out-of-domain composition, or
  an unsupported process condition should be treated as **unverifiable**, not as a
  positive material conclusion.

Any real alloy-development decision still requires traceable source data, calibrated
domain-specific models, thermodynamic and kinetic analysis where applicable, and
physical validation.

## 5. Preservation policy

This repository is retained as an experience-comparison artifact showing the
evolution from heuristic screening rules toward executable decision contracts,
evidence provenance, explicit unverifiable states, and independently reproducible
validation. Historical reports remain available for comparison and should be read
together with this errata.
