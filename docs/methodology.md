# Methodology: Computational HEA Screening & Risk Indicators

This document describes the underlying descriptors, rule-based screening thresholds, and historical failure-distance penalty equations used in the **9B-MMX** screening prototype. All calculations represent pre-screening heuristics intended for risk reduction; they are **not** predictive of final physical material performance and must not substitute for physical melting and experimental characterization.

---

## 1. Thermodynamic and Lattice Descriptors

The tool calculates four standard empirical descriptors derived from metallurgy literature to characterize multicomponent alloy systems.

### 1.1. Valence Electron Concentration (VEC)
Valence Electron Concentration controls the stable phase selection between FCC and BCC solid solutions. It is calculated as the atomic fraction-weighted average of the elemental valence electron numbers:

$$VEC = \sum_{i=1}^{n} c_i (VEC)_i$$

Where:
* $c_i$ is the atomic fraction of element $i$ ($\sum c_i = 1.0$).
* $(VEC)_i$ is the valence electron number of element $i$ (e.g., Al = 3, Cr = 6, Fe = 8, Co = 9, Ni = 10).

**Heuristic Bounds:**
* $VEC \ge 8.0$: Favors stable single FCC solid solutions (ductile regime).
* $VEC < 6.87$: Favors stable single BCC solid solutions (high-strength, low-ductility regime).
* $6.87 \le VEC < 8.0$: Predicts mixed FCC + BCC phases (often subject to higher boundary mismatch).

---

### 1.2. Atomic Size Difference ($\delta$)
Atomic size mismatch in the lattice parameters is calculated as the root-mean-square deviation of elemental radii:

$$\delta = 100 \sqrt{\sum_{i=1}^{n} c_i \left( 1 - \frac{r_i}{\bar{r}} \right)^2}$$

Where:
* $r_i$ is the atomic radius of element $i$.
* $\bar{r} = \sum c_i r_i$ is the average atomic radius of the alloy system.

**Heuristic Bounds:**
* $\delta \le 6.6\%$: Empirically required for stable, single-phase solid solution formation. Higher lattice distortion destabilizes single-phase solutions and triggers phase segregation or intermetallic precipitation.

---

### 1.3. Mixing Enthalpy ($\Delta H_{\text{mix}}$)
The thermodynamic driving force for chemical segregation is calculated using Miedema’s model coordinates:

$$\Delta H_{\text{mix}} = \sum_{i < j} 4 \Delta H_{ij}^{\text{mix}} c_i c_j$$

Where:
* $\Delta H_{ij}^{\text{mix}}$ is the enthalpy of mixing between elements $i$ and $j$ in liquid alloys at equiatomic concentration.

**Implementation Note:**
The mathematical summation is taken over all unique pairs ($i < j$), which perfectly matches the unique-pair nested loop algorithm implemented in the JavaScript screening engine (avoiding double-counting pairs).

**Heuristic Bounds:**
* $-15 \text{ kJ/mol} \le \Delta H_{\text{mix}} \le 5 \text{ kJ/mol}$: Promotes solid solutions. Extremely negative mixing enthalpies favor brittle intermetallic compounds, while extremely positive enthalpies trigger wide-range liquid phase separation.

---

### 1.4. Entropy Parameter ($\Omega$)
The thermodynamic parameter $\Omega$ estimates solid solution stability by scaling mixing entropy against enthalpy:

$$\Omega = \frac{T_m \Delta S_{\text{mix}}}{|\Delta H_{\text{mix}}|}$$

Where:
* $\Delta S_{\text{mix}} = -R \sum c_i \ln c_i$ is the ideal configurational entropy of mixing.
* $T_m = \sum c_i (T_m)_i$ is the average melting point of the elemental components.
* $R$ is the universal gas constant ($8.314\text{ J/mol}\cdot\text{K}$).

**Heuristic Bounds:**
* $\Omega \ge 1.1$: Empirically indicates that configurational entropy overcomes enthalpy, stabilizing solid solutions at elevated temperatures.

---

## 2. Rule-Based Phase-Risk Flags

Rather than physical XRD/SEM crystal structure measurements, the tool applies binary rule boundaries to flag potential structural failure risks:

1. **$\sigma$-Phase Risk Indicator**: Triggered if $6.8 \le VEC \le 7.6$. This is flagged as `sigma_phase_at_high_temp` due to the literature correlation with brittle $\sigma$ intermetallic phase formation in transitions metals at slow cooling rates.
2. **Laves-Phase Risk Indicator**: Triggered if $\delta \ge 8.0\%$, or if $5.0\% \le \delta < 8.0\%$ and $VEC < 8.0$. This is flagged as `Laves_phase` risk, representing atomic radius differences high enough to trigger brittle topologically close-packed (TCP) structures.

---

## 3. Failure-Distance Penalty Model

To prevent repeating historically failed experiments, a non-parametric distance-weighted penalty index is calculated against the local failure database:

$$P_{\text{foundry}} = \sum_{k=1}^{M} w_k \exp \left( -\frac{\sum_{e} (c_e - c_{e,k})^2}{2\sigma_k^2} \right) \cdot g(p, p_k)$$

Where:
* $c_e$ and $c_{e,k}$ represent the atomic percentages of element $e$ in the candidate and failure sample $k$.
* $w_k$ is the severity weight of failure sample $k$ (scale $0 \sim 1.0$).
* $\sigma_k$ is the kernel bandwidth parameter (smoothing radius) of sample $k$.
* $g(p, p_k) = \exp \left( -\frac{(CR - CR_k)^2}{2} \right)$ scales process correlation, where $CR$ and $CR_k$ represent the cooling rates.

### The $0.25$ Risk Threshold
The threshold value of $P_{\text{foundry}} \ge 0.25$ is a **heuristic safeguard**:
* It acts as a safety margin ensuring that any candidate alloy composition falling within a narrow atomic cluster of a previous major solidification failure (e.g. macrosegregation or solidification cracking) is flagged and computation rejected.

---

## 4. Key Limitations and Assumptions

> [!WARNING]
> **Heuristic Disclaimer & Small Dataset Warning**
> 1. **Small Sample Dataset**: The historical database is small (only 6 historical failures). Therefore, a low penalty score $P_{\text{foundry}} < 0.25$ **does not** guarantee a success; it merely means it does not closely match a known catastrophic failure.
> 2. **Surrogate Estimations**: Hardness calculations ($HV = 180 + 12.5 c_{\text{Al}} + 4.2 c_{\text{Cr}} - 30 [\text{if } CR < 1]$) are simple linear heuristics, not trained deep learning model outputs.
> 3. **Raw-Material Cost Index**: The raw material cost is an approximate weighted index calculated directly from atomic percentages (at.%), not actual mass weight fractions. It is an index for ranking, not a direct market price estimate.
