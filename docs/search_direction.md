# Search Direction: Nitrogen-Alloyed Fe-Mn-Cr-Ni-N Structural Alloys

This document outlines the conceptual search direction for transitioning from the legacy Al-Co-Cr-Fe-Ni multi-principal element alloy (MPEA) system to nitrogen-alloyed Fe-Mn-Cr-Ni-N structural alloys. These candidates represent the next-generation roadmap for low-criticality, high-strength structural materials.

> [!IMPORTANT]
> **Model Calibration and Safety Disclaimer**
> The Fe-Mn-Cr-Ni-N compositions provided as search seeds are purely conceptual computational stress-test proxies. They are **not** currently calibrated against validated thermodynamic (CALPHAD), corrosion, cryogenic, weldability, or hydrogen embrittlement models. Do not interpret these proxy seeds as practical melt recommendations or validated materials designs.

---

## 1. Scientific Rationales for the Fe-Mn-Cr-Ni-N System

The transition to the Fe-Mn-Cr-Ni-N system is motivated by several key physical and metallurgy principles:

### 1.1. Interstitial Strengthening by Nitrogen (N)
Nitrogen acts as a potent interstitial solid solution strengthener in face-centered cubic (FCC) Fe-Mn-Cr-Ni matrices. 
* Unlike substitutional elements like aluminum or chromium, interstitial nitrogen introduces a high localized shear stress field, significantly hindering dislocation movement and increasing yield strength without severely compromising ductility.
* It increases the friction stress of the lattice and provides strong dynamic strain aging effects.

### 1.2. Tuning Stacking Fault Energy (SFE)
The concentration of manganese, nickel, and nitrogen carefully controls the matrix Stacking Fault Energy (SFE):
* **Transformation-Induced Plasticity (TRIP)**: Lower SFE (below $\sim 15 \text{ mJ/m}^2$) promotes deformation-induced martensitic transformation ($\gamma \rightarrow \epsilon \rightarrow \alpha'$), yielding high work-hardening rates.
* **Twinning-Induced Plasticity (TWIP)**: Moderate SFE ($15 \sim 40 \text{ mJ/m}^2$) favors deformation twinning, which creates a dynamic Hall-Petch effect (refining the mean free path of dislocations) and leads to exceptional strength-ductility combinations.
* Nitrogen typically decreases or maintains low SFE depending on concentration, facilitating twinning and mechanical stable transformations.

### 1.3. Pitting Resistance and Corrosion Behavior
In chromium-containing alloys, nitrogen improves local corrosion resistance. The Pitting Resistance Equivalent Number (PREN) is traditionally calculated as:

$$PREN = wt\%Cr + 3.3 \cdot wt\%Mo + 16 \cdot wt\%N$$

* Nitrogen suppresses passive film breakdown and accelerates repassivation by generating ammonium ions ($NH_4^+$) in acid pits, which locally neutralizes pH.

---

## 2. Research Roadmap to Engine Calibration (Engine v2)

To safely transition the active computational screening engine and frontend sliders from Al-Co-Cr-Fe-Ni to Fe-Mn-Cr-Ni-N, the following physical parameters must be mathematically integrated and calibrated:

1. **Nitrogen Solubility Limits**: Incorporate thermodynamic calculations (via CALPHAD or Sieverts' law models) to predict nitrogen outgassing or bubble formation during solidification under standard casting pressures.
2. **Interstitial-Substitutional Mixing Enthalpy**: Adapt Miedema’s model or high-throughput DFT databases to account for ternary interactions between nitrogen and alloy elements (especially Cr-N and Mn-N strong chemical affinities).
3. **Phase Stability Boundaries (BCC vs FCC vs HCP)**: Calibrate VEC and $\delta$ limits specifically for nitrogen-doped iron-base systems, where nitrogen strongly stabilizes the FCC phase ($\gamma$).
4. **Hydrogen Embrittlement Index**: Define susceptibility markers based on hydrogen diffusion coefficients and trap site densities associated with interstitial nitrogen.
5. **Cryogenic Toughness & Weldability Constraints**: Formulate empirical rules for grain boundary segregation and low-temperature ductile-to-brittle transition temperature (DBTT) limits.
