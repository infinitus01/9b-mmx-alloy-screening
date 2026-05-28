import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import subprocess
import json
import os
import io
import ml_optimizer

st.set_page_config(page_title="9B-MMX Dashboard", page_icon="⚛️", layout="wide")

st.title("9B-MMX: Computational Alloy Screening Dashboard")
st.markdown("A high-throughput, heuristic-based pre-screening engine designed to instantly flag casting risks and filter metastable structural alloys before committing to expensive physical melts or heavy CALPHAD simulations.")

tab1, tab2, tab3 = st.tabs(["🎛️ Single Alloy Audit (Demo)", "📊 High-Throughput Batch Triage", "🧠 ML Optimization & Pareto Discovery"])

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

with tab2:
    st.header("Batch Triaging & Export")
    st.markdown("Run the 9B-MMX engine on a bulk collection of candidates.")
    st.info("Evaluating the built-in validation seed set: `examples/search_seeds/validation/lit_batch_seeds.json`")
    
    if st.button("⚙️ Execute Batch Triage", type="primary"):
        input_path = "examples/search_seeds/validation/lit_batch_seeds.json"
        output_path = "logs/dashboard_triage_out.json"
        
        with st.spinner("Processing thousands of heuristics in the background..."):
            res = subprocess.run(["node", "agy.js", "/batch-screen", f"--input={input_path}", f"--output={output_path}"], capture_output=True, text=True)
            
        if os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                triage_data = json.load(f)
                
            # Build DataFrame
            all_records = []
            for group, gname in [("lower_risk_screening_rank", "Green"), ("moderate_risk_candidates", "Yellow"), ("triage_out_candidates", "Red")]:
                for item in triage_data.get(group, []):
                    flat = {"Alloy_ID": item["alloy_name"], "Triage_Rank": gname, "Cooling_Rate": item["process"]["cooling_rate_K_s"]}
                    flat.update(item["composition"])
                    flat.update({k: v for k, v in item["screening_results"].items() if type(v) in [int, float, str, bool]})
                    all_records.append(flat)
                    
            if all_records:
                df = pd.DataFrame(all_records)
                st.dataframe(df, use_container_width=True)
                
                # Excel Export
                buffer = io.BytesIO()
                with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Triage_Report')
                
                st.download_button("📥 Download Full Triage Report (.xlsx)", data=buffer.getvalue(), file_name="9B_MMX_Triage_Report.xlsx", mime="application/vnd.ms-excel", type="primary")

with tab3:
    st.header("Gaussian Process Surrogate & Pareto Front")
    st.markdown("This module uses the Node.js heuristic engine to generate synthetic training data, trains a **Gaussian Process Regressor (GPR)** to create a fast surrogate model, and performs random sampling to find the **Pareto Front** between maximizing Hardness and minimizing Precipitation Risk. The GPR also provides **Uncertainty Quantification (UQ)**.")
    
    if 'opt' not in st.session_state:
        st.session_state.opt = ml_optimizer.SurrogateOptimizer()
        
    c1, c2 = st.columns(2)
    with c1:
        if st.button("1. Generate Data & Train ML Surrogate", type="primary"):
            with st.spinner("Generating 500 records via Node.js and Training Gaussian Process..."):
                df_train = ml_optimizer.generate_synthetic_data(500)
                if not df_train.empty:
                    success = st.session_state.opt.train(df_train)
                    if success:
                        st.success("Gaussian Process Surrogate Model trained successfully!")
                        st.session_state.df_train = df_train
                    else:
                        st.error("Training failed.")
                else:
                    st.error("Failed to generate data from Node.js engine.")
                    
    with c2:
        if st.button("2. Perform Pareto Optimization Search", type="primary"):
            if not st.session_state.opt.is_trained:
                st.warning("Please train the model first.")
            else:
                with st.spinner("Random sampling 2000 points and predicting with UQ..."):
                    df_pareto = st.session_state.opt.find_pareto_front(2000)
                    st.session_state.df_pareto = df_pareto
                    
    if 'df_pareto' in st.session_state:
        df_p = st.session_state.df_pareto
        
        st.subheader("Pareto Front: Hardness vs. Precipitation Risk")
        st.markdown("Trade-off between increasing material strength (Hardness) and avoiding critical cracking hazards (Risk). The size of the points represents the Uncertainty (Standard Deviation) from the ML model.")
        
        # Plotly plot with Error bars or just scatter colored by Pareto
        fig = px.scatter(
            df_p, 
            x="Risk_Mean", y="Hardness_Mean", 
            color="Is_Pareto",
            error_x="Risk_Std", error_y="Hardness_Std",
            hover_data=["Fe", "Mn", "Cr", "Ni", "Co", "C", "N"],
            color_discrete_map={True: "red", False: "blue"},
            labels={"Risk_Mean": "Precipitation Risk (kJ/mol)", "Hardness_Mean": "Est. Hardness (HV)"},
            title="Surrogate Predictions with UQ Error Bars"
        )
        st.plotly_chart(fig, use_container_width=True)
        
        st.subheader("Top 5 Non-Dominated (Pareto) Candidates")
        pareto_only = df_p[df_p["Is_Pareto"] == True].sort_values("Hardness_Mean", ascending=False).head(5)
        st.dataframe(pareto_only)
