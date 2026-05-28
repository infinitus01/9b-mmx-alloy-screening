import streamlit as st
import pandas as pd
import plotly.express as px
import subprocess
import json
import os
import io

st.set_page_config(page_title="9B-MMX Dashboard", page_icon="⚛️", layout="wide")

st.title("9B-MMX: Computational Alloy Screening Dashboard")
st.markdown("A high-throughput screening engine for metastable structural alloys.")

# Sidebar for controls
st.sidebar.header("Control Panel")

mode = st.sidebar.radio("Mode", ["Single Alloy (Demo)", "Batch Triaging"])

if mode == "Single Alloy (Demo)":
    st.subheader("Single Candidate Evaluation")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        fe = st.slider("Fe (at.%)", 0.0, 100.0, 46.0, 0.1)
        mn = st.slider("Mn (at.%)", 0.0, 100.0, 24.0, 0.1)
        cr = st.slider("Cr (at.%)", 0.0, 100.0, 18.0, 0.1)
    with col2:
        ni = st.slider("Ni (at.%)", 0.0, 100.0, 10.0, 0.1)
        n = st.slider("N (at.%)", 0.0, 5.0, 2.0, 0.1)
        c = st.slider("C (at.%)", 0.0, 5.0, 0.0, 0.1)
    with col3:
        cooling_rate = st.slider("Cooling Rate (K/s)", 0.01, 100.0, 0.5, 0.1)
        
    if st.button("Run Audit"):
        # Create temp JSON
        seed = [{
            "name": "Interactive_Candidate",
            "composition_at_pct": {"Fe": fe, "Mn": mn, "Cr": cr, "Ni": ni, "N": n, "C": c},
            "process_parameters": {"cooling_rate_K_s": cooling_rate}
        }]
        
        with open("scratch/temp_single.json", "w") as f:
            json.dump(seed, f)
            
        with st.spinner("Running 9B-MMX Engine..."):
            res = subprocess.run(["node", "agy.js", "/batch-screen", "--input=scratch/temp_single.json", "--output=scratch/temp_out.json"], capture_output=True, text=True)
            
        if os.path.exists("scratch/temp_out.json"):
            with open("scratch/temp_out.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Find the candidate in whichever list it landed
            candidate = None
            if len(data.get("lower_risk_screening_rank", [])) > 0:
                candidate = data["lower_risk_screening_rank"][0]
            elif len(data.get("moderate_risk_candidates", [])) > 0:
                candidate = data["moderate_risk_candidates"][0]
            elif len(data.get("triage_out_candidates", [])) > 0:
                candidate = data["triage_out_candidates"][0]
                
            if candidate:
                status = candidate["screening_results"]["triage_class"]
                if "Red" in status:
                    st.error(f"Status: {status} - {candidate['screening_results']['triage_reason']}")
                elif "Yellow" in status:
                    st.warning(f"Status: {status} - {candidate['screening_results']['triage_reason']}")
                else:
                    st.success(f"Status: {status}")
                    
                st.json(candidate["screening_results"])
        else:
            st.error("Engine failed to produce output. Check Node.js installation.")

elif mode == "Batch Triaging":
    st.subheader("High-Throughput Batch Triage")
    
    data_source = st.radio("Select Data Source", ["Run Built-in Validation Set", "Upload Custom JSON Seed"])
    
    if st.button("Execute Batch Triage"):
        input_path = "examples/search_seeds/validation/batch_val_seeds.json"
        output_path = "logs/dashboard_triage_out.json"
        
        if data_source == "Run Built-in Validation Set":
            pass # Use default
            
        with st.spinner("Executing batch physical screening..."):
            res = subprocess.run(["node", "agy.js", "/batch-screen", f"--input={input_path}", f"--output={output_path}"], capture_output=True, text=True)
            
        if os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                triage_data = json.load(f)
                
            summ = triage_data.get("triage_summary", {})
            st.write("### Triage Summary")
            c1, c2, c3 = st.columns(3)
            c1.metric("🟢 Lower Risk (Pass)", summ.get("green_lower_risk", 0))
            c2.metric("🟡 Moderate Risk", summ.get("yellow_moderate_risk", 0))
            c3.metric("🔴 High Risk (Fail)", summ.get("red_high_risk", 0))
            
            # Combine all for dataframe
            all_records = []
            for group, gname in [("lower_risk_screening_rank", "Green"), ("moderate_risk_candidates", "Yellow"), ("triage_out_candidates", "Red")]:
                for item in triage_data.get(group, []):
                    flat = {"Alloy": item["alloy_name"], "Rank": gname, "Cooling_Rate": item["process"]["cooling_rate_K_s"]}
                    flat.update(item["composition"])
                    flat.update({k: v for k, v in item["screening_results"].items() if type(v) in [int, float, str]})
                    all_records.append(flat)
                    
            if all_records:
                df = pd.DataFrame(all_records)
                st.write("### Candidate Triage Table")
                st.dataframe(df)
                
                # Plotly Chart
                st.write("### Property Scatter & Risk Heatmap")
                fig = px.scatter(df, x="VEC", y="estimated_SFE_heuristic_index", color="Rank", hover_data=["Alloy", "P_foundry", "PREN"],
                                 color_discrete_map={"Green":"#28a745", "Yellow":"#ffc107", "Red":"#dc3545"},
                                 title="VEC vs SFE (Colored by Risk Rank)")
                st.plotly_chart(fig, use_container_width=True)
                
                # Excel Export
                buffer = io.BytesIO()
                with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Triage_Report')
                
                st.download_button(
                    label="📥 Download Triage Report as Excel",
                    data=buffer.getvalue(),
                    file_name="triage_report.xlsx",
                    mime="application/vnd.ms-excel"
                )
        else:
            st.error("Batch processing failed.")
            st.text(res.stderr)
