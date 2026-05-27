# ─── 9B-MMX Cyber-Physical Materials Governance ───
# 【 技術評估報告 (Technical Screening Report) 】

> **Disclaimer**: This report is a computational screening result based on descriptors, surrogate estimates, and historical failure-distance penalties. It is not a substitute for physical melting, microscopy, phase identification, or mechanical testing.

> [!IMPORTANT]
> **候選合金配方安全等級審核狀態：🔴 高風險篩選結果 (HIGH_RISK_SCREENING_RESULT)**
> - **評估對象**: HEA-Config-#99 (Al₁₈Co₂₀.₅Cr₂₀.₅Fe₂₀.₅Ni₂₀.₅)
> - **產出時間**: 2026-05-27T01:48:31.714Z
> - **核驗標準**: [AGENTS.md](../AGENTS.md) 物理一致性閘門規範
> - **方法學參考**: [docs/methodology.md](../docs/methodology.md)

---

## 一、背景與說明 (Introduction & Disclaimer)
本報告由 **9B-MMX 高熵合金計算篩選原型** 自動執行推演生成。本架構遵循熱力學與動力學規則限制，調用 **晶格規劃師 (Lattice Architect)** 與 **物理合理性審計員 (Physics Consistency Auditor)** 等模組，並自動載入 **歷史開爐失敗資料庫 (logs/tainan_foundry_fail.json)** 作為 failure-distance penalty model 評估核心，對候選合金配方進行快速計算粗篩（Pre-screening）。本報告僅提供篩選評估與風險提示，非材料性能保證。

---

## 二、晶格結構描述符預測 (Lattice Structure Descriptors)
下表為架構自主模擬與描述符計算結果（詳細計算方法參見 [docs/methodology.md](../docs/methodology.md)）：

| 描述符項目 (Descriptor) | 計算預測值 | 熱力學安全閾值 / 物理意涵 | 篩選評估 |
| :--- | :--- | :--- | :--- |
| **價電子濃度 (VEC)** | 7.305 | $\ge 8.0$ (單相 FCC), $< 6.87$ (單相 BCC) | 預測為 **Mixed FCC + BCC Phase** |
| **原子半徑偏差 ($\delta$)** | 5.247% | $\le 6.6\%$ (固溶體穩定區) | 🟢 符合穩定標準 |
| **混合焓 ($\Delta H_{\text{mix}}$)** | -11.67 kJ/mol | $-15 \sim 5\text{ kJ/mol}$ (非晶態與金屬間化合物防止) | 🟢 處於安全熱力學區間 |
| **熵能參數 ($\Omega$)** | 1.950 | $\ge 1.1$ (高熵穩定主導) | 🟢 熵主導效應通過 |

---

## 三、物理合理性與相穩定性篩選 (Physics Sanity & Phase Stability Audits)
在 [AGENTS.md](../AGENTS.md) 宣告的限制邊界下，系統對其物理合理性進行規則核查：

- **成分守恆審計 (Element Sum Audit)**：
  - 實測總比率：`100 at.%`
  - 系統容差偏離：`0.0000e+0` (容差限制：`0.000001`)
  - **狀態**：🟢 精確守恆通過。
- **相穩定性規則限制 (rule-based phase-risk flags)**：
  - 觸發之相風險指標：`[sigma_phase_at_high_temp, Laves_phase]` (存在潛在脆性相偏析風險)
  - **狀態**：🔴 觸發相風險指標，易在冷卻過程中產生裂紋。

---

## 四、歷史失敗距離懲罰分析 (Failure-Distance Penalty Analysis)
載入歷史開爐失敗資料庫，以非參數高斯核函數計算成分距離：

| 失敗樣本 ID | 失敗配方名稱 | 缺陷類型 (Defect Type) | 距離 (at.%) | 最終懲罰權重 (Penalty) |
| :--- | :--- | :--- | :--- | :--- |
| `Tainan-VIM-001` | **AlCoCrFeNi_equiatomic** | `LTM_THERMO_DEAD_ZONE` | 2.24 at.% | **0.7708** |
| `Tainan-VAR-002` | **CoCr1.8FeNi** | `MTM_PROCESS_RISK` | 23.29 at.% | **0.0000** |
| `Tainan-DCC-003` | **Al0.3CoCrFeNi_Slow_Cool** | `STM_OPERATOR_NOISE` | 12.52 at.% | **0.0000** |
| `Virt-RHEA-Fail-004` | **RHEA-W-Mo-Ta-Nb-Ti_Balanced** | `MTM_PROCESS_RISK` | 44.78 at.% | **0.0000** |
| `Virt-RHEA-Fail-005` | **RHEA-Nb-Ti-V-Ta_Ductile** | `MTM_PROCESS_RISK` | 44.78 at.% | **0.0000** |
| `Virt-RHEA-Fail-006` | **RHEA-W-Mo-Cr-Ti_LowDensity** | `MTM_PROCESS_RISK` | 39.81 at.% | **0.0000** |

- **失敗懲罰總得分 ($P_{\text{foundry}}$)**: `0.7708` (風險警戒閾值：`< 0.25`)
- **狀態**：🔴 該候選配方極度接近歷史失敗樣品，不建議直接進入實體熔煉。

---

## 五、物理與機械性質預估 (Hardness & Cost Predictions)
- **surrogate hardness estimate 預估硬度**: `HV 461.1`
- **是否超出參考區間 (Out-Of-Distribution)**: `🟢 在常規參考區間內`
- **配方原料估算成本指數 (approximate raw-material cost index)**: `$13.06 USD/kg` *(註：此為 at.% 加權計算，非真實質量比例，僅供參考)*

---

## 六、篩選決策與工程建議 (Screening Decisions & Recommendations)
> [!CAUTION]
> **重要聲明**
> 本候選配方僅通過**規則描述符粗篩**與**Surrogate 估計**，仍屬於未實體熔煉之虛擬狀態。物理缺陷與偏析風險無法完全排除。
> 
> **部署建議**：
> 1. 不建議直接進入實體熔煉，應優先調整 Al 含量以避開脆性共格死路。
> 2. 實體冶煉時，應配置嚴格的質量監控以監控結晶相演變。
