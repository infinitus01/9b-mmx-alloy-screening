# 9B-MMX: Computational Alloy Screening Prototype

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)
![Status](https://img.shields.io/badge/Status-Active_Development-orange.svg)

**9B-MMX** 是一個高通量、製程感知的合金鑄造風險快篩原型，面向 **Fe-Mn-Cr-Ni-C-N** 等探索性結構合金搜尋空間。它會在毫秒級時間內，根據物理描述符與歷史/代理失敗資料，快速標記需要優先排除或進一步審查的配方，協助研究者把實驗與 CALPHAD 資源集中到較值得後續驗證的候選區域。

> **重要聲明**：這是一個**啟發式預篩工具**，不是材料性能預測器。所有輸出均為風險警示與相對排序用途，不得替代物理熔煉、顯微組織分析或機械測試。

---

## 📊 Literature Benchmark：文獻基準比對

這是目前 9B-MMX 最重要的文獻基準資料。

我們選取 4 種在同行評審文獻中具有高品質實驗數據的經典合金（CrCoNi MEA、Fe-22Mn-0.6C TWIP 鋼、Cantor Alloy、AISI 304 慢冷敏化），進行盲測基準比對，並與文獻值進行量化誤差分析。

**完整報告請見**：[docs/validation_report.md](docs/validation_report.md)

### 驗證總結（Quantitative Highlights）

| 合金 | SFE 相對誤差 | Hardness 相對誤差 | 析出風險攔截 | Triage 決策 | 評價 |
|------|--------------|-------------------|--------------|-------------|------|
| CrCoNi MEA | **-30.8%** | — | 正確（低風險） | ✅ Green | 低風險判斷一致 |
| Fe-22Mn-0.6C TWIP | **+18% ~ +107%** | — | ✅ 正確觸發 Red | ✅ Red | 良好（風險攔截準確） |
| Cantor Alloy | **-30.4%** | **+67%** (vs 退火態) | 正確 | ⚠️ Yellow | 硬度明顯高估 |
| AISI 304 (0.1 K/s) | — | — | ❌ 未攔截 | ⚠️ Yellow | **明顯盲區** |

**關鍵結論**：
- 在**物理風險機制層級**，4 個案例的決策正確率約 **75%**。
- 對中高碳合金的間隙析出風險攔截能力強（這正是 9B-MMX 最有價值的應用場景）。
- Hardness surrogate 在無間隙元素的高熵合金系統存在系統性高估（+67%）。
- 對極低碳 + 極慢冷（不鏽鋼敏化）情境，目前模型仍有明顯盲區。

**這份驗證報告明確界定了 9B-MMX 的真實能力邊界**，也讓後續任何模型改進都有了客觀的 baseline。

---

## 為什麼需要 9B-MMX？

傳統合金開發存在嚴重的「死亡之谷」：

- **實體試錯成本極高**：數百種理論配方送進熔爐，動輒數十萬與數月，最後大多數在冷卻階段就因碳氮化物析出或脆性相而報廢。
- **CALPHAD 太慢**：Thermo-Calc 等工具在 6 元以上系統（Fe-Mn-Cr-Ni-C-N）計算成本極高，無法支撐高通量探索。

**9B-MMX 的定位**：作為候選配方的快速啟發式分流工具，根據物理規則與歷史/代理失敗資料，對大量成分進行初步風險標記，協助研究者決定哪些候選需要進一步 CALPHAD 或實驗審查。

---

## 核心能力

- **製程感知**：同時考慮成分 + 冷卻速率（Cooling Rate），動態調整間隙析出懲罰。
- **多層防護**：物理守恆（VEC、δ、ΔH_mix、Ω）→ 間隙溶解度閘門 → 歷史失敗距離懲罰核。
- **批次處理**：支援 JSON 輸入，可處理大量候選配方。
- **視覺化探索**：內建 Streamlit Dashboard，可即時調整成分並觀看雷達圖與風險評估。

---

## 典型使用情境

### 1. 高碳/中碳亞穩結構合金的前期風險審查
在設計高錳 TWIP/TRIP 鋼或含 C/N 的 Fe-Mn-Cr-Ni 系統時，快速標記可能存在晶界析出風險的配方。這是目前較適合的初步審查場景。

### 2. AI 生成配方的下游 sanity check
當機器學習模型產生大量候選成分時，先用 9B-MMX 做 heuristic triage，再把仍需人工審查的候選送進 CALPHAD 或實驗規劃。

### 3. 製程敏感性掃描
觀察同一成分在不同冷卻速率假設下的風險標記變化；不可視為實際安全製程窗口。

---

## 快速上手

### 啟動 Dashboard（最推薦）
```bash
pip install -r requirements.txt
npm install
npm run dashboard
```

### 命令列批次篩選
```bash
node agy.js /batch-screen \
  --input=examples/search_seeds/validation/lit_batch_seeds.json \
  --output=logs/triage_report.json
```

執行後會產生結構化分流報告，清楚標註 Green / Yellow / Red 三大類。

---

## 模型能力邊界與已知局限（重要）

根據 [docs/validation_report.md](docs/validation_report.md) 的量化驗證，我們已識別以下系統性偏誤：

| 偏誤 | 表現情境 | 嚴重程度 | 建議用途 |
|------|----------|----------|----------|
| Hardness 系統性高估 | 無間隙元素的高熵合金（退火態） | 高 | 僅用於相對排序，絕對值不可信 |
| 高碳合金 SFE 高估 | C > 1.5 at.% 的 TWIP 鋼 | 中高 | 風險閘門反而因此加強，仍具實用價值 |
| 極低碳慢冷敏化盲區 | 不鏽鋼長時效 / 0.1 K/s 級慢冷 | 高 | 此情境下需搭配其他工具 |
| SFE 低估（低間隙系統） | CrCoNi、Cantor 等 | 中 | 仍能正確區分低/中 SFE 區間 |

**9B-MMX 最適合**用於「高碳/中碳 Fe-Mn-Cr-Ni-C-N 系統」的快速風險過濾。
在需要精確數值硬度、極低碳長時效行為、或完整相圖的場景，請務必搭配 CALPHAD 與實驗驗證。

---

## 專案結構

```
9b-mmx-alloy-screening/
├── agy.js                     # 核心 CLI 與批次處理引擎
├── dashboard.py               # Streamlit 視覺化面板
├── src/core/                  # 跨平台物理描述符與風險計算核心
│   ├── descriptors.js
│   ├── interstitial.js
│   └── penalty.js
├── docs/
│   └── validation_report.md   # ← 文獻驗證與量化誤差分析（核心文件）
├── logs/
│   └── tainan_foundry_fail.json   # 歷史鑄造失敗代理資料庫
├── examples/search_seeds/     # 測試用種子配方
└── requirements.txt
```

---

## License

本專案以 MIT License 釋出。

---

**如果你正在開發新一代高強度、高韌性或低溫結構合金，並且希望在大量實驗之前先做一次嚴格的「物理可行性快篩」，歡迎使用 9B-MMX，並參考我們的驗證報告來評估其適用性。**

有任何問題或想貢獻真實鑄造失敗數據，歡迎開 Issue 或直接聯絡。
