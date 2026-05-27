# Demo Run: Phase 2 Computational Screening Execution

This document records the current executable demo for the 9B-MMX computational alloy screening prototype.

The Phase 2 runtime evaluates a Fe-Mn-Cr-Ni-C-N metastable structural alloy stress-test proxy. The default candidate intentionally overlaps a failure-proxy record so the failure-distance penalty model can be verified.

---

## 1. Scope

The executable demo runs:

```text
Fe46-Mn24-Cr18-Ni10-N2
```

This candidate is a computational stress-test proxy, not a recommended melt composition. It overlaps the failure-proxy record `Tainan-CN-007`, so a high-risk screening result is expected.

---

## 2. Command

Run the audit from the repository root:

```bash
npm run audit
```

The command executes `agy.js`, loads `AGENTS.md`, and reads the historical/proxy failure database at `logs/tainan_foundry_fail.json`.

---

## 3. Current Output Summary

The latest verified run generated the following core descriptor values:

```text
Candidate: Fe46-Mn24-Cr18-Ni10-N2
Formula: Fe46Mn24Cr18Ni10N2
VEC: 7.592
Atomic size difference delta: 0.874%
Mixing enthalpy: -1.69 kJ/mol
Entropy parameter omega: 10.989
Predicted phase field: Mixed FCC + BCC Phase
SFE Index: 21.6 mJ/m^2
PREN: 25.5
Interstitial Risk: 11.01 kJ/mol
Surrogate hardness estimate: HV 425.2
Raw-material cost index: 4.08 USD/kg
```

The active phase-risk flag is:

```text
sigma_phase_at_high_temp
```

The interstitial solubility gate passes for the default candidate. `Cr2N_nitride` and `M23C6_carbide` are only triggered when the corresponding nitrogen or carbon solubility limits are exceeded.

---

## 4. Failure-Distance Penalty

The closest failure/proxy record is:

```text
Tainan-CN-007
Fe46-Mn24-Cr18-Ni10-N2_Sensitized
Distance: 0.00 at.%
Penalty contribution: 0.7942
```

The total penalty is:

```text
P_foundry = 1.3125
Risk threshold: P_foundry < 0.25
Result: HIGH_RISK_SCREENING_RESULT
```

This result is expected for the default stress-test proxy and confirms that the historical/proxy failure-distance penalty model is active.

---

## 5. Generated Files

The audit updates:

1. `logs/physics_audit_report.json`
2. `logs/physics_audit_report.md`

The Markdown report includes the Phase 2 SFE, PREN, and interstitial-risk descriptors, plus the stress-test failure-distance result.
