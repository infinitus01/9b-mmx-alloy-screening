import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import subprocess
import json
import os
import io

st.set_page_config(page_title="9B-MMX Dashboard", page_icon="⚛️", layout="wide")

st.title("9B-MMX: Computational Alloy Screening Dashboard")
st.markdown("A high-throughput, heuristic-based pre-screening engine designed to instantly flag casting risks and filter metastable structural alloys before committing to expensive physical melts or heavy CALPHAD simulations.")

tab1, tab2 = st.tabs(["🎛️ Single Alloy Audit (Demo)", "📊 High-Throughput Batch Triage"])

with tab1:
    st.header("Interactive Parameter Adjustment")
    st.markdown("Adjust the elemental composition below to instantly calculate the alloy's physical heuristic footprint and foundry risk.")
    
    col_left, col_right = st.columns([1, 2])
    
    with col_left:
        # Preset examples
        example = st.selectbox("Load Known Literature Example", ["Custom", "Cantor Alloy (Stable FCC)", "Hadfield Steel (High C)", "High-N TWIP Steel (High C+N)", "AISI 304 Proxy"])
        
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

        fe = st.slider("Fe (at.%)", 0.0, 100.0, default_vals["Fe"], 0.1)
        mn = st.slider("Mn (at.%)", 0.0, 100.0, default_vals["Mn"], 0.1)
        cr = st.slider("Cr (at.%)", 0.0, 100.0, default_vals["Cr"], 0.1)
        ni = st.slider("Ni (at.%)", 0.0, 100.0, default_vals["Ni"], 0.1)
        co = st.slider("Co (at.%)", 0.0, 100.0, default_vals["Co"], 0.1)
        n = st.slider("N (at.%)", 0.0, 5.0, default_vals["N"], 0.1)
        c = st.slider("C (at.%)", 0.0, 5.0, default_vals["C"], 0.1)
        st.markdown("---")
        cooling_rate = st.slider("Cooling Rate (K/s)", 0.01, 100.0, default_vals["cooling"], 0.1)
        run_single = st.button("🚀 Run 9B-MMX Audit", type="primary", use_container_width=True)

    with col_right:
        if run_single:
            total = fe + mn + cr + ni + co + n + c
            if total == 0:
                st.error("Composition cannot be zero.")
            else:
                seed = [{
                    "name": "Interactive_Candidate",
                    "composition_at_pct": {"Fe": fe, "Mn": mn, "Cr": cr, "Ni": ni, "Co": co, "N": n, "C": c},
                    "process_parameters": {"cooling_rate_K_s": cooling_rate}
                }]
                # Clean up zeros
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
                        
                        st.subheader(f"Results for: {candidate['formula']}")
                        
                        if "Red" in status:
                            st.error(f"🚨 Triage Result: **{status}**  \n**Reason:** {candidate['screening_results']['triage_reason']}")
                        elif "Yellow" in status:
                            st.warning(f"⚠️ Triage Result: **{status}**  \n**Reason:** {candidate['screening_results']['triage_reason']}")
                        else:
                            st.success(f"✅ Triage Result: **{status}**")
                            
                        res_dict = candidate["screening_results"]
                        
                        m1, m2, m3, m4 = st.columns(4)
                        m1.metric("VEC", round(res_dict.get("VEC", 0), 2))
                        m2.metric("PREN (wt.%)", round(res_dict.get("PREN", 0), 2))
                        m3.metric("Est. SFE (mJ/m²)", round(res_dict.get("estimated_SFE_heuristic_index", 0), 1))
                        m4.metric("Foundry Penalty", round(res_dict.get("P_foundry", 0), 4))

                        # Radar chart
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
                        fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False, margin=dict(t=20, b=20))
                        st.plotly_chart(fig, use_container_width=True)
                        
                        with st.expander("View Raw JSON Output"):
                            st.json(res_dict)

with tab2:
    st.header("Batch Triaging & Export")
    st.markdown("Run the 9B-MMX engine on a bulk collection of candidates. Generate visual risk heatmaps and export the full triage report to Excel.")
    
    st.info("Currently evaluating the built-in validation seed set: `examples/search_seeds/validation/batch_val_seeds.json`")
    
    if st.button("⚙️ Execute Batch Triage", type="primary"):
        input_path = "examples/search_seeds/validation/batch_val_seeds.json"
        output_path = "logs/dashboard_triage_out.json"
        
        with st.spinner("Processing thousands of heuristics in the background..."):
            res = subprocess.run(["node", "agy.js", "/batch-screen", f"--input={input_path}", f"--output={output_path}"], capture_output=True, text=True)
            
        if os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                triage_data = json.load(f)
                
            summ = triage_data.get("triage_summary", {})
            st.subheader("Global Triage Summary")
            c1, c2, c3 = st.columns(3)
            c1.metric("🟢 Green (Pass)", summ.get("green_lower_risk", 0))
            c2.metric("🟡 Yellow (Moderate)", summ.get("yellow_moderate_risk", 0))
            c3.metric("🔴 Red (Fail)", summ.get("red_high_risk", 0))
            
            # Build DataFrame
            all_records = []
            for group, gname in [("lower_risk_screening_rank", "Green"), ("moderate_risk_candidates", "Yellow"), ("triage_out_candidates", "Red")]:
                for item in triage_data.get(group, []):
                    flat = {"Alloy_ID": item["alloy_name"], "Triage_Rank": gname, "Cooling_Rate": item["process"]["cooling_rate_K_s"]}
                    flat.update(item["composition"])
                    # Filter nested dict to primitive types for excel
                    flat.update({k: v for k, v in item["screening_results"].items() if type(v) in [int, float, str, bool]})
                    all_records.append(flat)
                    
            if all_records:
                df = pd.DataFrame(all_records)
                st.subheader("Candidate Triage Data Table")
                st.dataframe(df, use_container_width=True)
                
                # Excel Export
                buffer = io.BytesIO()
                with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Triage_Report')
                
                st.download_button(
                    label="📥 Download Full Triage Report (.xlsx)",
                    data=buffer.getvalue(),
                    file_name="9B_MMX_Triage_Report.xlsx",
                    mime="application/vnd.ms-excel",
                    type="primary"
                )
                
                st.subheader("Visual Risk Mapping")
                col_chart1, col_chart2 = st.columns(2)
                
                with col_chart1:
                    fig1 = px.scatter(df, x="VEC", y="estimated_SFE_heuristic_index", color="Triage_Rank", 
                                      hover_data=["Alloy_ID", "PREN"],
                                      color_discrete_map={"Green":"#28a745", "Yellow":"#ffc107", "Red":"#dc3545"},
                                      title="Phase Space: VEC vs. SFE")
                    st.plotly_chart(fig1, use_container_width=True)
                    
                with col_chart2:
                    if "interstitial_precipitation_risk_kJ_mol" in df.columns:
                        fig2 = px.bar(df, x="Alloy_ID", y="interstitial_precipitation_risk_kJ_mol", color="Triage_Rank",
                                      color_discrete_map={"Green":"#28a745", "Yellow":"#ffc107", "Red":"#dc3545"},
                                      title="Precipitation Risk (Foundry Heatmap Proxy)")
                        st.plotly_chart(fig2, use_container_width=True)
        else:
            st.error("Batch processing failed. Node.js engine error.")
            st.text(res.stderr)
