# Demo Run: Computational Screening Execution

This document provides a factual summary of the refactoring changes, execution steps, and resulting outputs of the 9B-MMX screening tool.

---

## 1. Files Modified and Created

We modified the following core files to establish strict scientific nomenclature, remove promotional language, and use repository-relative markdown paths:
*   **`agy.js`**: Refactored CLI logs and Markdown report output to rename former VIBANN wording to surrogate hardness estimates, change forbidden phases to rule-based phase-risk flags, change cost evaluations to raw-material cost indices, and use relative paths for files.
*   **`agy_rhea_gen.js`**: Applied equivalent modifications to the Refractory HEA screening console.
*   **`logs/tainan_foundry_fail.json`**: Standardized the failure sample `Al0.8CoCrFeNi` to `AlCoCrFeNi_equiatomic` to reflect correct equal atomic composition weights.

We created the following new files:
*   **`docs/methodology.md`**: Standard methodology documenting thermodynamic formulas, rule-based screening triggers, kernel penalty details, and model limits.
*   **`README.md`**: Main repository homepage explaining prototype features, quick-start, limits, and project layout.
*   **`examples/hea_config_99.json`**: Reference input configuration representing the candidate alloy `HEA-Config-#99`.
*   **`examples/sample_report.md`**: A saved sample output report of `HEA-Config-#99` for offline review.

---

## 2. How to Execute the Demo

To run the audit simulation on the built-in candidate alloy:

```bash
npm run audit
```

This script executes `agy.js` with the configuration defined in `AGENTS.md`.

---

## 3. Screen Output Summary

The command output displays the progress as each agent verifies descriptors:

```text
========================================================================
   9B-MMX v0.1: 高熵合金計算篩選原型 (基於規則描述符與歷史失敗距離懲罰)   
========================================================================
當前本機時間: 2026-05-27T01:23:37.249Z

[✔] 已成功解析 AGENTS.md 全域隔離規則：
    - 隔離沙盒模式: worktree-isolated
    - 成分容差限制 (Tolerance): 0.000001
    - 強制 VEC 審查: true
    - 熱力學禁用相: ["Laves_phase","sigma_phase_at_high_temp"]
    - CMEP 非平衡旁路閥門狀態: DISABLED (Forced Safety)
[✔] 成功載入實體反饋核，共有 6 筆台南實體開爐失敗紀錄。

--- 01. [總監 Director] 啟動材料計算篩選程序 ---
[Director] 定義初始搜尋成分空間，將 HEA-Config-#99 掛載至篩選核心...
[Director] 讀取歷史開爐失敗數據，建立 failure-distance penalty model 評估核心

--- 04. [晶格規劃師 Lattice Architect] 生成組態結構 ---
[Architect] 候選成分載入：Al=18%, Co=20.5%, Cr=20.5%, Fe=20.5%, Ni=20.5%
[Architect] 計算所得顯式描述符：
    - 價電子濃度 VEC: 7.305
    - 原子半徑偏差 δ: 5.247%
    - 混合焓 ΔH_mix: -11.67 kJ/mol
    - 熵能參數 Ω: 1.950
    - 晶相結構預測: Mixed FCC + BCC Phase

--- 02. [物理合理性審計員 Physics Consistency Auditor] 執行規則描述符驗證 ---
[Auditor] [步驟 1/3] 驗算成分完整性偏離度: 0.0000e+0
[Auditor] [✔] 成分總和精確為 100 at.% (偏離為零)。
[Auditor] [步驟 2/3] 比對相穩定性規則限制 (rule-based phase-risk flags)...
[Auditor] [⚠️ 提示] 觸發相風險指標: [sigma_phase_at_high_temp]，存在潛在脆性相偏析風險。
[Auditor] [⚠️ 提示] 觸發相風險指標: [Laves_phase]，存在潛在脆性相偏析風險。
[Auditor] [步驟 3/3] 計算歷史失敗距離懲罰 (historical failure-distance penalty)...
[Auditor] 歷史失敗距離懲罰加權計算結果：
    - 距離歷史失敗樣本 [AlCoCrFeNi_equiatomic (LTM_THERMO_DEAD_ZONE)]: 距離=2.24 at.%, 最終懲罰權重=0.7708
    ...
    => 歷史失敗總懲罰分值 P_foundry = 0.7708

--- 06. [電子結構開發員 Electronic Developer] 預估微觀硬度 ---
[Electronic Developer] 調用 surrogate hardness estimate 預估微觀機械硬度...
[Electronic Developer] surrogate hardness estimate 預估維氏硬度 HV = 461.1
[Electronic Developer] 預估值在常規硬度參考區間內。

--- 08. [成本與工藝評估員 Cost Evaluator] 評估工藝可行性 ---
[Cost Evaluator] 配方原料估算成本指數 (approximate raw-material cost index): $13.06 USD/kg (註：此為 at.% 加權計算，非真實質量比例)

--- 09. [工程轉譯員 Engineering Translator] 產出篩選診斷報告 ---
【 9B-MMX 材料計算篩選 風險評估報告 】
[候選配方] HEA-Config-#99 (Al18 Co20.5 Cr20.5 Fe20.5 Ni20.5)
[驗證狀態] 高風險篩選結果 (High-risk screening result)
[物理特徵] VEC=7.305, δ=5.247%, ΔH_mix=-11.67 kJ/mol, Ω=1.950
[晶相預測] Mixed FCC + BCC Phase
[預估硬度] HV 461.1 (Surrogate Hardness Estimate)
[歷史失敗懲罰分值] P_foundry = 0.7708

[✔] 篩選報告已成功寫入 logs/physics_audit_report.json
[✔] 技術評估報告 (Markdown) 已成功寫入 logs/physics_audit_report.md
```

---

## 4. Generated Outputs

Upon execution, two main files are updated under the `logs/` directory:
1.  **`logs/physics_audit_report.json`**: Complete structured JSON output including descriptors, sanity gate evaluations, penalty components, and OOD checks.
2.  **`logs/physics_audit_report.md`**: Scientifically formatted Markdown report with relative link structures, GFM alerts, math notation, and clear recommendation summaries.
