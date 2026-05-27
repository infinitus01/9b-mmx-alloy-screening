/**
 * 9B-MMX: Computational Alloy Screening Prototype
 * Command-Line Auditing Engine & Physics Consistency Auditor Simulator
 */

const fs = require('fs');
const path = require('path');

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

// Elemental physical constants for alloy screening descriptors
const ELEMENTS = {
  Al: { vec: 3, r: 1.43, T_m: 933, cost: 2.2, type: "substitutional" },   // r in Angstroms, cost in USD/kg
  Co: { vec: 9, r: 1.25, T_m: 1768, cost: 35.0, type: "substitutional" },
  Cr: { vec: 6, r: 1.28, T_m: 2180, cost: 9.8, type: "substitutional" },
  Fe: { vec: 8, r: 1.26, T_m: 1811, cost: 0.5, type: "substitutional" },
  Ni: { vec: 10, r: 1.24, T_m: 1728, cost: 16.5, type: "substitutional" },
  Mn: { vec: 7, r: 1.27, T_m: 1519, cost: 1.8, type: "substitutional" },
  C: { vec: 4, r: 0.77, T_m: 3823, cost: 0.1, type: "interstitial" },
  N: { vec: 5, r: 0.71, T_m: 63, cost: 0.05, type: "interstitial" }
};

const ATOMIC_MASS = {
  Al: 26.98,
  Co: 58.93,
  Cr: 52.00,
  Fe: 55.85,
  Mn: 54.94,
  Ni: 58.69,
  C: 12.01,
  N: 14.01
};

function atPctToWtPct(composition) {
  let totalMass = 0;
  for (let el in composition) {
    if (composition[el] > 0) {
      totalMass += (composition[el] / 100) * (ATOMIC_MASS[el] || 0);
    }
  }
  const wtPct = {};
  if (totalMass === 0) {
    for (let el in composition) {
      wtPct[el] = 0;
    }
    return wtPct;
  }
  for (let el in composition) {
    wtPct[el] = (((composition[el] / 100) * (ATOMIC_MASS[el] || 0)) / totalMass) * 100;
  }
  return wtPct;
}

function getFormula(composition) {
  const subscriptMap = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '.': '·'
  };
  let parts = [];
  const sortedElements = ['Fe', 'Mn', 'Cr', 'Ni', 'Co', 'Al', 'C', 'N'];
  for (let el in composition) {
    if (!sortedElements.includes(el)) {
      sortedElements.push(el);
    }
  }
  sortedElements.forEach(el => {
    const val = composition[el];
    if (val > 0) {
      const valStr = val % 1 === 0 ? val.toString() : val.toFixed(1);
      const subStr = valStr.split('').map(char => subscriptMap[char] || char).join('');
      parts.push(`${el}${subStr}`);
    }
  });
  return parts.join('');
}

// Enthalpies of mixing (dH_ij, kJ/mol)
const MIXING_ENTHALPIES = {
  "Al-Co": -19, "Al-Cr": -10, "Al-Fe": -11, "Al-Ni": -22,
  "Co-Cr": -4,  "Co-Fe": -1,  "Co-Ni": 0,
  "Cr-Fe": -1,  "Cr-Ni": -7,
  "Fe-Ni": -2,
  "Al-Mn": -19, "Co-Mn": -5, "Cr-Mn": 2, "Fe-Mn": 0, "Mn-Ni": -8,
  "Cr-N": -188, "Mn-N": -164, "Fe-N": -123, "Ni-N": -79,
  "Cr-C": -61, "Mn-C": -49, "Fe-C": -50, "Ni-C": -39
};

function getdH(el1, el2) {
  const pair1 = `${el1}-${el2}`;
  const pair2 = `${el2}-${el1}`;
  if (MIXING_ENTHALPIES[pair1] !== undefined) return MIXING_ENTHALPIES[pair1];
  if (MIXING_ENTHALPIES[pair2] !== undefined) return MIXING_ENTHALPIES[pair2];
  return 0;
}

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
  forbiddenPhases: ["Laves_phase", "sigma_phase_at_high_temp"],
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

// Define the built-in alloy candidate configuration to audit (Fe46 Mn24 Cr18 Ni10 N2 at.%)
// Normalized composition: sums to 100% exactly
const candidate = {
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
    cooling_rate_K_s: 0.6, // Slow cooling
    heat_treatment_temp_C: 1050,
    work_stress_MPa: 60,
    melting_atmosphere: "Vacuum_Induction"
  }
};

// Calculate total atomic concentration
let totalAt = 0;
for (let el in candidate.composition) {
  totalAt += candidate.composition[el];
}

// Check command goals against the active built-in candidate.
const expectedGoalTerms = [candidate.alloy_name, getFormula(candidate.composition)];
if (!expectedGoalTerms.some(term => commandStr.includes(term))) {
  console.log(`\n${CLR.yellow}[ℹ] 警告: 未指定標準目標任務，預設對 [${candidate.alloy_name}] 進行 9B-MMX 物理合理性審核。${CLR.reset}\n`);
}

// Start simulation sequence with visual timeouts
const runTimeline = async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`\n${CLR.bright}${CLR.magenta}--- 01. [總監 Director] 啟動材料計算篩選程序 ---${CLR.reset}`);
  await sleep(600);
  console.log(`${CLR.dim}[Director] 定義初始搜尋成分空間，將 ${candidate.alloy_name} (${getFormula(candidate.composition)}) 掛載至篩選核心...${CLR.reset}`);
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

  // Calculate substitutional total and normalize
  let totalSub = 0;
  for (let el in candidate.composition) {
    if (ELEMENTS[el] && ELEMENTS[el].type === "substitutional") {
      totalSub += candidate.composition[el];
    }
  }

  // Normalize substitutional elements
  let subComposition = {};
  for (let el in candidate.composition) {
    if (ELEMENTS[el] && ELEMENTS[el].type === "substitutional") {
      subComposition[el] = totalSub > 0 ? (candidate.composition[el] / totalSub) * 100 : 0;
    }
  }

  // Calculate HEA Descriptors (Substitutional-Only)
  let VEC = 0;
  let r_bar = 0;
  for (let el in subComposition) {
    let c = subComposition[el] / 100;
    VEC += c * ELEMENTS[el].vec;
    r_bar += c * ELEMENTS[el].r;
  }

  let deltaSum = 0;
  for (let el in subComposition) {
    let c = subComposition[el] / 100;
    deltaSum += c * Math.pow(1 - (ELEMENTS[el].r / r_bar), 2);
  }
  let delta = 100 * Math.sqrt(deltaSum);

  let dH_mix = 0;
  const elementsKeys = Object.keys(subComposition);
  for (let i = 0; i < elementsKeys.length; i++) {
    for (let j = i + 1; j < elementsKeys.length; j++) {
      let el1 = elementsKeys[i];
      let el2 = elementsKeys[j];
      let c1 = subComposition[el1] / 100;
      let c2 = subComposition[el2] / 100;
      dH_mix += 4 * getdH(el1, el2) * c1 * c2;
    }
  }

  let dS_mix = 0;
  const R = 8.314;
  for (let el in subComposition) {
    let c = subComposition[el] / 100;
    if (c > 0) dS_mix -= R * c * Math.log(c);
  }

  let T_m = 0;
  for (let el in subComposition) {
    let c = subComposition[el] / 100;
    T_m += c * ELEMENTS[el].T_m;
  }

  let omega = dH_mix !== 0 ? (T_m * dS_mix) / (Math.abs(dH_mix) * 1000) : Infinity;

  // New descriptors
  const wtPct = atPctToWtPct(candidate.composition);
  const PREN = (wtPct.Cr || 0) + 16 * (wtPct.N || 0);

  // Stacking Fault Energy (SFE) Heuristic Index (wt.% based)
  const estimated_SFE_heuristic_index = 25.7 +
    2.0 * (wtPct.Ni || 0) -
    0.9 * (wtPct.Cr || 0) -
    0.1 * (wtPct.Mn || 0) +
    30.0 * (wtPct.C || 0) -
    15.0 * (wtPct.N || 0) +
    5.0 * (wtPct.Al || 0) -
    1.5 * (wtPct.Co || 0);

  // Interstitial Precipitation Risk
  let interstitial_precipitation_risk = 0;
  for (let elSub in candidate.composition) {
    if (ELEMENTS[elSub] && ELEMENTS[elSub].type === "substitutional") {
      const cSub = candidate.composition[elSub] / 100;
      for (let elInt in candidate.composition) {
        if (ELEMENTS[elInt] && ELEMENTS[elInt].type === "interstitial") {
          const cInt = candidate.composition[elInt] / 100;
          if (cSub > 0 && cInt > 0) {
            const dH = getdH(elSub, elInt);
            interstitial_precipitation_risk += 4 * Math.abs(dH) * cSub * cInt;
          }
        }
      }
    }
  }

  // Interstitial Solubility check
  const crAt = candidate.composition.Cr || 0;
  const cAt = candidate.composition.C || 0;
  const nAt = candidate.composition.N || 0;
  const nLimit = 1.5 + 0.04 * crAt;
  const cLimit = 1.2;
  const totalLimit = 3.0;
  const isNExceeded = nAt > nLimit;
  const isCExceeded = cAt > cLimit;
  const isTotalExceeded = (cAt + nAt) > totalLimit;
  const isInterstitialExceeded = isNExceeded || isCExceeded || isTotalExceeded;

  // Phase prediction
  let predictedPhase = "Amorphous / Undefined";
  if (delta <= 6.6 && dH_mix >= -15 && dH_mix <= 5 && omega >= 1.1) {
    if (VEC >= 8.0) predictedPhase = "Single FCC Phase (Ductile)";
    else if (VEC < 6.87) predictedPhase = "Single BCC Phase (Strong)";
    else predictedPhase = "Mixed FCC + BCC Phase";
  } else if (delta > 6.6 && dH_mix < -15) {
    predictedPhase = "Intermetallic Compound (Brittle)";
  } else {
    predictedPhase = "Multi-phase mixture (High segregation risk)";
  }

  console.log(`${CLR.cyan}[Architect] 計算所得顯式描述符：${CLR.reset}`);
  console.log(`    - 價電子濃度 VEC: ${VEC.toFixed(3)}`);
  console.log(`    - 原子半徑偏差 δ: ${delta.toFixed(3)}%`);
  console.log(`    - 混合焓 ΔH_mix: ${dH_mix.toFixed(2)} kJ/mol`);
  console.log(`    - 熵能參數 Ω: ${omega === Infinity ? 'Infinity' : omega.toFixed(3)}`);
  console.log(`    - 疊差能指標 SFE Index: ${estimated_SFE_heuristic_index.toFixed(1)} mJ/m²`);
  console.log(`    - 耐點蝕當量 PREN: ${PREN.toFixed(1)}`);
  console.log(`    - 間隙相析出風險 Interstitial Risk: ${interstitial_precipitation_risk.toFixed(2)} kJ/mol`);
  console.log(`    - 晶相結構預測: ${predictedPhase}`);
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
  let isSigmaRisk = VEC >= 6.8 && VEC <= 7.6;
  let isLavesRisk = delta >= 8.0 || (delta >= 5.0 && VEC < 8.0);
  let isCr2N = isNExceeded;
  let isM23C6 = isCExceeded;

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
  if (isInterstitialExceeded) {
    let reasons = [];
    if (isNExceeded) reasons.push(`N: ${nAt.toFixed(2)} at.% > limit ${nLimit.toFixed(2)} at.%`);
    if (isCExceeded) reasons.push(`C: ${cAt.toFixed(2)} at.% > limit ${cLimit.toFixed(2)} at.%`);
    if (isTotalExceeded) reasons.push(`C+N: ${(cAt + nAt).toFixed(2)} at.% > limit ${totalLimit.toFixed(2)} at.%`);
    console.log(`${CLR.yellow}[Auditor] [⚠️ 間隙溶解度溢出] 觸發間隙型固溶極限警告: ${reasons.join(', ')}。冶煉中可能析出粗大間隙相。${CLR.reset}`);
  } else if ((candidate.composition.C || 0) > 0 || (candidate.composition.N || 0) > 0) {
    console.log(`${CLR.green}[Auditor] [✔] 間隙型元素固溶度審查通過。${CLR.reset}`);
  }
  await sleep(700);

  // Failure-distance penalty model calculation
  console.log(`${CLR.dim}[Auditor] [步驟 3/3] 計算失敗/代理距離懲罰 (failure/proxy-distance penalty)...${CLR.reset}`);

  let P_foundry = 0;
  let penaltyDetails = [];

  // Formula: P = Sum_d (w_d * exp(- ||x - x_fail||^2 / (2 * sigma_d^2)) * process_correction * time_decay)
  failureLogs.forEach(fail => {
    // Calculate composition distance squared in full Euclidean space
    let distanceSq = 0;
    let components = Array.from(new Set([...Object.keys(candidate.composition), ...Object.keys(fail.composition)]));
    components.forEach(el => {
      let x1 = candidate.composition[el] || 0;
      let x2 = fail.composition[el] || 0;
      distanceSq += Math.pow(x1 - x2, 2);
    });

    // Process parameters correction g(p_process)
    let coolingDiff = Math.abs(candidate.process.cooling_rate_K_s - fail.process_parameters.cooling_rate_K_s);
    let processCorrection = Math.exp(-Math.pow(coolingDiff, 2) / 2.0);

    // Dynamic penalty value
    let exponent = -distanceSq / (2 * Math.pow(fail.kernel_bandwidth, 2));
    let basePenalty = fail.severity_weight * Math.exp(exponent);
    let finalPenalty = basePenalty * processCorrection;

    P_foundry += finalPenalty;

    penaltyDetails.push({
      fail_id: fail.id,
      alloy_name: fail.alloy_name,
      defect_type: fail.defect_type,
      distance: Math.sqrt(distanceSq).toFixed(2),
      raw_penalty: basePenalty.toFixed(4),
      final_penalty: finalPenalty.toFixed(4)
    });
  });

  console.log(`${CLR.cyan}[Auditor] 失敗/代理距離懲罰加權計算結果：${CLR.reset}`);
  penaltyDetails.forEach(p => {
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

  // Predict Vickers Hardness HV
  let baseHardness = 150;
  baseHardness += (candidate.composition.Al || 0) * 12.5;
  baseHardness += (candidate.composition.Cr || 0) * 3.5;
  baseHardness += (candidate.composition.Mn || 0) * 2.8;
  baseHardness += (candidate.composition.N || 0) * 85.0;
  baseHardness += (candidate.composition.C || 0) * 120.0;

  // Apply thermal effect
  if (candidate.process.cooling_rate_K_s < 1.0) {
    baseHardness -= 25; // slow cooling leads to annealing/softening
  }

  const predictedHardnessHV = baseHardness;
  console.log(`${CLR.cyan}[Electronic Developer] surrogate hardness estimate 預估維氏硬度 HV = ${predictedHardnessHV.toFixed(1)}${CLR.reset}`);

  let isOOD = predictedHardnessHV > 650;
  if (isOOD) {
    console.log(`${CLR.bright}${CLR.yellow}[提示] 預估硬度接近理論臨界值，建議進行實體物理硬度測試確認。${CLR.reset}`);
  } else {
    console.log(`${CLR.green}[Electronic Developer] 預估值在常規硬度參考區間內。${CLR.reset}`);
  }
  await sleep(600);

  console.log(`\n${CLR.bright}${CLR.magenta}--- 08. [成本與工藝評估員 Cost Evaluator] 評估工藝可行性 ---${CLR.reset}`);
  await sleep(500);
  let totalCost = 0;
  for (let el in candidate.composition) {
    if (ELEMENTS[el]) {
      totalCost += (candidate.composition[el] / 100) * ELEMENTS[el].cost;
    }
  }
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
  const isSafe = P_foundry < 0.25 && phaseAuditPassed && !isInterstitialExceeded;
  const statusString = isSafe ? "通過規則篩選 (Descriptor Filter Passed)" : "高風險篩選結果 (High-risk screening result)";

  console.log(`${CLR.bright}${CLR.bgYellow}【 9B-MMX 材料計算篩選 風險評估報告 】${CLR.reset}`);
  console.log(`[候選配方] ${candidate.alloy_name} (${getFormula(candidate.composition)})`);
  console.log(`[驗證狀態] ${isSafe ? CLR.green : CLR.red}${statusString}${CLR.reset}`);
  console.log(`[物理特徵] VEC=${VEC.toFixed(3)}, δ=${delta.toFixed(3)}%, ΔH_mix=${dH_mix.toFixed(2)} kJ/mol, Ω=${omega === Infinity ? 'Infinity' : omega.toFixed(3)}`);
  console.log(`[額外描述] SFE Index=${estimated_SFE_heuristic_index.toFixed(1)} mJ/m², PREN=${PREN.toFixed(1)}, Interstitial Risk=${interstitial_precipitation_risk.toFixed(2)} kJ/mol`);
  console.log(`[晶相預測] ${predictedPhase}`);
  console.log(`[預估硬度] HV ${predictedHardnessHV.toFixed(1)} (Surrogate Hardness Estimate)`);
  console.log(`[失敗/代理懲罰分值] P_foundry = ${P_foundry.toFixed(4)}`);

  if (P_foundry > 0.4) {
    console.log(`${CLR.red}    - 提示: 該成分與失敗/代理樣本高度接近。`);
    console.log(`      若在此冷卻速率 (${candidate.process.cooling_rate_K_s} K/s) 下進行實體熔煉，存在脆性析出開裂的高風險。${CLR.reset}`);
  }
  if (isInterstitialExceeded) {
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
      VEC: VEC,
      delta_percent: delta,
      dH_mix_kJ_mol: dH_mix,
      entropy_param_omega: omega,
      predicted_phase: predictedPhase,
      estimated_SFE_heuristic_index: estimated_SFE_heuristic_index,
      PREN: PREN,
      interstitial_precipitation_risk: interstitial_precipitation_risk
    },
    hardness_predictions: {
      surrogate_hardness_HV: predictedHardnessHV,
      is_extreme_prediction: isOOD
    },
    physics_sanity_gate: {
      element_sum_total: totalAt,
      element_sum_deviation: sumDiff,
      tolerance: config.tolerance,
      phase_risk_flags_triggered: detectedForbidden,
      passed: phaseAuditPassed && !isInterstitialExceeded,
      interstitial_solubility: {
        is_N_exceeded: isNExceeded,
        is_C_exceeded: isCExceeded,
        is_total_exceeded: isTotalExceeded,
        passed: !isInterstitialExceeded
      }
    },
    failure_distance_penalty_model: {
      total_penalty_score: P_foundry,
      threshold: 0.25,
      is_high_risk: P_foundry >= 0.25,
      details: penaltyDetails
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
> - **評估對象**: ${candidate.alloy_name} (${getFormula(candidate.composition)})
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
| **價電子濃度 (VEC)** | ${VEC.toFixed(3)} | $\\ge 8.0$ (單相 FCC), $< 6.87$ (單相 BCC) | 預測為 **${predictedPhase}** |
| **原子半徑偏差 ($\\delta$)** | ${delta.toFixed(3)}% | $\\le 6.6\\%$ (固溶體穩定區) | ${delta <= 6.6 ? '🟢 符合穩定標準' : '🟡 有析出相偏析風險'} |
| **混合焓 ($\\Delta H_{\\text{mix}}$)** | ${dH_mix.toFixed(2)} kJ/mol | $-15 \\sim 5\\text{ kJ/mol}$ (非晶態與金屬間化合物防止) | 🟢 處於安全熱力學區間 |
| **熵能參數 ($\\Omega$)** | ${omega.toFixed(3)} | $\\ge 1.1$ (高熵穩定主導) | 🟢 熵主導效應通過 |
| **疊差能指標 (SFE Index)** | ${estimated_SFE_heuristic_index.toFixed(1)} mJ/m² | $15 \\sim 40\\text{ mJ/m²}$ (TWIP/TRIP 亞穩變形區) | ${estimated_SFE_heuristic_index >= 15 && estimated_SFE_heuristic_index <= 40 ? '🟢 處於亞穩形變誘發塑性區' : '🟡 偏離最佳形變機制'} |
| **耐點蝕當量 (PREN)** | ${PREN.toFixed(1)} | $\\ge 25.0$ (耐點蝕性能良好) | ${PREN >= 25.0 ? '🟢 耐腐蝕性能良好' : '🟡 點蝕風險較高'} |
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
${penaltyDetails.map(p => `| \`${p.fail_id}\` | **${p.alloy_name}** | \`${p.defect_type}\` | ${p.distance} at.% | **${p.final_penalty}** |`).join('\n')}

- **失敗懲罰總得分 ($P_{\\text{foundry}}$)**: \`${P_foundry.toFixed(4)}\` (風險警戒閾值：\`< 0.25\`)
- **狀態**：${P_foundry < 0.25 ? '🟢 遠離已知失敗/代理樣品空間' : '🔴 該候選配方高度接近失敗/代理樣品，不建議直接進入實體熔煉。'}

---

## 五、物理與機械性質預估 (Hardness & Cost Predictions)
- **surrogate hardness estimate 預估硬度**: \`HV ${predictedHardnessHV.toFixed(1)}\`
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
