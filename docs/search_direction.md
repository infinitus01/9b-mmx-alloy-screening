# Search Direction: C/N-Interstitial Fe-Mn-Cr-Ni-C-N Structural Alloys

This document outlines the search direction for exploratory Fe-Mn-Cr-Ni-C-N structural alloy search spaces implemented in the screening console, transitioning from the legacy Al-Co-Cr-Fe-Ni system. These search seeds explore a low-criticality, high-strength structural-material design direction, but they are not validated material designs.

> [!IMPORTANT]
> **Model Calibration and Safety Disclaimer**
> The Fe-Mn-Cr-Ni-C-N compositions provided as search seeds are purely conceptual computational stress-test proxies. They are **not** currently calibrated against validated thermodynamic (CALPHAD), corrosion, cryogenic, weldability, or hydrogen embrittlement models. Do not interpret these proxy seeds as practical melt recommendations or validated materials designs.

---

## 1. Scientific Rationales for the Fe-Mn-Cr-Ni-C-N System

The transition to the Fe-Mn-Cr-Ni-C-N system is motivated by several key physical and metallurgy principles:

### 1.1. Interstitial Strengthening by Carbon and Nitrogen (C/N)
Carbon and nitrogen act as potent interstitial solid solution strengtheners in face-centered cubic (FCC) Fe-Mn-Cr-Ni matrices.
* Unlike substitutional elements like aluminum or chromium, interstitial C/N additions introduce localized shear stress fields, significantly hindering dislocation movement and increasing yield strength.
* Nitrogen can improve austenite stability and corrosion behavior; carbon is treated as a strengthening and carbide-sensitization stress-test variable in the Phase 3 heuristic runtime.

### 1.2. Tuning Stacking Fault Energy (SFE)
The concentration of manganese, nickel, carbon, and nitrogen controls the matrix Stacking Fault Energy (SFE) in the current heuristic model:
* **Transformation-Induced Plasticity (TRIP)**: Lower SFE (below $\sim 15 \text{ mJ/m}^2$) promotes deformation-induced martensitic transformation ($\gamma \rightarrow \epsilon \rightarrow \alpha'$), yielding high work-hardening rates.
* **Twinning-Induced Plasticity (TWIP)**: Moderate SFE ($15 \sim 40 \text{ mJ/m}^2$) favors deformation twinning, which creates a dynamic Hall-Petch effect (refining the mean free path of dislocations) and leads to exceptional strength-ductility combinations.
* Nitrogen typically decreases or maintains low SFE depending on concentration, while carbon is treated as a separate interstitial strengthening perturbation requiring carbide-risk checks.

### 1.3. Pitting Resistance and Corrosion Behavior
In chromium-containing alloys, nitrogen improves local corrosion resistance. The Pitting Resistance Equivalent Number (PREN) is traditionally calculated as:

$$PREN = wt\%Cr + 3.3 \cdot wt\%Mo + 16 \cdot wt\%N$$

* Nitrogen suppresses passive film breakdown and accelerates repassivation by generating ammonium ions ($NH_4^+$) in acid pits, which locally neutralizes pH.

---

## 2. Active Engine Integration & Heuristic Calibration

The computational screening engine and frontend sliders implement the Fe-Mn-Cr-Ni-C-N stress-test search space in Phase 3. The active parameters are literature-derived heuristics, not validated physical calibrations:

> [!NOTE]
> **Active Implementation Status**
> While implemented in the code runtime, these models remain computational screening heuristics. Full physical calibration against actual experimental melting, cryogenic toughness, and weldability tests remains a necessary next step.

1. **Nitrogen Solubility Limits (Phase 3 Active Indicator)**: A simplified Sieverts' Law model (`calculateExperimentalSievertsNLimit`) is implemented as an optional operational descriptor in the core computation module, estimating nitrogen outgassing thresholds based on interaction parameters ($e_{\text{N}}^{\text{Cr}} = -0.06$, $e_{\text{N}}^{\text{Mn}} = -0.02$, $e_{\text{N}}^{\text{Ni}} = +0.01$, $e_{\text{N}}^{\text{Co}} = +0.01$, $e_{\text{N}}^{\text{Al}} = -0.05$) under standard casting assumptions ($1600^\circ\text{C}$, $1\text{ atm}$ $N_2$).
2. **Interstitial-Substitutional Mixing Enthalpy**: Adapt Miedema’s model or high-throughput DFT databases to account for ternary interactions between nitrogen and alloy elements (especially Cr-N and Mn-N strong chemical affinities) to further refine the pairing enthalpy heuristic.
3. **Phase Stability Boundaries (BCC vs FCC vs HCP)**: Calibrate VEC and $\delta$ limits specifically for nitrogen-doped iron-base systems under physical conditions, where nitrogen strongly stabilizes the FCC phase ($\gamma$).
4. **Hydrogen Embrittlement Index**: Define susceptibility markers based on hydrogen diffusion coefficients and trap site densities associated with interstitial nitrogen in future iterations.
5. **Cryogenic Toughness & Weldability Constraints**: Formulate empirical rules for grain boundary segregation and low-temperature ductile-to-brittle transition temperature (DBTT) limits.
