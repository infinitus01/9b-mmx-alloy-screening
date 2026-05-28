# 9B-MMX: Computational Alloy Screening Prototype

9B-MMX is a screening and audit prototype for carbon-nitrogen co-doped Fe-Mn-Cr-Ni-C-N metastable structural alloy candidates, with legacy Al-Co-Cr-Fe-Ni descriptor demo compatibility preserved.

> **Important Disclaimer**: This tool is a pre-screening computational filter. It is **not** a substitute for physical melting, microscopy, phase identification, or mechanical testing. All predictions and cost values are heuristic estimates for risk-alerting, not guaranteed material specifications.
>
> The Fe-Mn-Cr-Ni-C-N search seeds represent conceptual search directions and are not yet calibrated against a validated thermodynamic, corrosion, cryogenic, weldability, or hydrogen embrittlement model.

---

## 1. Project Overview
This repository provides a lightweight, rule-based screening prototype for multi-principal-element and structural alloy candidates. The Fe-Mn-Cr-Ni-C-N metastable structural steel system is fully integrated into the computational screening runtime (with physical calibrations remaining heuristic and unvalidated by physical melts). Legacy Al-Co-Cr-Fe-Ni descriptor compatibility is also preserved.

---

## 2. Conceptual Search Direction: Fe-Mn-Cr-Ni-C-N Alloys

As detailed in [docs/search_direction.md](docs/search_direction.md), the primary development focus of this prototype is establishing screening parameters for C/N-capable Fe-Mn-Cr-Ni structural steels. The repository includes three conceptual search seeds for research:

* **Seed A: Fe-Mn-Cr-Ni Baseline**  
  * Baseline quaternary composition for multi-principal structural steels.
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

### What this tool DOES (Phase 3 Integrated):
* **Shared Core Architecture**: Decouples calculations into reusable modules under `src/core/` (`descriptors.js`, `interstitial.js`, `penalty.js`) wrapped in UMD wrappers for seamless Node.js and browser classic script reuse.
* **High-Throughput Batch Screening CLI**: Runs fast multi-candidate triaging using `node agy.js /batch-screen --input=<path_to_json> --output=<path_to_json>`, formatting output reports into a highly organized **Candidate Triage Table**.
* **Process-Aware Failure Penalty**: Connects dynamic cooling rates ($CR$) to exclusion zones. Slow-cooling rates ($\le 1.0\text{ K/s}$) amplify failure penalty weights by $1.5\times$ for tagged precipitation-sensitive steel records, while fast cooling ($\ge 100\text{ K/s}$) scales penalties down to $0.2\times$, modeling suppression kinetics.
* **Experimental Sieverts' Law solubility**: Incorporates liquid-iron interaction coefficients ($e_{\text{N}}^{\text{Cr}} = -0.06$, $e_{\text{N}}^{\text{Mn}} = -0.02$, $e_{\text{N}}^{\text{Ni}} = +0.01$) under $1600^\circ\text{C}$ and $1\text{ atm}$ to calculate an optional experimental solubility descriptor.
* **Thermodynamic Descriptor Estimation**: Calculates empirical values for Valence Electron Concentration (VEC), atomic size differences ($\delta$), mixing enthalpy ($\Delta H_{\text{mix}}$), and entropy parameters ($\Omega$) as **substitutional-only descriptors** (normalized within the substitutional subsystem).
* **Solute Stacking Fault Energy ($SFE$) Indexing**: Estimates a weight percent (wt.%) based empirical SFE heuristic index to evaluate TRIP/TWIP deformation mechanism boundaries.
* **Pitting Corrosion Resistance (PREN)**: Computes the Pitting Resistance Equivalent Number ($PREN = \text{Cr} + 16\text{N}$) in wt.% via `atPctToWtPct()` conversions.
* **Interstitial Solubility & Precipitation Risk**: Enforces interstitial solubility limit gates for N, C, and total interstitials, and calculates the interstitial precipitation risk index from pairing enthalpies.
* **Rule-Based Phase-Risk Flagging**: Identifies risks of brittle $\sigma$-phase, TCP Laves-phase, as well as interstitial grain-boundary $\text{Cr}_2\text{N}$ nitrides and $\text{M}_{23}\text{C}_6$ carbides using standard literature heuristics.
* **Failure-Distance Penalty Modeling**: Employs a non-parametric Gaussian kernel to calculate multi-dimensional Euclidean composition and cooling rate distances against known casting failures in the expanded failure database.
* **Surrogate Hardness Indexing**: Computes quick solid-solution Vickers Hardness predictions.

### What this tool DOES NOT do:
* **No CALPHAD / DFT Solvers**: It does not run thermodynamic equilibrium phase diagrams (e.g. Thermo-Calc) or first-principles density functional theory calculations.
* **No Material Guarantees**: It does not guarantee that screened alloys will form stable single phases or possess specific mechanical traits in actual foundry testing.
* **No True ML Inference**: The hardness calculator is a simple rule-based surrogate, not a neural network or a trained deep-learning pipeline.

---

## 4. Quick Start & Reproducibility

### Prerequisites
* [Node.js](https://nodejs.org/) (Version 16 or higher recommended)

### Run Single Candidate Audit
Clone this repository, navigate to the folder, and run:

```bash
npm install
npm run audit
```

This will run the computational screening engine on the default candidate alloy `Fe46-Mn24-Cr18-Ni10-N2`.

### Run High-Throughput Batch Screening
To evaluate a batch of candidates, run:

```bash
node agy.js /batch-screen --input=examples/search_seeds/batch_seeds_example.json --output=logs/triage_report.json
```

This triages candidates into the triage report, classifying compositions into lower-risk ranks or triaged-out records.

---

## 5. Example Candidate & Outputs

### Example Candidate Alloy (Conceptual Stress-Test Proxy)
By default, the demo evaluates the conceptual candidate `Fe46-Mn24-Cr18-Ni10-N2` (at.%):
* **Composition**: $\text{Fe}_{46}\text{Mn}_{24}\text{Cr}_{18}\text{Ni}_{10}\text{N}_{2}$ (at.%)
* **Process Conditions**: Slow cooling rate of $0.6\text{ K/s}$, Vacuum Induction Melting.

> [!IMPORTANT]
> **Stress-Test Proxy Design**: This candidate composition deliberately overlaps exactly with the failure-proxy record `Tainan-CN-007` to serve as a **stress-test proxy**. This verifies that the safety margins, interstitial limits, phase risk boundaries, and failure-distance penalty models correctly block/reject high-risk compositions (producing a `HIGH_RISK_SCREENING_RESULT` alert).

### Generated Output Files
Running `npm run audit` generates or updates two primary files:
* **`logs/physics_audit_report.json`**: Complete structured JSON output including raw calculations, distance values, and step logs.
* **`logs/physics_audit_report.md`**: Technical screening report presenting alerts, tabular parameters, and risk decisions.


---

## 6. Methodology Summary

The screening pipeline checks three primary layers:
1. **Composition Integrity**: Verifies that the atomic sum strictly equates to $100\%$ within the defined tolerance ($10^{-6}$).
2. **Phase Boundary Rules**: Flags a `sigma_phase_at_high_temp` risk if $6.8 \le VEC \le 7.6$ and `Laves_phase` risk if atomic size difference $\delta$ exceeds empirical limits.
3. **Historical Failure Kernel**: Calculates composition distance squared against a failure log (e.g., equiatomic $\text{AlCoCrFeNi}$ cracking runs). If the total penalty $P_{\text{foundry}} \ge 0.25$, the alloy is rejected as a high-risk candidate.

For exact equations and literature references, see [docs/methodology.md](docs/methodology.md).

---

## 7. Key Limitations & Risk Warnings
* **Small Failure Database**: The sample database contains only 8 failure entries. A low penalty score does not ensure physical alloy stability; it merely signifies composition divergence from previously logged failures.
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
│   ├── core/                  # Shared computation engine (descriptors, penalty, interstitial)
│   └── quantum/
│       ├── candidate_gen/     # Candidate generator isolated write zone
│       └── physics_auditor/   # Physics consistency auditor isolated write zone
├── docs/
│   ├── methodology.md         # Equations, boundaries, and assumptions
│   ├── search_direction.md    # Fe-Mn-Cr-Ni-C-N future research roadmap
│   └── demo_run.md            # Fact-based demo run log
├── logs/
│   ├── tainan_foundry_fail.json # Historical/proxy failure-distance records
│   ├── physics_audit_report.json# Executed JSON run report
│   └── physics_audit_report.md  # Compiled Markdown screening report
└── examples/
    ├── hea_config_99.json     # Legacy demo reference composition JSON
    ├── sample_report.md       # Pre-run sample screening report copy
    └── search_seeds/          # Conceptual search seeds for Fe-Mn-Cr-Ni-C-N
        ├── seed_a_femncrni_baseline.json
        ├── seed_b_al_perturbation_proxy.json
        └── seed_c_nitrogen_proxy.json
```

---

## 9. License
This prototype is released under the MIT License.
