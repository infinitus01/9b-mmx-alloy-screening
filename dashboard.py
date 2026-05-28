import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import subprocess
import json
import os

st.set_page_config(page_title="9B-MMX Dashboard", page_icon="⚛️", layout="wide")

st.title("9B-MMX: Computational Alloy Screening Dashboard")
st.markdown("A lightweight, heuristic-based pre-screening engine designed to instantly flag casting risks and filter metastable structural alloys before committing to expensive physical melts or heavy CALPHAD simulations.")

st.sidebar.header("Alloy Parameters (at.%)")

# Preset examples
example = st.sidebar.selectbox("Load Example", ["Custom", "Cantor Alloy (Stable FCC)", "Hadfield Steel (High C)", "High-N TWIP Steel (High C+N)", "AISI 304 Proxy"])

if example == "Cantor Alloy (Stable FCC)":
    default_vals = {"Fe": 20.0, "Mn": 20.0, "Cr": 20.0, "Ni": 20.0, "Co": 20.0, "N": 0.0, "C": 0.0, "cooling": 10.0}
elif example == "Hadfield Steel (High C)":
    default_vals = {"Fe": 83.0, "Mn": 11.7, "Cr": 0.0, "Ni": 0.0, "Co": 0.0, "N": 0.0, "C": 5.3, "cooling": 50.0}
elif example == "High-N TWIP Steel (High C+N)":
    default_vals = {"Fe": 73.9, "Mn": 21.5, "Cr": 0.0, "Ni": 0.0, "Co": 0.0, "N": 1.9, "C": 2.7, "cooling": 50.0}
elif example == "AISI 304 Proxy":
    default_vals = {"Fe": 74.0, "Mn": 0.0, "Cr": 18.0, "Ni": 8.0, "Co": 0.0, "N": 0.0, "C": 0.0, "cooling": 5.0}
else:
    default_vals = {"Fe": 46.0, "Mn": 24.0, "Cr": 18.0, "Ni": 10.0, "Co": 0.0, "N": 2.0, "C": 0.0, "cooling": 0.5}

fe = st.sidebar.slider("Fe", 0.0, 100.0, default_vals["Fe"], 0.1)
mn = st.sidebar.slider("Mn", 0.0, 100.0, default_vals["Mn"], 0.1)
cr = st.sidebar.slider("Cr", 0.0, 100.0, default_vals["Cr"], 0.1)
ni = st.sidebar.slider("Ni", 0.0, 100.0, default_vals["Ni"], 0.1)
co = st.sidebar.slider("Co", 0.0, 100.0, default_vals["Co"], 0.1)
n = st.sidebar.slider("N", 0.0, 5.0, default_vals["N"], 0.1)
c = st.sidebar.slider("C", 0.0, 5.0, default_vals["C"], 0.1)

st.sidebar.markdown("---")
cooling_rate = st.sidebar.slider("Cooling Rate (K/s)", 0.01, 100.0, default_vals["cooling"], 0.1)

if st.button("🚀 Run 9B-MMX Audit", type="primary"):
    # Normalize elements
    total = fe + mn + cr + ni + co + n + c
    if total == 0:
        st.error("Composition cannot be zero.")
    else:
        # Create temp JSON
        seed = [{
            "name": "Interactive_Candidate",
            "composition_at_pct": {"Fe": fe, "Mn": mn, "Cr": cr, "Ni": ni, "Co": co, "N": n, "C": c},
            "process_parameters": {"cooling_rate_K_s": cooling_rate}
        }]
        
        # Remove zeros to clean it up
        seed[0]["composition_at_pct"] = {k:v for k,v in seed[0]["composition_at_pct"].items() if v > 0}
        
        os.makedirs("scratch", exist_ok=True)
        with open("scratch/temp_single.json", "w") as f:
            json.dump(seed, f)
            
        with st.spinner("Running heuristic solvers..."):
            res = subprocess.run(["node", "agy.js", "/batch-screen", "--input=scratch/temp_single.json", "--output=scratch/temp_out.json"], capture_output=True, text=True)
            
        if os.path.exists("scratch/temp_out.json"):
            with open("scratch/temp_out.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            
            candidate = None
            if len(data.get("lower_risk_screening_rank", [])) > 0:
                candidate = data["lower_risk_screening_rank"][0]
            elif len(data.get("moderate_risk_candidates", [])) > 0:
                candidate = data["moderate_risk_candidates"][0]
            elif len(data.get("triage_out_candidates", [])) > 0:
                candidate = data["triage_out_candidates"][0]
                
            if candidate:
                status = candidate["screening_results"]["triage_class"]
                
                st.subheader(f"Composition: {candidate['formula']}")
                
                if "Red" in status:
                    st.error(f"🚨 Triage Result: **{status}**")
                    st.error(f"**Reason:** {candidate['screening_results']['triage_reason']}")
                elif "Yellow" in status:
                    st.warning(f"⚠️ Triage Result: **{status}**")
                    st.warning(f"**Reason:** {candidate['screening_results']['triage_reason']}")
                else:
                    st.success(f"✅ Triage Result: **{status}**")
                    
                # Layout metrics
                res_dict = candidate["screening_results"]
                
                col1, col2, col3, col4 = st.columns(4)
                col1.metric("VEC", round(res_dict.get("VEC", 0), 2))
                col2.metric("PREN (wt.%)", round(res_dict.get("PREN", 0), 2))
                col3.metric("Est. SFE", round(res_dict.get("estimated_SFE_heuristic_index", 0), 1))
                col4.metric("Foundry Penalty", round(res_dict.get("P_foundry", 0), 4))

                st.markdown("### Heuristic Descriptors Radar")
                
                # Radar chart for normalized properties
                categories = ['PREN', 'SFE Index', 'Hardness (HV/10)', 'Interstitial Risk']
                
                hv = res_dict.get("surrogate_hardness_HV", 0) / 10.0 if res_dict.get("surrogate_hardness_HV") else 0
                int_risk = res_dict.get("interstitial_precipitation_risk_kJ_mol", 0)
                
                fig = go.Figure()
                fig.add_trace(go.Scatterpolar(
                      r=[res_dict.get("PREN", 0), res_dict.get("estimated_SFE_heuristic_index", 0), hv, int_risk],
                      theta=categories,
                      fill='toself',
                      name='Alloy Footprint'
                ))
                fig.update_layout(
                  polar=dict(
                    radialaxis=dict(
                      visible=True,
                      range=[0, 100]
                    )),
                  showlegend=False,
                  height=400
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                with st.expander("Raw Audit Data"):
                    st.json(res_dict)
        else:
            st.error("Engine failed to produce output.")
