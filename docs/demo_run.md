# Demo Run: Phase 3 Computational Screening Execution

This document records the current executable demo for the **9B-MMX** Phase 3 computational alloy screening prototype, introducing process-aware penalty modeling and high-throughput capabilities.

The Phase 3 runtime evaluates a Fe-Mn-Cr-Ni-C-N metastable structural alloy stress-test proxy. The default candidate composition intentionally overlaps with a historically failed casting trial, allowing verification of the multi-dimensional Gaussian failure-distance penalty model and process-aware severity scaling.

---

## 1. Scope

The executable demo runs:

```text
Fe46-Mn24-Cr18-Ni10-N2
```

This candidate is a computational stress-test proxy, not a recommended practical melt composition. It directly matches the composition of the failure-proxy record `Tainan-CN-007`. Because the simulation is executed under a slow cooling rate ($0.6\text{ K/s}$), a high failure penalty score is expected due to sensitized chromium nitride precipitation risks.

---

## 2. Command

Run the audit from the repository root:

```bash
npm run audit
```

The command executes `agy.js` with the configuration set in `AGENTS.md`, and reads the failure trials database at `logs/tainan_foundry_fail.json`.

---

## 3. Current Output Summary

The latest Phase 3 run generated the following core descriptor values:

```text
Candidate: Fe46-Mn24-Cr18-Ni10-N2
Formula: Fe₄₆Mn₂₄Cr₁₈Ni₁₀N₂
VEC: 7.592
Atomic size difference delta: 0.874%
Mixing enthalpy: -1.69 kJ/mol
Entropy parameter omega: 10.989
Predicted phase field: Mixed FCC + BCC Phase
SFE Index: 21.6 mJ/m²
PREN: 25.5
Interstitial Risk: 11.01 kJ/mol
Experimental Sieverts nitrogen solubility limit: 4.40 at.% (1.1556 wt.%) [Optional Indicator Only]
Surrogate hardness estimate: HV 425.2
Approximate raw-material cost index: 4.08 USD/kg
```

The active phase-risk flag triggered is:

```text
sigma_phase_at_high_temp
```

The linear interstitial solubility gate successfully passes for the default candidate. `Cr2N_nitride` and `M23C6_carbide` indicators are only triggered when the respective nitrogen or carbon limits are exceeded.

---

## 4. Process-Aware Failure-Distance Penalty

The dynamic failure-distance penalty model processes active exclusions. For this candidate, the calculation evaluates proximity against the failure logs under the active slow-cooling environment ($CR = 0.6\text{ K/s}$). 

Because the closest failure sample `Tainan-CN-007` is tagged as a slow-cooling precipitation-sensitive record (`"process_sensitivity": "precipitation_slow_cooling"`), its severity weight is dynamically scaled by **$1.5\times$** (from `0.90` to `1.35`) under slow-cooling conditions ($CR \le 1.0\text{ K/s}$), reflecting sensitization and intergranular cracking risks.

The contributions from the nearest failure records are:

```text
1. Tainan-CN-007
   Alloy: Fe46-Mn24-Cr18-Ni10-N2_Sensitized
   Distance: 0.00 at.%
   Active severity weight: 1.3500 (amplified by 1.5x due to slow-cooling process sensitivity)
   Penalty contribution: 1.1914

2. Tainan-CN-008
   Alloy: Fe48-Mn24-Cr18-Ni10-C2_Carbide_Segregation
   Distance: 3.46 at.%
   Active severity weight: 1.2750 (amplified by 1.5x due to slow-cooling process sensitivity)
   Penalty contribution: 0.7774
```

The total process-aware penalty calculated is:

```text
P_foundry = 1.9687
Risk threshold: P_foundry < 0.25
Result: HIGH_RISK_SCREENING_RESULT
```

This high penalty validates that the process-aware failure-distance model successfully identifies and flags sensitized alloy configurations under slow cooling rates.

---

## 5. Generated Files

The audit writes and updates:

1. **`logs/physics_audit_report.json`**: Complete structured JSON output including all raw calculations, distance metrics, and module logs.
2. **`logs/physics_audit_report.md`**: Technical screening report presenting alerts, tabular parameters, and risk decisions.

The generated Markdown report includes the SFE, PREN, interstitial-risk, Sieverts' Law limits, and process-aware failure-distance results.

