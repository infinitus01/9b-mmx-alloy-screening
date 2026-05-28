# ─── 9B-MMX Computational Alloy Screening Prototype ───
# 【 技術評估報告 (Technical Screening Report) 】

> **Disclaimer**: This report is a computational screening result based on descriptors, surrogate estimates, and historical/proxy failure-distance penalties. It is not a substitute for physical melting, microscopy, phase identification, or mechanical testing.

> [!IMPORTANT]
> **候選合金配方安全等級審核狀態：🔴 高風險篩選結果 (HIGH_RISK_SCREENING_RESULT)**
> - **評估對象**: Fe46-Mn24-Cr18-Ni10-N2 (Fe₄₆Mn₂₄Cr₁₈Ni₁₀N₂)
> - **產出時間**: 2026-05-28T01:17:19.559Z
> - **核驗標準**: [AGENTS.md](../AGENTS.md) 物理一致性閘門規範
> - **方法學參考**: [docs/methodology.md](../docs/methodology.md)

---

## 一、背景與說明 (Introduction & Disclaimer)
本報告由 **9B-MMX 多主元素與結構合金計算篩選原型** 自動執行推演生成。本架構遵循熱力學與動力學規則限制，調用 **晶格規劃師 (Lattice Architect)** 與 **物理合理性審計員 (Physics Consistency Auditor)** 等模組，並自動載入 **歷史/代理失敗資料庫 (logs/tainan_foundry_fail.json)** 作為 failure-distance penalty model 評估核心，對候選合金配方進行快速計算粗篩（Pre-screening）。本報告僅提供篩選評估與風險提示，非材料性能保證。

---

## 二、晶格結構描述符預測 (Lattice Structure Descriptors)
下表為架構自主模擬與描述符計算結果（詳細計算方法參見 [docs/methodology.md](../docs/methodology.md)）：

| 描述符項目 (Descriptor) | 計算預測值 | 熱力學安全閾值 / 物理意涵 | 篩選評估 |
| :--- | :--- | :--- | :--- |
| **價電子濃度 (VEC)** | 7.592 | $\ge 8.0$ (單相 FCC), $< 6.87$ (單相 BCC) | 預測為 **Mixed FCC + BCC Phase** |
| **原子半徑偏差 ($\delta$)** | 0.874% | $\le 6.6\%$ (固溶體穩定區) | 🟢 符合穩定標準 |
| **混合焓 ($\Delta H_{\text{mix}}$)** | -1.69 kJ/mol | $-15 \sim 5\text{ kJ/mol}$ (非晶態與金屬間化合物防止) | 🟢 處於安全熱力學區間 |
| **熵能參數 ($\Omega$)** | 10.989 | $\ge 1.1$ (高熵穩定主導) | 🟢 熵主導效應通過 |
| **疊差能指標 (SFE Index)** | 21.6 mJ/m² | $15 \sim 40\text{ mJ/m²}$ (TWIP/TRIP 亞穩變形區) | 🟢 處於亞穩形變誘發塑性區 |
| **耐點蝕當量 (PREN)** | 25.5 | $\ge 25.0$ (耐點蝕性能良好) | 🟢 耐腐蝕性能良好 |
| **間隙相析出風險 (Interstitial Risk)** | 11.01 kJ/mol | 參考指標 (低熱力學驅動力優先) | 🟢 參考指標 (無硬性拒絕門檻) |

---

## 三、物理合理性與相穩定性篩選 (Physics Sanity & Phase Stability Audits)
在 [AGENTS.md](../AGENTS.md) 宣告的限制邊界下，系統對其物理合理性進行規則核查：

- **成分守恆審計 (Element Sum Audit)**：
  - 實測總比率：`100 at.%`
  - 系統容差偏離：`0.0000e+0` (容差限制：`0.000001`)
  - **狀態**：🟢 精確守恆通過。
- **相穩定性規則限制 (rule-based phase-risk flags)**：
  - 觸發之相風險指標：`[sigma_phase_at_high_temp]` (存在潛在脆性相偏析風險)
  - **狀態**：🔴 觸發相風險指標，易在冷卻過程中產生裂紋。

---

## 四、失敗/代理距離懲罰分析 (Failure/Proxy-Distance Penalty Analysis)
載入歷史/代理失敗資料庫，以非參數高斯核函數計算成分距離：

| 失敗/代理樣本 ID | 失敗/代理配方名稱 | 缺陷類型 (Defect Type) | 距離 (at.%) | 最終懲罰權重 (Penalty) |
| :--- | :--- | :--- | :--- | :--- |
| `Tainan-CN-007` | **Fe46-Mn24-Cr18-Ni10-N2_Sensitized** | `LTM_THERMO_DEAD_ZONE` | 0.00 at.% | **1.1914** |
| `Tainan-CN-008` | **Fe48-Mn24-Cr18-Ni10-C2_Carbide_Segregation** | `MTM_PROCESS_RISK` | 3.46 at.% | **0.7774** |
| `Tainan-DCC-003` | **Al0.3CoCrFeNi_Slow_Cool** | `STM_OPERATOR_NOISE` | 43.47 at.% | **0.0000** |
| `Tainan-VAR-002` | **CoCr1.8FeNi** | `MTM_PROCESS_RISK` | 44.47 at.% | **0.0000** |
| `Tainan-VIM-001` | **AlCoCrFeNi_equiatomic** | `LTM_THERMO_DEAD_ZONE` | 46.48 at.% | **0.0000** |
| `Virt-RHEA-Fail-006` | **RHEA-W-Mo-Cr-Ti_LowDensity** | `MTM_PROCESS_RISK` | 70.71 at.% | **0.0000** |
| `Virt-RHEA-Fail-004` | **RHEA-W-Mo-Ta-Nb-Ti_Balanced** | `MTM_PROCESS_RISK` | 71.55 at.% | **0.0000** |
| `Virt-RHEA-Fail-005` | **RHEA-Nb-Ti-V-Ta_Ductile** | `MTM_PROCESS_RISK` | 74.97 at.% | **0.0000** |

- **失敗懲罰總得分 ($P_{\text{foundry}}$)**: `1.9687` (風險警戒閾值：`< 0.25`)
- **狀態**：🔴 該候選配方高度接近失敗/代理樣品，不建議直接進入實體熔煉。

---

## 五、物理與機械性質預估 (Hardness & Cost Predictions)
- **surrogate hardness estimate 預估硬度**: `HV 425.2`
- **是否超出參考區間 (Out-Of-Distribution)**: `🟢 在常規參考區間內`
- **配方原料估算成本指數 (approximate raw-material cost index)**: `$4.08 USD/kg` *(註：此為 at.% 加權計算，非真實質量比例，僅供參考)*

---

## 六、篩選決策與工程建議 (Screening Decisions & Recommendations)
> [!CAUTION]
> **重要聲明**
> 本候選配方僅通過**規則描述符粗篩**與**Surrogate 估計**，仍屬於未實體熔煉之虛擬狀態。物理缺陷與偏析風險無法完全排除。
>
> **部署建議**：
> 1. 不建議直接進入實體熔煉，應調整 C/N loading、Mn/Cr balance、或 cooling rate 以降低 phase-risk / failure-distance penalty。
> 2. 實體冶煉時，應配置嚴格的質量監控以監控結晶相演變。
