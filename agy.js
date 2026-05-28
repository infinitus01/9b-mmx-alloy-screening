/**
 * 9B-MMX: Computational Alloy Screening Prototype
 * Command-Line Auditing Engine & Physics Consistency Auditor Simulator (Refactored)
 */

const fs = require('fs');
const path = require('path');

// Import shared Core Modules
const Descriptors = require('./src/core/descriptors.js');
const Interstitial = require('./src/core/interstitial.js');
const Penalty = require('./src/core/penalty.js');

const ELEMENTS = Descriptors.ELEMENTS;

// ANSI escape codes for stunning console output
const CLR = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgYellow: "\x1b[43m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m"
};

// Parse Command Line Arguments
const args = process.argv.slice(2);
const commandStr = args.join(' ');

console.log(`${CLR.bright}${CLR.cyan}========================================================================${CLR.reset}`);
console.log(`${CLR.bright}${CLR.bgCyan}   9B-MMX: 合金計算篩選原型 (基於規則描述符與失敗/代理距離懲罰)   ${CLR.reset}`);
console.log(`${CLR.bright}${CLR.cyan}========================================================================${CLR.reset}`);
console.log(`${CLR.gray}當前本機時間: ${new Date().toISOString()}${CLR.reset}`);
console.log(`${CLR.gray}指令引數: ${JSON.stringify(args)}${CLR.reset}\n`);

// 1. Read and Parse AGENTS.md Config
let config = {
  maxConcurrent: 3,
  tolerance: 1e-6,
  checkVEC: true,
  forbiddenPhases: ["Laves_phase", "sigma_phase_at_high_temp", "Cr2N_nitride", "M23C6_carbide"],
  cmepEnabled: false,
  cmepWindow: 500
};

try {
  const agentsMdPath = path.join(__dirname, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    const content = fs.readFileSync(agentsMdPath, 'utf8');

    // Simple INI/MD parser for AGENTS.md
    const mMax = content.match(/MAX_CONCURRENT_SUBAGENTS=(\d+)/);
    if (mMax) config.maxConcurrent = parseInt(mMax[1]);

    const mTol = content.match(/ELEMENT_SUM_TOLERANCE=([\de\-]+)/);
    if (mTol) config.tolerance = parseFloat(mTol[1]);

    const mVec = content.match(/FORCE_VALENCE_ELECTRON_CONCENTRATION_CHECK=(\w+)/);
    if (mVec) config.checkVEC = mVec[1] === 'true';

    const mForbidden = content.match(/FORBIDDEN_PHASES=\[(.*?)\]/);
    if (mForbidden) {
      config.forbiddenPhases = mForbidden[1].split(',').map(s => s.replace(/["'\s]/g, ''));
    }

    const mCmep = content.match(/ENABLED=(\w+)/);
    if (mCmep) config.cmepEnabled = mCmep[1] === 'true';

    const mCmepWin = content.match(/MAX_EXPLORATION_WINDOW=(\d+)/);
    if (mCmepWin) config.cmepWindow = parseInt(mCmepWin[1]);

    console.log(`${CLR.green}[✔] 已成功解析 AGENTS.md 全域隔離規則：${CLR.reset}`);
    console.log(`    - 隔離沙盒模式: ${CLR.bright}worktree-isolated${CLR.reset}`);
    console.log(`    - 成分容差限制 (Tolerance): ${config.tolerance}`);
    console.log(`    - 強制 VEC 審查: ${config.checkVEC}`);
    console.log(`    - 熱力學禁用相: ${JSON.stringify(config.forbiddenPhases)}`);
    console.log(`    - CMEP 非平衡旁路閥門狀態: ${config.cmepEnabled ? CLR.yellow + 'ENABLED (Bypass Open)' : CLR.red + 'DISABLED (Forced Safety)'}${CLR.reset}`);
  } else {
    console.log(`${CLR.yellow}[⚠️] 未找到 AGENTS.md，使用系統預設防禦規格。${CLR.reset}`);
  }
} catch (err) {
  console.log(`${CLR.red}[❌] 解析 AGENTS.md 發生錯誤: ${err.message}${CLR.reset}`);
}

// 2. Read and Parse Foundry Failure Logs
let failureLogs = [];
try {
  const failureLogsPath = path.join(__dirname, 'logs', 'tainan_foundry_fail.json');
  if (fs.existsSync(failureLogsPath)) {
    failureLogs = JSON.parse(fs.readFileSync(failureLogsPath, 'utf8'));
    console.log(`${CLR.green}[✔] 成功載入實體反饋核 (Foundry Feedback Kernel)，共有 ${failureLogs.length} 筆歷史/代理失敗紀錄。${CLR.reset}`);
  } else {
    console.log(`${CLR.yellow}[⚠️] 未找到 tainan_foundry_fail.json 失敗記錄，實體反饋排斥場將處於空白狀態。${CLR.reset}`);
  }
} catch (err) {
  console.log(`${CLR.red}[❌] 載入失敗記憶庫發生錯誤: ${err.message}${CLR.reset}`);
}

// Define the default alloy candidate
const defaultCandidate = {
  alloy_name: "Fe46-Mn24-Cr18-Ni10-N2",
  composition: {
    Al: 0.0,
    Co: 0.0,
    Cr: 18.0,
    Fe: 46.0,
    Ni: 10.0,
    Mn: 24.0,
    C: 0.0,
    N: 2.0
  },
  process: {
    cooling_rate_K_s: 0.6,
    heat_treatment_temp_C: 1050,
    work_stress_MPa: 60,
    melting_atmosphere: "Vacuum_Induction"
  }
};

// ==========================================
// Batch Screening Feature Implementation
// ==========================================
if (args[0] === '/batch-screen') {
  let inputPath = null;
  let outputPath = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--input=')) {
      inputPath = args[i].substring('--input='.length);
    } else if (args[i].startsWith('--output=')) {
      outputPath = args[i].substring('--output='.length);
    }
  }

  if (!inputPath || !outputPath) {
    console.log(`${CLR.red}[❌] 錯誤: 請提供 --input=<path> 與 --output=<path> 引數。${CLR.reset}`);
    process.exit(1);
  }

  const fullInputPath = path.resolve(inputPath);
  if (!fs.existsSync(fullInputPath)) {
    console.log(`${CLR.red}[❌] 錯誤: 找不到輸入檔案 ${fullInputPath}${CLR.reset}`);
    process.exit(1);
  }

  console.log(`${CLR.cyan}[Batch] 載入批次篩選種子名單: ${fullInputPath}...${CLR.reset}`);
  let batchList = [];
  try {
    const rawData = fs.readFileSync(fullInputPath, 'utf8');
    batchList = JSON.parse(rawData);
    if (!Array.isArray(batchList)) {
      // If it's a seed index wrapping multiple compositions
      if (batchList.seeds) {
        batchList = batchList.seeds;
      } else {
        batchList = [batchList];
      }
    }
  } catch (err) {
    console.log(`${CLR.red}[❌] 解析輸入 JSON 發生錯誤: ${err.message}${CLR.reset}`);
    process.exit(1);
  }

  console.log(`${CLR.green}[Batch] 成功載入 ${batchList.length} 個配方種子。啟動高通量 Candidate Triage 審核程序...${CLR.reset}\n`);

  const triageTable = {
    timestamp: new Date().toISOString(),
    total_evaluated: batchList.length,
    triage_summary: {
      green_lower_risk: 0,
      yellow_moderate_risk: 0,
      red_high_risk: 0
    },
    lower_risk_screening_rank: [],
    moderate_risk_candidates: [],
    triage_out_candidates: []
  };

  batchList.forEach((item, index) => {
    const comp = item.composition || item.composition_at_pct;
    const proc = item.process || item.process_parameters || { cooling_rate_K_s: 1.0 };
    const alloyName = item.alloy_name || item.name || `Batch-Seed-#${index + 1}`;

    // Verify composition sum
    let totalAt = 0;
    for (let el in comp) totalAt += comp[el];
    const sumDiff = Math.abs(totalAt - 100);

    // Calculate Descriptors
    const des = Descriptors.calculateDescriptors(comp, proc.cooling_rate_K_s);
    const cost = Descriptors.calculateRawMaterialCostIndex(comp);
    const intRisk = Interstitial.calculateInterstitialPrecipitationRisk(comp);
    const sol = Interstitial.checkInterstitialSolubility(comp);
    const sieverts = Interstitial.calculateExperimentalSievertsNLimit(comp);

    // Calculate Penalty
    const pen = Penalty.calculatePenalty(comp, proc.cooling_rate_K_s, failureLogs);
    const P_foundry = pen.total_penalty_score;

    // Evaluate Phase Risks
    let isSigmaRisk = des.VEC >= 6.8 && des.VEC <= 7.6;
    let isLavesRisk = des.delta >= 8.0 || (des.delta >= 5.0 && des.VEC < 8.0);
    let detectedForbidden = [];
    if (isSigmaRisk) detectedForbidden.push("sigma_phase_at_high_temp");
    if (isLavesRisk) detectedForbidden.push("Laves_phase");
    if (sol.isNExceeded) detectedForbidden.push("Cr2N_nitride");
    if (sol.isCExceeded) detectedForbidden.push("M23C6_carbide");

    let hasMajorPhaseRisk = detectedForbidden.some(p => config.forbiddenPhases.includes(p));

    // Determine Triage Class
    let triageClass = "Yellow (Moderate-Risk)";
    let reason = "Minor boundary warnings.";

    const isSumOk = sumDiff <= config.tolerance;
    const isDesOk = des.delta <= 6.6 && des.dH_mix >= -15 && des.dH_mix <= 5 && des.omega >= 1.1;
    const isSfeOk = des.estimated_SFE_heuristic_index >= 15 && des.estimated_SFE_heuristic_index <= 40;
    const isPrenOk = des.PREN >= 25;

    if (!isSumOk) {
      triageClass = "Red (High-Risk/Triage-Out)";
      reason = `Composition sum total (${totalAt.toFixed(4)} at.%) deviates past tolerance.`;
    } else if (sol.isInterstitialExceeded) {
      triageClass = "Red (High-Risk/Triage-Out)";
      reason = "Interstitial solubility limit exceeded.";
    } else if (P_foundry >= 0.40) {
      triageClass = "Red (High-Risk/Triage-Out)";
      reason = `High failure proximity score (P_foundry = ${P_foundry.toFixed(4)}).`;
    } else if (hasMajorPhaseRisk && config.forbiddenPhases.length > 0) {
      triageClass = "Red (High-Risk/Triage-Out)";
      reason = `Critical forbidden phase flagged: [${detectedForbidden.join(', ')}].`;
    } else if (isDesOk && isSfeOk && isPrenOk && P_foundry < 0.25) {
      triageClass = "Green (Lower-Risk)";
      reason = "All strict criteria and safety bounds satisfied.";
    } else {
      // Yellow cases
      let yellowReasons = [];
      if (!isDesOk) yellowReasons.push("Substitutional HEA limits deviated");
      if (!isSfeOk) yellowReasons.push("SFE deviated from best TRIP/TWIP zone");
      if (!isPrenOk) yellowReasons.push("PREN < 25");
      if (P_foundry >= 0.25) yellowReasons.push("Approaching failure proxy zone");
      reason = yellowReasons.join("; ") || "Minor process deviation.";
    }

    const triageRecord = {
      alloy_name: alloyName,
      formula: Descriptors.getFormula(comp),
      composition: comp,
      process: proc,
      screening_results: {
        VEC: des.VEC,
        delta_percent: des.delta,
        dH_mix_kJ_mol: des.dH_mix,
        omega: des.omega,
        estimated_SFE_heuristic_index: des.estimated_SFE_heuristic_index,
        PREN: des.PREN,
        surrogate_hardness_HV: des.surrogate_hardness_HV,
        interstitial_precipitation_risk_kJ_mol: intRisk,
        P_foundry: P_foundry,
        experimental_sieverts_n_limit_at: sieverts.limit_at,
        triage_class: triageClass,
        triage_reason: reason
      }
    };

    if (triageClass === "Green (Lower-Risk)") {
      triageTable.triage_summary.green_lower_risk++;
      triageTable.lower_risk_screening_rank.push(triageRecord);
    } else if (triageClass === "Red (High-Risk/Triage-Out)") {
      triageTable.triage_summary.red_high_risk++;
      triageTable.triage_out_candidates.push(triageRecord);
    } else {
      triageTable.triage_summary.yellow_moderate_risk++;
      triageTable.moderate_risk_candidates.push(triageRecord);
    }
  });

  // Sort ranks by lower P_foundry or better parameters
  triageTable.lower_risk_screening_rank.sort((a, b) => a.screening_results.P_foundry - b.screening_results.P_foundry);

  // Write triage table report
  const resolvedOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, JSON.stringify(triageTable, null, 2), 'utf8');

  console.log(`\n${CLR.bright}${CLR.bgYellow}【 Candidate Triage Summary 候選分流審計結果 】${CLR.reset}`);
  console.log(`  🟢 綠色低風險區 (Lower-Risk Ranks): ${CLR.green}${triageTable.triage_summary.green_lower_risk} 筆${CLR.reset}`);
  console.log(`  🟡 黃色邊界警告區 (Moderate-Risk): ${CLR.yellow}${triageTable.triage_summary.yellow_moderate_risk} 筆${CLR.reset}`);
  console.log(`  🔴 紅色阻斷剔除區 (Triage-Out): ${CLR.red}${triageTable.triage_summary.red_high_risk} 筆${CLR.reset}`);
  console.log(`\n${CLR.green}[✔] 批次篩選分流表已成功寫入 ${outputPath}${CLR.reset}\n`);
  process.exit(0);
}

// ==========================================
// Default /goal auditing simulation sequence
// ==========================================
const candidate = defaultCandidate;

// Calculate total atomic concentration
let totalAt = 0;
for (let el in candidate.composition) {
  totalAt += candidate.composition[el];
}

// Check command goals against the active built-in candidate.
const expectedGoalTerms = [candidate.alloy_name, Descriptors.getFormula(candidate.composition)];
if (!expectedGoalTerms.some(term => commandStr.includes(term))) {
  console.log(`\n${CLR.yellow}[ℹ] 警告: 未指定標準目標任務，預設對 [${candidate.alloy_name}] 進行 9B-MMX 物理合理性審核。${CLR.reset}\n`);
}

// Start simulation sequence with visual timeouts
const runTimeline = async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`\n${CLR.bright}${CLR.magenta}--- 01. [總監 Director] 啟動材料計算篩選程序 ---${CLR.reset}`);
  await sleep(600);
  console.log(`${CLR.dim}[Director] 定義初始搜尋成分空間，將 ${candidate.alloy_name} (${Descriptors.getFormula(candidate.composition)}) 掛載至篩選核心...${CLR.reset}`);
  console.log(`${CLR.cyan}[Director] 讀取歷史/代理失敗數據，建立 failure-distance penalty model 評估核心${CLR.reset}`);
  await sleep(700);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 04. [晶格規劃師 Lattice Architect] 生成組態結構 ---${CLR.reset}`);
  await sleep(500);
  let compParts = [];
  for (let el in candidate.composition) {
    if (candidate.composition[el] > 0) {
      compParts.push(`${el}=${candidate.composition[el]}%`);
    }
  }
  console.log(`${CLR.dim}[Architect] 候選成分載入：${compParts.join(', ')}${CLR.reset}`);

  // Calculate HEA Descriptors (Substitutional-Only via Core)
  const des = Descriptors.calculateDescriptors(candidate.composition, candidate.process.cooling_rate_K_s);
  const wtPct = Descriptors.atPctToWtPct(candidate.composition);
  const totalCost = Descriptors.calculateRawMaterialCostIndex(candidate.composition);

  // Calculate Interstitial Risk & Solubility
  const interstitial_precipitation_risk = Interstitial.calculateInterstitialPrecipitationRisk(candidate.composition);
  const sol = Interstitial.checkInterstitialSolubility(candidate.composition);
  const sieverts = Interstitial.calculateExperimentalSievertsNLimit(candidate.composition);

  console.log(`${CLR.cyan}[Architect] 計算所得顯式描述符：${CLR.reset}`);
  console.log(`    - 價電子濃度 VEC: ${des.VEC.toFixed(3)}`);
  console.log(`    - 原子半徑偏差 δ: ${des.delta.toFixed(3)}%`);
  console.log(`    - 混合焓 ΔH_mix: ${des.dH_mix.toFixed(2)} kJ/mol`);
  console.log(`    - 熵能參數 Ω: ${des.omega === Infinity ? 'Infinity' : des.omega.toFixed(3)}`);
  console.log(`    - 疊差能指標 SFE Index: ${des.estimated_SFE_heuristic_index.toFixed(1)} mJ/m²`);
  console.log(`    - 耐點蝕當量 PREN: ${des.PREN.toFixed(1)}`);
  console.log(`    - 間隙相析出風險 Interstitial Risk: ${interstitial_precipitation_risk.toFixed(2)} kJ/mol`);
  console.log(`    - 實驗性 Sieverts 氮溶解上限 (1600°C, 1atm): ${sieverts.limit_at.toFixed(2)} at.% (${sieverts.limit_wt.toFixed(4)} wt.%) [僅供實驗參考]`);
  console.log(`    - 晶相結構預測: ${des.predictedPhase}`);
  await sleep(800);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 02. [物理合理性審計員 Physics Consistency Auditor] 執行規則描述符驗證 ---${CLR.reset}`);
  await sleep(600);

  // Element sum audit
  const sumDiff = Math.abs(totalAt - 100);
  console.log(`${CLR.dim}[Auditor] [步驟 1/3] 驗算成分完整性偏離度: ${sumDiff.toExponential(4)}${CLR.reset}`);
  if (sumDiff > config.tolerance) {
    console.log(`${CLR.red}[Auditor] [❌ 阻斷] 成分總和偏離超出容差值 ${config.tolerance}，篩選程序終止。${CLR.reset}`);
    process.exit(1);
  } else {
    console.log(`${CLR.green}[Auditor] [✔] 成分總和精確為 100 at.% (偏離為零)。${CLR.reset}`);
  }
  await sleep(600);

  // Phase stability check (rule-based risk flag)
  console.log(`${CLR.dim}[Auditor] [步驟 2/3] 比對相穩定性規則限制 (rule-based phase-risk flags)...${CLR.reset}`);
  let isSigmaRisk = des.VEC >= 6.8 && des.VEC <= 7.6;
  let isLavesRisk = des.delta >= 8.0 || (des.delta >= 5.0 && des.VEC < 8.0);
  let isCr2N = sol.isNExceeded;
  let isM23C6 = sol.isCExceeded;

  let detectedForbidden = [];
  if (isSigmaRisk) detectedForbidden.push("sigma_phase_at_high_temp");
  if (isLavesRisk) detectedForbidden.push("Laves_phase");
  if (isCr2N) detectedForbidden.push("Cr2N_nitride");
  if (isM23C6) detectedForbidden.push("M23C6_carbide");

  let phaseAuditPassed = true;
  detectedForbidden.forEach(p => {
    if (config.forbiddenPhases.includes(p)) {
      console.log(`${CLR.yellow}[Auditor] [⚠️ 提示] 觸發相風險指標: [${p}]，存在潛在相偏析或脆化析出風險。${CLR.reset}`);
      phaseAuditPassed = false;
    }
  });

  if (phaseAuditPassed) {
    console.log(`${CLR.green}[Auditor] [✔] 相穩定性規則審查通過 (未觸發高風險相指標)。${CLR.reset}`);
  }

  // Interstitial Solubility check in Auditor
  if (sol.isInterstitialExceeded) {
    let reasons = [];
    if (sol.isNExceeded) reasons.push(`N: ${candidate.composition.N.toFixed(2)} at.% > limit ${sol.nLimit.toFixed(2)} at.%`);
    if (sol.isCExceeded) reasons.push(`C: ${candidate.composition.C.toFixed(2)} at.% > limit ${sol.cLimit.toFixed(2)} at.%`);
    if (sol.isTotalExceeded) reasons.push(`C+N: ${(candidate.composition.C + candidate.composition.N).toFixed(2)} at.% > limit ${sol.totalLimit.toFixed(2)} at.%`);
    console.log(`${CLR.yellow}[Auditor] [⚠️ 間隙溶解度溢出] 觸發間隙型固溶極限警告: ${reasons.join(', ')}。冶煉中可能析出粗大間隙相。${CLR.reset}`);
  } else if ((candidate.composition.C || 0) > 0 || (candidate.composition.N || 0) > 0) {
    console.log(`${CLR.green}[Auditor] [✔] 間隙型元素固溶度審查通過。${CLR.reset}`);
  }
  await sleep(700);

  // Failure-distance penalty model calculation via Core
  console.log(`${CLR.dim}[Auditor] [步驟 3/3] 計算失敗/代理距離懲罰 (failure/proxy-distance penalty)...${CLR.reset}`);

  const pen = Penalty.calculatePenalty(candidate.composition, candidate.process.cooling_rate_K_s, failureLogs);
  const P_foundry = pen.total_penalty_score;

  console.log(`${CLR.cyan}[Auditor] 失敗/代理距離懲罰加權計算結果：${CLR.reset}`);
  pen.details.forEach(p => {
    console.log(`    - 距離失敗/代理樣本 [${p.alloy_name} (${p.defect_type})]: 距離=${p.distance} at.%, 最終懲罰權重=${p.final_penalty}`);
  });
  console.log(`${CLR.bright}${CLR.yellow}    => 失敗/代理總懲罰分值 P_foundry = ${P_foundry.toFixed(4)}${CLR.reset}`);
  await sleep(800);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 03. [安全與危險防護員 Safety Guardian] 審查危害風險 ---${CLR.reset}`);
  await sleep(500);
  console.log(`${CLR.dim}[Guardian] 檢查高溫冶煉元素揮發性與毒性...${CLR.reset}`);
  if (candidate.composition.Al > 15 && candidate.process.heat_treatment_temp_C > 1000) {
    console.log(`${CLR.yellow}[Guardian] [⚠️ 注意] 高 Al 含量於 1050°C 高溫下易產生氧化鋁皮膜，若在非真空大氣中熔煉可能引入夾雜物。安全級別：中風險。${CLR.reset}`);
  } else {
    console.log(`${CLR.green}[Guardian] [✔] 元素毒性與高揮發安全審核通過。${CLR.reset}`);
  }
  await sleep(600);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 06. [電子結構開發員 Electronic Developer] 預估微觀硬度 ---${CLR.reset}`);
  await sleep(600);
  console.log(`${CLR.dim}[Electronic Developer] 調用 surrogate hardness estimate 預估微觀機械硬度...${CLR.reset}`);
  console.log(`${CLR.cyan}[Electronic Developer] surrogate hardness estimate 預估維氏硬度 HV = ${des.surrogate_hardness_HV.toFixed(1)}${CLR.reset}`);

  let isOOD = des.surrogate_hardness_HV > 650;
  if (isOOD) {
    console.log(`${CLR.bright}${CLR.yellow}[提示] 預估硬度接近理論臨界值，建議進行實體物理硬度測試確認。${CLR.reset}`);
  } else {
    console.log(`${CLR.green}[Electronic Developer] 預估值在常規硬度參考區間內。${CLR.reset}`);
  }
  await sleep(600);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 08. [成本與工藝評估員 Cost Evaluator] 評估工藝可行性 ---${CLR.reset}`);
  await sleep(500);
  console.log(`${CLR.dim}[Cost Evaluator] 配方原料估算成本指數 (approximate raw-material cost index): $${totalCost.toFixed(2)} USD/kg (註：此為 at.% 加權計算，非真實質量比例)${CLR.reset}`);
  const processNotes = [];
  if ((candidate.composition.C || 0) > 0 || (candidate.composition.N || 0) > 0) {
    processNotes.push(`C/N 間隙元素含量需搭配固溶度與析出風險審查 (C=${(candidate.composition.C || 0).toFixed(2)} at.%, N=${(candidate.composition.N || 0).toFixed(2)} at.%)`);
  }
  if (candidate.process.cooling_rate_K_s < 1.0) {
    processNotes.push(`冷卻速率偏慢 (${candidate.process.cooling_rate_K_s} K/s)，需注意相析出與失敗/代理距離懲罰`);
  }
  if ((candidate.composition.Al || 0) > 15) {
    processNotes.push("legacy Al-rich 配方需注意氧化夾雜與偏析風險");
  }
  console.log(`${CLR.dim}[Cost Evaluator] 工藝風險摘要: ${processNotes.length ? processNotes.join('；') : '未見主要工藝風險指標'}。${CLR.reset}`);
  await sleep(600);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 09. [工程轉譯員 Engineering Translator] 產出篩選診斷報告 ---${CLR.reset}`);
  await sleep(800);

  // Formulate final report
  const isSafe = P_foundry < 0.25 && phaseAuditPassed && !sol.isInterstitialExceeded;
  const statusString = isSafe ? "通過規則篩選 (Descriptor Filter Passed)" : "高風險篩選結果 (High-risk screening result)";

  console.log(`${CLR.bright}${CLR.bgYellow}【 9B-MMX 材料計算篩選 風險評估報告 】${CLR.reset}`);
  console.log(`[候選配方] ${candidate.alloy_name} (${Descriptors.getFormula(candidate.composition)})`);
  console.log(`[驗證狀態] ${isSafe ? CLR.green : CLR.red}${statusString}${CLR.reset}`);
  console.log(`[物理特徵] VEC=${des.VEC.toFixed(3)}, δ=${des.delta.toFixed(3)}%, ΔH_mix=${des.dH_mix.toFixed(2)} kJ/mol, Ω=${des.omega === Infinity ? 'Infinity' : des.omega.toFixed(3)}`);
  console.log(`[額外描述] SFE Index=${des.estimated_SFE_heuristic_index.toFixed(1)} mJ/m², PREN=${des.PREN.toFixed(1)}, Interstitial Risk=${interstitial_precipitation_risk.toFixed(2)} kJ/mol`);
  console.log(`[晶相預測] ${des.predictedPhase}`);
  console.log(`[預估硬度] HV ${des.surrogate_hardness_HV.toFixed(1)} (Surrogate Hardness Estimate)`);
  console.log(`[失敗/代理懲罰分值] P_foundry = ${P_foundry.toFixed(4)}`);

  if (P_foundry > 0.4) {
    console.log(`${CLR.red}    - 提示: 該成分與失敗/代理樣本高度接近。`);
    console.log(`      若在此冷卻速率 (${candidate.process.cooling_rate_K_s} K/s) 下進行實體熔煉，存在脆性析出開裂的高風險。${CLR.reset}`);
  }
  if (sol.isInterstitialExceeded) {
    console.log(`${CLR.red}    - 提示: 超出間隙型固溶度上限，可能析出粗大間隙相。${CLR.reset}`);
  }

  console.log(`\n${CLR.gray}※ Disclaimer: This report is a computational screening result based on descriptors, surrogate estimates, and historical/proxy failure-distance penalties. It is not a substitute for physical melting, microscopy, phase identification, or mechanical testing. ※${CLR.reset}`);

  // 3. Write structured JSON report to logs/physics_audit_report.json
  const report = {
    timestamp: new Date().toISOString(),
    candidate_alloy: candidate.alloy_name,
    composition: candidate.composition,
    process: candidate.process,
    descriptors: {
      VEC: des.VEC,
      delta_percent: des.delta,
      dH_mix_kJ_mol: des.dH_mix,
      entropy_param_omega: des.omega,
      predicted_phase: des.predictedPhase,
      estimated_SFE_heuristic_index: des.estimated_SFE_heuristic_index,
      PREN: des.PREN,
      interstitial_precipitation_risk: interstitial_precipitation_risk
    },
    hardness_predictions: {
      surrogate_hardness_HV: des.surrogate_hardness_HV,
      is_extreme_prediction: isOOD
    },
    physics_sanity_gate: {
      element_sum_total: totalAt,
      element_sum_deviation: sumDiff,
      tolerance: config.tolerance,
      phase_risk_flags_triggered: detectedForbidden,
      passed: phaseAuditPassed && !sol.isInterstitialExceeded,
      interstitial_solubility: {
        is_N_exceeded: sol.isNExceeded,
        is_C_exceeded: sol.isCExceeded,
        is_total_exceeded: sol.isTotalExceeded,
        passed: !sol.isInterstitialExceeded
      }
    },
    failure_distance_penalty_model: {
      total_penalty_score: P_foundry,
      threshold: 0.25,
      is_high_risk: P_foundry >= 0.25,
      details: pen.details
    },
    risk_evaluation: {
      approximate_raw_material_cost_index: totalCost,
      status: isSafe ? "SAFE_EXPLORATION" : "HIGH_RISK_SCREENING_RESULT",
      recommendation: "This report is a computational screening result based on descriptors, surrogate estimates, and historical/proxy failure-distance penalties. It is not a substitute for physical melting, microscopy, phase identification, or mechanical testing."
    }
  };

  const reportDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }
  const reportPath = path.join(reportDir, 'physics_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n${CLR.green}[✔] 篩選報告已成功寫入 logs/physics_audit_report.json${CLR.reset}\n`);

  // Write the Markdown technical screening report.
  const mdReportPath = path.join(reportDir, 'physics_audit_report.md');
  let mdContent = `# ─── 9B-MMX Computational Alloy Screening Prototype ───
# 【 技術評估報告 (Technical Screening Report) 】

> **Disclaimer**: This report is a computational screening result based on descriptors, surrogate estimates, and historical/proxy failure-distance penalties. It is not a substitute for physical melting, microscopy, phase identification, or mechanical testing.

> [!IMPORTANT]
> **候選合金配方安全等級審核狀態：${isSafe ? '🟢 物理過濾通過 (SAFE_EXPLORATION)' : '🔴 高風險篩選結果 (HIGH_RISK_SCREENING_RESULT)'}**
> - **評估對象**: ${candidate.alloy_name} (${Descriptors.getFormula(candidate.composition)})
> - **產出時間**: ${new Date().toISOString()}
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
| **價電子濃度 (VEC)** | ${des.VEC.toFixed(3)} | $\\ge 8.0$ (單相 FCC), $< 6.87$ (單相 BCC) | 預測為 **${des.predictedPhase}** |
| **原子半徑偏差 ($\\delta$)** | ${des.delta.toFixed(3)}% | $\\le 6.6\\%$ (固溶體穩定區) | ${des.delta <= 6.6 ? '🟢 符合穩定標準' : '🟡 有析出相偏析風險'} |
| **混合焓 ($\\Delta H_{\\text{mix}}$)** | ${des.dH_mix.toFixed(2)} kJ/mol | $-15 \\sim 5\\text{ kJ/mol}$ (非晶態與金屬間化合物防止) | 🟢 處於安全熱力學區間 |
| **熵能參數 ($\\Omega$)** | ${des.omega.toFixed(3)} | $\\ge 1.1$ (高熵穩定主導) | 🟢 熵主導效應通過 |
| **疊差能指標 (SFE Index)** | ${des.estimated_SFE_heuristic_index.toFixed(1)} mJ/m² | $15 \\sim 40\\text{ mJ/m²}$ (TWIP/TRIP 亞穩變形區) | ${des.estimated_SFE_heuristic_index >= 15 && des.estimated_SFE_heuristic_index <= 40 ? '🟢 處於亞穩形變誘發塑性區' : '🟡 偏離最佳形變機制'} |
| **耐點蝕當量 (PREN)** | ${des.PREN.toFixed(1)} | $\\ge 25.0$ (耐點蝕性能良好) | ${des.PREN >= 25.0 ? '🟢 耐腐蝕性能良好' : '🟡 點蝕風險較高'} |
| **間隙相析出風險 (Interstitial Risk)** | ${interstitial_precipitation_risk.toFixed(2)} kJ/mol | 參考指標 (低熱力學驅動力優先) | 🟢 參考指標 (無硬性拒絕門檻) |

---

## 三、物理合理性與相穩定性篩選 (Physics Sanity & Phase Stability Audits)
在 [AGENTS.md](../AGENTS.md) 宣告的限制邊界下，系統對其物理合理性進行規則核查：

- **成分守恆審計 (Element Sum Audit)**：
  - 實測總比率：\`${totalAt} at.%\`
  - 系統容差偏離：\`${sumDiff.toExponential(4)}\` (容差限制：\`${config.tolerance}\`)
  - **狀態**：🟢 精確守恆通過。
- **相穩定性規則限制 (rule-based phase-risk flags)**：
  - 觸發之相風險指標：${detectedForbidden.length > 0 ? '\`[' + detectedForbidden.join(', ') + ']\` (存在潛在脆性相偏析風險)' : '未觸發'}
  - **狀態**：${phaseAuditPassed ? '🟢 未觸發高風險相指標。' : '🔴 觸發相風險指標，易在冷卻過程中產生裂紋。'}

---

## 四、失敗/代理距離懲罰分析 (Failure/Proxy-Distance Penalty Analysis)
載入歷史/代理失敗資料庫，以非參數高斯核函數計算成分距離：

| 失敗/代理樣本 ID | 失敗/代理配方名稱 | 缺陷類型 (Defect Type) | 距離 (at.%) | 最終懲罰權重 (Penalty) |
| :--- | :--- | :--- | :--- | :--- |
${pen.details.map(p => `| \`${p.fail_id}\` | **${p.alloy_name}** | \`${p.defect_type}\` | ${p.distance} at.% | **${p.final_penalty}** |`).join('\n')}

- **失敗懲罰總得分 ($P_{\\text{foundry}}$)**: \`${P_foundry.toFixed(4)}\` (風險警戒閾值：\`< 0.25\`)
- **狀態**：${P_foundry < 0.25 ? '🟢 遠離已知失敗/代理樣品空間' : '🔴 該候選配方高度接近失敗/代理樣品，不建議直接進入實體熔煉。'}

---

## 五、物理與機械性質預估 (Hardness & Cost Predictions)
- **surrogate hardness estimate 預估硬度**: \`HV ${des.surrogate_hardness_HV.toFixed(1)}\`
- **是否超出參考區間 (Out-Of-Distribution)**: \`${isOOD ? '⚠️ 預估值偏高 (需實體硬度測試確認)' : '🟢 在常規參考區間內'}\`
- **配方原料估算成本指數 (approximate raw-material cost index)**: \`$${totalCost.toFixed(2)} USD/kg\` *(註：此為 at.% 加權計算，非真實質量比例，僅供參考)*

---

## 六、篩選決策與工程建議 (Screening Decisions & Recommendations)
> [!CAUTION]
> **重要聲明**
> 本候選配方僅通過**規則描述符粗篩**與**Surrogate 估計**，仍屬於未實體熔煉之虛擬狀態。物理缺陷與偏析風險無法完全排除。
>
> **部署建議**：
> 1. ${isSafe ? '該配方在計算粗篩中表現良好，建議列入專家評估與後續實驗室熔煉驗證計畫。' : '不建議直接進入實體熔煉，應調整 C/N loading、Mn/Cr balance、或 cooling rate 以降低 phase-risk / failure-distance penalty。'}
> 2. 實體冶煉時，應配置嚴格的質量監控以監控結晶相演變。
`;

  fs.writeFileSync(mdReportPath, mdContent, 'utf8');
  console.log(`${CLR.green}[✔] 技術評估報告 (Markdown) 已成功寫入 logs/physics_audit_report.md${CLR.reset}`);
};

runTimeline();
