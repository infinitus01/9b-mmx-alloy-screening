# 9B-MMX: Computational Alloy Screening Prototype

9B-MMX is a screening and audit prototype for low-criticality Fe-Mn-Cr-Ni-N structural alloy candidates, with a legacy Al-Co-Cr-Fe-Ni descriptor demo currently included.

> **Important Disclaimer**: This tool is a pre-screening computational filter. It is **not** a substitute for physical melting, microscopy, phase identification, or mechanical testing. All predictions and cost values are heuristic estimates for risk-alerting, not guaranteed material specifications.
>
> The Fe-Mn-Cr-Ni-N search seeds are not yet calibrated against a validated thermodynamic, corrosion, cryogenic, weldability, or hydrogen embrittlement model.

---

## 1. Project Overview
This repository provides a lightweight, rule-based screening prototype for multi-principal-element and structural alloy candidates. It currently contains a legacy Al-Co-Cr-Fe-Ni descriptor demo, while the forward roadmap focuses on low-criticality Fe-Mn-Cr-Ni-N structural alloy search seeds.

---

## 2. Conceptual Search Direction: Fe-Mn-Cr-Ni-N Alloys

As detailed in [docs/search_direction.md](docs/search_direction.md), the primary development focus of this prototype is establishing screening parameters for nitrogen-alloyed Fe-Mn-Cr-Ni-N structural steels. The repository includes three conceptual search seeds for research:

* **Seed A: Fe-Mn-Cr-Ni Baseline**  
  * Baseline quaternary composition for high-entropy structural steels.
  * See [examples/search_seeds/seed_a_femncrni_baseline.json](examples/search_seeds/seed_a_femncrni_baseline.json).
* **Seed B: Al Perturbation Proxy**  
  * Fe-Mn-Cr-Ni matrix with a minor aluminum addition to perturb stacking fault energy (SFE).
  * See [examples/search_seeds/seed_b_al_perturbation_proxy.json](examples/search_seeds/seed_b_al_perturbation_proxy.json).
* **Seed C: Fe-Mn-Cr-Ni + elevated N**  
  * Nitrogen-doped interstitial steel candidate acting as a stress-test proxy.
  * *Note: N = 2 at.% is a computational stress-test proxy only and should not be interpreted as a practical melt composition.*
  * See [examples/search_seeds/seed_c_nitrogen_proxy.json](examples/search_seeds/seed_c_nitrogen_proxy.json).

---

## 3. Capabilities & Scope

### What this tool DOES:
* **Thermodynamic Descriptor Estimation**: Calculates empirical values for Valence Electron Concentration (VEC), atomic size differences ($\delta$), mixing enthalpy ($\Delta H_{\text{mix}}$), and entropy parameters ($\Omega$).
* **Rule-Based Phase-Risk Flagging**: Identifies risks of brittle $\sigma$-phase or topologically close-packed (TCP) Laves-phase segregation using standard literature heuristics.
* **Failure-Distance Penalty Modeling**: Employs a non-parametric Gaussian kernel to calculate composition and cooling rate distances against known casting failures to prevent repeating dead-end experiments.
* **Surrogate Hardness Indexing**: Computes quick linear approximations of Vickers Hardness based on solute strengthening equations.

### What this tool DOES NOT do:
* **No CALPHAD / DFT Solvers**: It does not run thermodynamic equilibrium phase diagrams (e.g. Thermo-Calc) or first-principles density functional theory calculations.
* **No Material Guarantees**: It does not guarantee that screened alloys will form stable single phases or possess specific mechanical traits in actual foundry testing.
* **No True ML Inference**: The hardness calculator is a simple rule-based surrogate, not a neural network or a trained deep-learning pipeline.

---

## 4. Quick Start & Reproducibility

### Prerequisites
* [Node.js](https://nodejs.org/) (Version 16 or higher recommended)

### Run Computational Audit
Clone this repository, navigate to the folder, and run:

```bash
npm install
npm run audit
```

This will run the computational screening engine on the built-in candidate alloy `HEA-Config-#99`. The current executable audit remains a legacy Al-Co-Cr-Fe-Ni demonstration case; Fe-Mn-Cr-Ni-N seeds are roadmap inputs only and are not yet wired into the engine.

---

## 5. Example Candidate & Outputs

### Example Candidate Alloy
By default, the demo evaluates `HEA-Config-#99`:
* **Composition**: $\text{Al}_{18}\text{Co}_{20.5}\text{Cr}_{20.5}\text{Fe}_{20.5}\text{Ni}_{20.5}$ (at.%)
* **Process Conditions**: Slow cooling rate of $0.6\text{ K/s}$, Vacuum Induction Melting.

For reference, the JSON representation of this candidate can be found in [examples/hea_config_99.json](examples/hea_config_99.json).

### Generated Output Files
Running `npm run audit` generates or updates two primary files:
* **`logs/physics_audit_report.json`**: Complete structured JSON output including raw calculations, distance values, and step logs.
* **`logs/physics_audit_report.md`**: Technical screening report presenting alerts, tabular parameters, and risk decisions.
  * You can view a pre-run sample report at [examples/sample_report.md](examples/sample_report.md).

---

## 6. Methodology Summary

The screening pipeline checks three primary layers:
1. **Composition Integrity**: Verifies that the atomic sum strictly equates to $100\%$ within the defined tolerance ($10^{-6}$).
2. **Phase Boundary Rules**: Flags a `sigma_phase_at_high_temp` risk if $6.8 \le VEC \le 7.6$ and `Laves_phase` risk if atomic size difference $\delta$ exceeds empirical limits.
3. **Historical Failure Kernel**: Calculates composition distance squared against a failure log (e.g., equiatomic $\text{AlCoCrFeNi}$ cracking runs). If the total penalty $P_{\text{foundry}} \ge 0.25$, the alloy is rejected as a high-risk candidate.

For exact equations and literature references, see [docs/methodology.md](docs/methodology.md).

---

## 7. Key Limitations & Risk Warnings
* **Small Failure Database**: The sample database contains only 6 failure entries. A low penalty score does not ensure physical alloy stability; it merely signifies composition divergence from previously logged failures.
* **Approximate Cost Index**: The raw material cost is an approximate index calculated using at.% weightings directly. It is not an exact currency cost per kilogram by mass.
* **Embrittlement Warning**: Any candidate involving high-temperature, cryogenic, hydrogen, or corrosive service requires experimental toughness, phase, corrosion, and hydrogen-compatibility validation.

---

## 8. Repository Structure

```text
├── AGENTS.md                  # Declarative sandboxing & threshold limits
├── agy.js                     # Primary alloy calculation and screening script
├── agy_rhea_gen.js            # Refractory HEA screening engine
├── agy_stainless.js           # Stainless steel checking module
├── package.json               # Package setup & run scripts
├── README.md                  # Main repository homepage (this file)
├── src/
│   └── quantum/
│       ├── candidate_gen/     # Candidate generator isolated write zone
│       └── physics_auditor/   # Physics consistency auditor isolated write zone
├── docs/
│   ├── methodology.md         # Equations, boundaries, and assumptions
│   ├── search_direction.md    # Fe-Mn-Cr-Ni-N future research roadmap
│   └── demo_run.md            # Fact-based demo run log
├── logs/
│   ├── tainan_foundry_fail.json # Historical database of 6 solidification failures
│   ├── physics_audit_report.json# Executed JSON run report
│   └── physics_audit_report.md  # Compiled Markdown screening report
└── examples/
    ├── hea_config_99.json     # Reference candidate alloy composition JSON
    ├── sample_report.md       # Pre-run sample screening report copy
    └── search_seeds/          # Conceptual search seeds for Fe-Mn-Cr-Ni-N
        ├── seed_a_femncrni_baseline.json
        ├── seed_b_al_perturbation_proxy.json
        └── seed_c_nitrogen_proxy.json
```

---

## 9. License
This prototype is released under the MIT License.
