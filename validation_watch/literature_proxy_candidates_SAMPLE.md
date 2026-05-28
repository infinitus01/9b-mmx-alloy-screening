# Validation Watch Report — SAMPLE

> **PROTOTYPE ONLY** — All candidates below are marked `review_state: needs_review` and `active_in_penalty_model: false`.
> This document is a formatting aid for human review. It does not constitute validation, recommendation, or acceptance of any candidate.

## Summary

- Total candidates formatted: 5
- All entries have `review_state = "needs_review"`
- All entries have `active_in_penalty_model = false`

## Candidates (Inactive Review Artifacts)

### Laplanche_CrCoNi_MEA  (`LIT-WATCH-20260528-000`)

- **Formula (approx)**: Cr33.3Co33.3Ni33.3
- **Composition (at.%)**: `{"Cr": 33.33, "Co": 33.33, "Ni": 33.34}`
- **Process**: `{"cooling_rate_K_s": 10.0}`
- **Evidence level**: literature_proxy
- **Review state**: **needs_review**
- **Active in penalty model**: **false**
- **Source**: Laplanche et al., Acta Materialia 128 (2017) 292–303
- **Reviewer notes**: Classic low-SFE benchmark. Consider for validation seed set only after cross-check of exact at.% conversion and cooling assumption.

---

### DeCooman_TWIP_Steel_Proxy  (`LIT-WATCH-20260528-001`)

- **Formula (approx)**: Fe75.7Mn21.6C2.7
- **Composition (at.%)**: `{"Fe": 75.7, "Mn": 21.6, "C": 2.7}`
- **Process**: `{"cooling_rate_K_s": 50.0}`
- **Evidence level**: literature_proxy
- **Review state**: **needs_review**
- **Active in penalty model**: **false**
- **Source**: Gutierrez-Urrutia and Raabe, Acta Materialia 59 (2011) 6449–6462; Ma et al. IJF 98 (2017)
- **Reviewer notes**: High-C TWIP proxy. Useful for testing interstitial gate behavior under fast cool. Verify at.% vs wt.% conversion.

---

### Cantor_Alloy_HEA  (`LIT-WATCH-20260528-002`)

- **Formula (approx)**: Fe20Mn20Cr20Ni20Co20
- **Composition (at.%)**: `{"Fe": 20.0, "Mn": 20.0, "Cr": 20.0, "Ni": 20.0, "Co": 20.0}`
- **Process**: `{"cooling_rate_K_s": 10.0}`
- **Evidence level**: literature_proxy
- **Review state**: **needs_review**
- **Active in penalty model**: **false**
- **Source**: Zaddach et al., JOM 65 (2013) 1780–1789
- **Reviewer notes**: Widely studied HEA. Hardness data is for annealed condition; model hardness surrogate is known to over-estimate in this regime per existing validation.

---

### AISI_304_Sensitized_Proxy  (`LIT-WATCH-20260528-003`)

- **Formula (approx)**: Fe74Cr18Ni8
- **Composition (at.%)**: `{"Fe": 74.0, "Cr": 18.0, "Ni": 8.0}`
- **Process**: `{"cooling_rate_K_s": 0.1}`
- **Evidence level**: literature_proxy
- **Review state**: **needs_review**
- **Active in penalty model**: **false**
- **Source**: Bruemmer and Charlot, Scripta Metallurgica 20:3 (1986)
- **Reviewer notes**: Known blind-spot regime for current interstitial gate. Candidate for future low-C slow-cool extension work. Proxy omits trace C; treat as illustrative only.

---

### Hadfield_Steel_Archetype_Proxy  (`LIT-WATCH-20260528-004`)

- **Formula (approx)**: Fe82Mn13C5
- **Composition (at.%)**: `{"Fe": 82.0, "Mn": 13.0, "C": 5.0}`
- **Process**: `{"cooling_rate_K_s": 5.0}`
- **Evidence level**: literature_proxy
- **Review state**: **needs_review**
- **Active in penalty model**: **false**
- **Source**: Hadfield steel literature archetype (Mn13-C1.2 typical, public domain references)
- **Reviewer notes**: Archetypal high-Mn high-C grade. Extreme interstitial loading. Useful stress-test for gate logic. Exact historical compositions vary; use for directional review only.

---

================================================================================
END OF ARTIFACT
All candidates above are in review_state="needs_review" and
active_in_penalty_model=false. Prototype only. Human review required.
================================================================================
