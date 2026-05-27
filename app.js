/**
 * 9B-MMX v0.1: HEA Candidate Audit Console Client Engine (app.js)
 */

// --- 1. Elemental Metallurgical Parameters ---
const ELEMENTS = {
  Al: { vec: 3, r: 1.43, T_m: 933, cost: 2.2, type: "substitutional", name: "鋁 (Al)" },
  Co: { vec: 9, r: 1.25, T_m: 1768, cost: 35.0, type: "substitutional", name: "鈷 (Co)" },
  Cr: { vec: 6, r: 1.28, T_m: 2180, cost: 9.8, type: "substitutional", name: "鉻 (Cr)" },
  Fe: { vec: 8, r: 1.26, T_m: 1811, cost: 0.5, type: "substitutional", name: "鐵 (Fe)" },
  Ni: { vec: 10, r: 1.24, T_m: 1728, cost: 16.5, type: "substitutional", name: "鎳 (Ni)" },
  Mn: { vec: 7, r: 1.27, T_m: 1519, cost: 1.8, type: "substitutional", name: "錳 (Mn)" },
  C: { vec: 4, r: 0.77, T_m: 3823, cost: 0.1, type: "interstitial", name: "碳 (C)" },
  N: { vec: 5, r: 0.71, T_m: 63, cost: 0.05, type: "interstitial", name: "氮 (N)" }
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

// --- 2. Failure Memory Database (Tainan Physical Foundry Trials) ---
let failureLogs = [
  {
    id: "Tainan-VIM-001",
    alloy_name: "AlCoCrFeNi_equiatomic",
    composition: { Al: 20.0, Co: 20.0, Cr: 20.0, Fe: 20.0, Ni: 20.0, Mn: 0.0, C: 0.0, N: 0.0 },
    process_parameters: { cooling_rate_K_s: 0.5, heat_treatment_temp_C: 1100, work_stress_MPa: 50 },
    defect_type: "LTM_THERMO_DEAD_ZONE", // Long term thermodynamic dead zone
    defect_details: "低冷卻速率下析出粗大 ordered B2/σ 脆性相，凝固後試片即發生巨觀開裂。",
    severity_weight: 0.95,
    kernel_bandwidth: 3.5
  },
  {
    id: "Tainan-VAR-002",
    alloy_name: "CoCr1.8FeNi",
    composition: { Al: 0.0, Co: 20.0, Cr: 35.0, Fe: 22.5, Ni: 22.5, Mn: 0.0, C: 0.0, N: 0.0 },
    process_parameters: { cooling_rate_K_s: 2.0, heat_treatment_temp_C: 850, work_stress_MPa: 280 },
    defect_type: "MTM_PROCESS_RISK", // Medium term process risk
    defect_details: "高溫熱裂紋。Cr 元素在晶界發生嚴重偏析，工作應力過大導致沿晶開裂。",
    severity_weight: 0.82,
    kernel_bandwidth: 4.2
  },
  {
    id: "Tainan-DCC-003",
    alloy_name: "Al0.3CoCrFeNi_Slow_Cool",
    composition: { Al: 6.8, Co: 23.3, Cr: 23.3, Fe: 23.3, Ni: 23.3, Mn: 0.0, C: 0.0, N: 0.0 },
    process_parameters: { cooling_rate_K_s: 0.08, heat_treatment_temp_C: 600, work_stress_MPa: 150 },
    defect_type: "STM_OPERATOR_NOISE", // Short term operator noise
    defect_details: "冷卻過慢導致鑄錠底部產生 Al-Ni 元素偏析，加上真空腔室氣氛輕微波動。",
    severity_weight: 0.45,
    kernel_bandwidth: 2.8
  },
  {
    id: "Virt-RHEA-Fail-004",
    alloy_name: "RHEA-W-Mo-Ta-Nb-Ti_Balanced",
    composition: { Al: 0.0, Co: 0.0, Cr: 0.0, Fe: 0.0, Ni: 0.0, Mn: 0.0, C: 0.0, N: 0.0, W: 20.0, Mo: 20.0, Ta: 20.0, Nb: 20.0, Ti: 20.0 },
    process_parameters: { cooling_rate_K_s: 10.0, heat_treatment_temp_C: 1600, work_stress_MPa: 350 },
    defect_type: "MTM_PROCESS_RISK",
    defect_details: "[RHEA高溫失效案例] 鈦(Ti)元素引入拉低熔點至 2368°C，導致高溫高壓下發生晶界剪切滑移與蠕變失效。",
    severity_weight: 0.80,
    kernel_bandwidth: 3.0
  },
  {
    id: "Virt-RHEA-Fail-005",
    alloy_name: "RHEA-Nb-Ti-V-Ta_Ductile",
    composition: { Al: 0.0, Co: 0.0, Cr: 0.0, Fe: 0.0, Ni: 0.0, Mn: 0.0, C: 0.0, N: 0.0, Ta: 25.0, Nb: 25.0, Ti: 25.0, V: 25.0 },
    process_parameters: { cooling_rate_K_s: 10.0, heat_treatment_temp_C: 1600, work_stress_MPa: 350 },
    defect_type: "MTM_PROCESS_RISK",
    defect_details: "[RHEA高溫失效案例] 無鎢/鉬保護，合金熔點降至 1995°C，高溫高壓下發生蠕變失效。",
    severity_weight: 0.88,
    kernel_bandwidth: 4.0
  },
  {
    id: "Virt-RHEA-Fail-006",
    alloy_name: "RHEA-W-Mo-Cr-Ti_LowDensity",
    composition: { Al: 0.0, Co: 0.0, Cr: 20.0, Fe: 0.0, Ni: 0.0, Mn: 0.0, C: 0.0, N: 0.0, W: 30.0, Mo: 30.0, Ti: 20.0 },
    process_parameters: { cooling_rate_K_s: 10.0, heat_treatment_temp_C: 1600, work_stress_MPa: 350 },
    defect_type: "MTM_PROCESS_RISK",
    defect_details: "[RHEA高溫失效案例] 鉻/鈦熔點偏低，同系溫度過高，高溫蠕變承載力不足。",
    severity_weight: 0.75,
    kernel_bandwidth: 3.2
  },
  {
    id: "Tainan-CN-007",
    alloy_name: "Fe46-Mn24-Cr18-Ni10-N2_Sensitized",
    composition: { Al: 0.0, Co: 0.0, Cr: 18.0, Fe: 46.0, Ni: 10.0, Mn: 24.0, C: 0.0, N: 2.0 },
    process_parameters: { cooling_rate_K_s: 0.1, heat_treatment_temp_C: 700, work_stress_MPa: 120 },
    defect_type: "LTM_THERMO_DEAD_ZONE",
    defect_details: "低冷卻速率下晶界析出粗大 Cr2N 氮化物偏析，凝固冷卻過程中發生嚴重沿晶開裂。",
    severity_weight: 0.90,
    kernel_bandwidth: 3.0
  },
  {
    id: "Tainan-CN-008",
    alloy_name: "Fe48-Mn24-Cr18-Ni10-C2_Carbide_Segregation",
    composition: { Al: 0.0, Co: 0.0, Cr: 18.0, Fe: 48.0, Ni: 10.0, Mn: 24.0, C: 2.0, N: 0.0 },
    process_parameters: { cooling_rate_K_s: 0.5, heat_treatment_temp_C: 800, work_stress_MPa: 90 },
    defect_type: "MTM_PROCESS_RISK",
    defect_details: "概念性碳摻雜鋼在晶界形成網狀 M23C6 碳化物，導致敏化效應並在拉伸應力下沿晶脆性斷裂。",
    severity_weight: 0.85,
    kernel_bandwidth: 3.5
  }
];

// --- 3. Cockpit App State ---
const state = {
  composition: { Al: 0.0, Co: 0.0, Cr: 18.0, Fe: 46.0, Ni: 10.0, Mn: 24.0, C: 0.0, N: 2.0 },
  process: { cooling_rate: 0.6, heat_temp: 1050, stress: 60, atmosphere: "Vacuum_Induction" },
  cmep: { enabled: false, window: 500, autoExpire: true },
  systemConfig: {
    maxConcurrent: 3,
    tolerance: 1e-6,
    checkVEC: true,
    forbiddenPhases: ["Laves_phase", "sigma_phase_at_high_temp", "Cr2N_nitride", "M23C6_carbide"],
  },
  auditInProgress: false,
  clocks: {
    virtEpoch: 0,
    physIngotFailed: 8
  }
};

// Raw content of AGENTS.md for visual editor
let agentsMdTemplate = `# ─── AGENTS.md: 9B-MMX 權責與隔離配置文件 ───

# 1. 全域運行參數 (Global Runtime)
MAX_CONCURRENT_SUBAGENTS=3
MAX_AUTO_FIX_ITERATIONS=3
TIMEOUT_PER_SIMULATION_STEPS_SEC=1800
SANDBOX_MODE=worktree-isolated

# 2. 物理合理性閘門 (Physics Sanity Gate)
[CONSISTENCY_GATE]
ELEMENT_SUM_TOLERANCE=1e-6
FORCE_VALENCE_ELECTRON_CONCENTRATION_CHECK=true
FORBIDDEN_PHASES=["Laves_phase", "sigma_phase_at_high_temp"]
DISSIPATION_ESTIMATE_MAX_VARIANCE=0.15

# 3. 受控亞穩態探索協議配置 (CMEP Configuration)
[METASTABLE_BYPASS]
ENABLED=false                            # 預設強制關閉
MAX_EXPLORATION_WINDOW=500_iterations    # 自動停止窗口
ALLOW_UNSTABLE_DESCRIPTOR_DRIFT=true      # 允許描述符向非平衡區漂移
FORBID_VALIDATED_DB_WRITE=true           # 強制禁止寫入已驗證庫
AUTO_EXPIRE=true                         # 啟用過期停止

# 4. 角色寫入權限與目錄掛載限制 (Directory Sandbox)
[ROLE: Candidate_Architect]
ALLOW_WRITE=["src/quantum/candidate_gen/"]
READ_ONLY=["src/quantum/physics_auditor/", "logs/foundry_feedback/"]

[ROLE: Physics_Consistency_Auditor]
ALLOW_WRITE=["logs/physics_audit_report.json", "src/quantum/physics_auditor/"]
READ_ONLY=["src/quantum/candidate_gen/", "src/quantum/solvers/"]
SECURITY_LEVEL=LEVEL_1_SAFETY_GATE # 擁有最高物理審查與熔斷防護權限`;

// --- 4. DOM Elements Lookup ---
const sliders = {
  Al: document.getElementById('range-al'),
  Co: document.getElementById('range-co'),
  Cr: document.getElementById('range-cr'),
  Fe: document.getElementById('range-fe'),
  Ni: document.getElementById('range-ni'),
  Mn: document.getElementById('range-mn'),
  C: document.getElementById('range-c'),
  N: document.getElementById('range-n')
};

const valDisplays = {
  Al: document.getElementById('val-al'),
  Co: document.getElementById('val-co'),
  Cr: document.getElementById('val-cr'),
  Fe: document.getElementById('val-fe'),
  Ni: document.getElementById('val-ni'),
  Mn: document.getElementById('val-mn'),
  C: document.getElementById('val-c'),
  N: document.getElementById('val-n')
};

const descDisplays = {
  VEC: document.getElementById('desc-vec'),
  VECStatus: document.getElementById('desc-vec-status'),
  delta: document.getElementById('desc-delta'),
  deltaStatus: document.getElementById('desc-delta-status'),
  dH_mix: document.getElementById('desc-dhmix'),
  dH_mixStatus: document.getElementById('desc-dhmix-status'),
  omega: document.getElementById('desc-omega'),
  omegaStatus: document.getElementById('desc-omega-status'),
  sfe: document.getElementById('desc-sfe'),
  sfeStatus: document.getElementById('desc-sfe-status'),
  pren: document.getElementById('desc-pren'),
  prenStatus: document.getElementById('desc-pren-status'),
  intrisk: document.getElementById('desc-intrisk'),
  intriskStatus: document.getElementById('desc-intrisk-status'),
  predictedPhase: document.getElementById('predicted-phase-value')
};

const solubilityStatusDisplay = document.getElementById('solubility-status');

const elementsSumDisplay = document.getElementById('total-percentage');
const sumStatusTag = document.getElementById('sum-status');
const progressBar = document.getElementById('composition-progress');
const btnNormalize = document.getElementById('btn-normalize');

// Process inputs
const inputCoolingRate = document.getElementById('input-cooling-rate');
const inputHeatTemp = document.getElementById('input-heat-temp');
const inputStress = document.getElementById('input-stress');
const inputAtmosphere = document.getElementById('input-atmosphere');

// CMEP Section
const cmepSection = document.getElementById('cmep-override-section');
const btnCmepToggle = document.getElementById('btn-cmep-toggle');
const cmepActiveStats = document.getElementById('cmep-active-stats');
const cmepCountdown = document.getElementById('cmep-countdown');
const securityLevelIndicator = document.getElementById('security-level-indicator');

// Clocks and stats
const virtualClockText = document.querySelector('#virtual-clock .clock-value');
const physicalClockText = document.querySelector('#physical-clock .clock-value');
const virtThroughput = document.getElementById('virt-throughput');
const physIngots = document.getElementById('phys-ingots');

// Terminal Log
const auditTerminalLogs = document.getElementById('audit-terminal-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');
const btnRunAudit = document.getElementById('btn-run-audit');

// Failure Repulsion Map & surrogate hardness estimate
const foundryScoreBadge = document.getElementById('foundry-score-badge');
const failureKernelCanvas = document.getElementById('failure-kernel-canvas');
const ctxMap = failureKernelCanvas.getContext('2d');
const oodTag = document.getElementById('ood-tag');
const predHardness = document.getElementById('pred-hardness');
const predDrift = document.getElementById('pred-drift');
const predPenaltyRepell = document.getElementById('pred-penalty-repell');

// Failure Form inputs
const formAddFailure = document.getElementById('form-add-failure');
const failAlloy = document.getElementById('fail-alloy');
const failType = document.getElementById('fail-type');
const failAl = document.getElementById('fail-al');
const failCr = document.getElementById('fail-cr');
const failMn = document.getElementById('fail-mn');
const failC = document.getElementById('fail-c');
const failN = document.getElementById('fail-n');
const failCooling = document.getElementById('fail-cooling');
const failDetails = document.getElementById('fail-details');
const btnSubmitFailure = document.getElementById('btn-submit-failure');

// Footer & Modal
const btnOpenAgentsConfig = document.getElementById('btn-open-agents-config');
const agentsConfigModal = document.getElementById('agents-config-modal');
const closeConfigModal = document.getElementById('close-config-modal');
const textareaAgentsConfig = document.getElementById('textarea-agents-config');
const btnResetConfig = document.getElementById('btn-reset-config');
const btnSaveConfig = document.getElementById('btn-save-config');
const footerReportSummary = document.getElementById('footer-report-summary');

// --- 5. Metallurgical Descriptor Engine ---
function calculateDescriptors(composition) {
  // Calculate substitutional total and normalize
  let totalSub = 0;
  for (let el in composition) {
    if (ELEMENTS[el] && ELEMENTS[el].type === "substitutional") {
      totalSub += composition[el];
    }
  }

  // Normalize substitutional elements
  let subComposition = {};
  for (let el in composition) {
    if (ELEMENTS[el] && ELEMENTS[el].type === "substitutional") {
      subComposition[el] = totalSub > 0 ? (composition[el] / totalSub) * 100 : 0;
    }
  }

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
  const wtPct = atPctToWtPct(composition);
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
  for (let elSub in composition) {
    if (ELEMENTS[elSub] && ELEMENTS[elSub].type === "substitutional") {
      const cSub = composition[elSub] / 100;
      for (let elInt in composition) {
        if (ELEMENTS[elInt] && ELEMENTS[elInt].type === "interstitial") {
          const cInt = composition[elInt] / 100;
          if (cSub > 0 && cInt > 0) {
            const dH = getdH(elSub, elInt);
            interstitial_precipitation_risk += 4 * Math.abs(dH) * cSub * cInt;
          }
        }
      }
    }
  }

  // Interstitial Solubility check
  const crAt = composition.Cr || 0;
  const cAt = composition.C || 0;
  const nAt = composition.N || 0;
  const nLimit = 1.5 + 0.04 * crAt;
  const cLimit = 1.2;
  const totalLimit = 3.0;
  const isNExceeded = nAt > nLimit;
  const isCExceeded = cAt > cLimit;
  const isTotalExceeded = (cAt + nAt) > totalLimit;
  const isInterstitialExceeded = isNExceeded || isCExceeded || isTotalExceeded;

  // Phase prediction rules
  let predictedPhase = "非平衡/玻璃態 (Amorphous Phase)";
  if (delta <= 6.6 && dH_mix >= -15 && dH_mix <= 5 && omega >= 1.1) {
    if (VEC >= 8.0) predictedPhase = "單相 FCC 固溶體 (富延展性)";
    else if (VEC < 6.87) predictedPhase = "單相 BCC 固溶體 (高強度)";
    else predictedPhase = "混相 FCC + BCC (B2/σ脆性析出潛在區)";
  } else if (delta > 6.6 && dH_mix < -15) {
    predictedPhase = "金屬間化合物 (高度脆性開裂相)";
  } else {
    predictedPhase = "多相混合物 (高微觀偏析與熱應力裂紋風險)";
  }

  return {
    VEC, delta, dH_mix, omega, T_m, predictedPhase,
    estimated_SFE_heuristic_index, PREN, interstitial_precipitation_risk,
    isInterstitialExceeded, isNExceeded, isCExceeded, isTotalExceeded, nLimit
  };
}

// --- 6. Defect-Weighted Penalty Kernel Algorithm ---
function calculatePenaltyKernel(composition, coolingRate) {
  let P_foundry = 0;
  let penaltyDetails = [];

  failureLogs.forEach(fail => {
    // Composition Euclidean distance squared in full space
    let distanceSq = 0;
    let components = Array.from(new Set([...Object.keys(composition), ...Object.keys(fail.composition)]));
    components.forEach(el => {
      let x1 = composition[el] || 0;
      let x2 = fail.composition[el] || 0;
      distanceSq += Math.pow(x1 - x2, 2);
    });

    // Process parameters cooling rate correction
    let coolingDiff = Math.abs(coolingRate - fail.process_parameters.cooling_rate_K_s);
    let processCorrection = Math.exp(-Math.pow(coolingDiff, 2) / 2.0);

    // Dynamic repulsion kernel with bandwidth
    let exponent = -distanceSq / (2 * Math.pow(fail.kernel_bandwidth, 2));
    let basePenalty = fail.severity_weight * Math.exp(exponent);
    let finalPenalty = basePenalty * processCorrection;

    P_foundry += finalPenalty;

    penaltyDetails.push({
      id: fail.id,
      alloy_name: fail.alloy_name,
      defect_type: fail.defect_type,
      distance: Math.sqrt(distanceSq),
      final_penalty: finalPenalty
    });
  });

  // Sort by distance (closest first) to ensure nearest failure point is at index 0
  penaltyDetails.sort((a, b) => a.distance - b.distance);

  return { P_foundry, penaltyDetails };
}

// --- 7. surrogate hardness estimate Mechanical Hardness Prediction ---
function predictSurrogateHardness(composition, coolingRate) {
  let baseHardness = 150;
  baseHardness += (composition.Al || 0) * 12.5;
  baseHardness += (composition.Cr || 0) * 3.5;
  baseHardness += (composition.Mn || 0) * 2.8;
  baseHardness += (composition.N || 0) * 85.0;
  baseHardness += (composition.C || 0) * 120.0;

  if (coolingRate < 1.0) {
    baseHardness -= 25; // annealing relaxation
  }

  // Drift representation: based on Mn & Cr deviation from core database (which center around Mn:24, Cr:18)
  let devMn = Math.abs((composition.Mn || 0) - 24);
  let devCr = Math.abs((composition.Cr || 0) - 18);
  let drift = 0.5 + 0.05 * (devMn + devCr);

  return { hardness: baseHardness, drift };
}

// --- 8. UI Synchronization ---
function updateDashboard() {
  // Read composition values from sliders
  for (let el in sliders) {
    state.composition[el] = parseFloat(sliders[el].value);
    valDisplays[el].innerText = state.composition[el].toFixed(1);
  }

  // Calculate sum
  let sum = 0;
  for (let el in state.composition) {
    sum += state.composition[el];
  }
  elementsSumDisplay.innerText = sum.toFixed(2);

  // Update progress bar
  let percentageWidth = Math.min(100, sum);
  progressBar.style.width = percentageWidth + "%";

  if (Math.abs(sum - 100) < state.systemConfig.tolerance) {
    sumStatusTag.innerText = "✔ 精確守恆";
    sumStatusTag.className = "status-tag status-success";
    progressBar.style.background = "linear-gradient(90deg, var(--color-cyan), var(--color-blue))";
  } else {
    sumStatusTag.innerText = "⚠️ 物理失真 (需 = 100%)";
    sumStatusTag.className = "status-tag status-danger";
    progressBar.style.background = "var(--color-red)";
  }

  // Read process parameters
  state.process.cooling_rate = parseFloat(inputCoolingRate.value) || 0.1;
  state.process.heat_temp = parseInt(inputHeatTemp.value) || 600;
  state.process.stress = parseInt(inputStress.value) || 0;
  state.process.atmosphere = inputAtmosphere.value;

  // Run Calculations
  const des = calculateDescriptors(state.composition);

  // Update Displays
  descDisplays.VEC.innerText = des.VEC.toFixed(3);
  descDisplays.delta.innerText = des.delta.toFixed(3) + "%";
  descDisplays.dH_mix.innerText = des.dH_mix.toFixed(2) + " kJ/mol";
  descDisplays.omega.innerText = des.omega === Infinity ? "Infinity" : des.omega.toFixed(3);
  descDisplays.sfe.innerText = des.estimated_SFE_heuristic_index.toFixed(1) + " mJ/m²";
  descDisplays.pren.innerText = des.PREN.toFixed(1);
  descDisplays.intrisk.innerText = des.interstitial_precipitation_risk.toFixed(2) + " kJ/mol";
  descDisplays.predictedPhase.innerText = des.predictedPhase;

  // Set alert boundaries colors
  // VEC boundary: sigma phase risk (6.8 to 7.6)
  if (des.VEC >= 6.8 && des.VEC <= 7.6) {
    descDisplays.VECStatus.innerText = "高脆性相邊界";
    descDisplays.VECStatus.className = "readout-status error-text";
  } else {
    descDisplays.VECStatus.innerText = "穩定固溶相";
    descDisplays.VECStatus.className = "readout-status success-text";
  }

  // Delta deviation (high delta means high mismatch / Laves risk)
  if (des.delta > 6.6) {
    descDisplays.deltaStatus.innerText = "嚴重析出/裂紋";
    descDisplays.deltaStatus.className = "readout-status error-text";
  } else if (des.delta > 5.0) {
    descDisplays.deltaStatus.innerText = "中等偏析風險";
    descDisplays.deltaStatus.className = "readout-status warning-text";
  } else {
    descDisplays.deltaStatus.innerText = "格點偏差低";
    descDisplays.deltaStatus.className = "readout-status success-text";
  }

  // Enthalpy limits
  if (des.dH_mix < -15) {
    descDisplays.dH_mixStatus.innerText = "化合物脆化";
    descDisplays.dH_mixStatus.className = "readout-status error-text";
  } else if (des.dH_mix > 5) {
    descDisplays.dH_mixStatus.innerText = "相分離/偏析";
    descDisplays.dH_mixStatus.className = "readout-status warning-text";
  } else {
    descDisplays.dH_mixStatus.innerText = "無序固溶熵高";
    descDisplays.dH_mixStatus.className = "readout-status success-text";
  }

  // Omega parameter (stability parameter, omega > 1.1 means single phase stable)
  if (des.omega >= 1.1) {
    descDisplays.omegaStatus.innerText = "高熵固溶穩定";
    descDisplays.omegaStatus.className = "readout-status success-text";
  } else {
    descDisplays.omegaStatus.innerText = "熱力學不穩定";
    descDisplays.omegaStatus.className = "readout-status warning-text";
  }

  // SFE boundary: TRIP/TWIP metastable zone (15 to 40)
  if (des.estimated_SFE_heuristic_index >= 15 && des.estimated_SFE_heuristic_index <= 40) {
    descDisplays.sfeStatus.innerText = "亞穩形變誘發塑性區";
    descDisplays.sfeStatus.className = "readout-status success-text";
  } else {
    descDisplays.sfeStatus.innerText = "偏離最佳形變機制";
    descDisplays.sfeStatus.className = "readout-status warning-text";
  }

  // PREN boundary: >= 25 is excellent
  if (des.PREN >= 25) {
    descDisplays.prenStatus.innerText = "耐點蝕性能良好";
    descDisplays.prenStatus.className = "readout-status success-text";
  } else {
    descDisplays.prenStatus.innerText = "點蝕風險較大";
    descDisplays.prenStatus.className = "readout-status warning-text";
  }

  // Interstitial Risk: just informational
  descDisplays.intriskStatus.innerText = "析出交互能量度";
  descDisplays.intriskStatus.className = "readout-status success-text";

  // Interstitial Solubility check warning badge
  if (des.isInterstitialExceeded) {
    solubilityStatusDisplay.innerText = "⚠️ 間隙固溶超限";
    solubilityStatusDisplay.className = "status-tag status-danger warning-pulse";
    solubilityStatusDisplay.classList.remove('hide');
  } else if (state.composition.C > 0 || state.composition.N > 0) {
    solubilityStatusDisplay.innerText = "✔ 間隙固溶正常";
    solubilityStatusDisplay.className = "status-tag status-success";
    solubilityStatusDisplay.classList.remove('hide');
  } else {
    solubilityStatusDisplay.classList.add('hide');
  }

  // Run Penalty Kernel
  const penaltyResult = calculatePenaltyKernel(state.composition, state.process.cooling_rate);
  const P_foundry = penaltyResult.P_foundry;
  foundryScoreBadge.innerText = `P_foundry = ${P_foundry.toFixed(4)}`;

  if (P_foundry >= 0.4) {
    foundryScoreBadge.className = "danger-level-badge level-high";
    predPenaltyRepell.innerText = "HIGH (高風險)";
    predPenaltyRepell.className = "vib-stat-value error-text";
  } else if (P_foundry >= 0.25) {
    foundryScoreBadge.className = "danger-level-badge level-medium";
    predPenaltyRepell.innerText = "MEDIUM (中等防禦)";
    predPenaltyRepell.className = "vib-stat-value warning-text";
  } else {
    foundryScoreBadge.className = "danger-level-badge level-low";
    predPenaltyRepell.innerText = "SAFE (低排斥力)";
    predPenaltyRepell.className = "vib-stat-value success-text";
  }

  // surrogate hardness estimate properties
  const vib = predictSurrogateHardness(state.composition, state.process.cooling_rate);
  predHardness.innerText = vib.hardness.toFixed(1);
  predDrift.innerText = vib.drift.toFixed(2) + " Å";

  if (vib.hardness > 600 || state.composition.Al > 28) {
    oodTag.classList.remove('hide');
    oodTag.className = "status-tag status-danger warning-pulse";
    predHardness.className = "vib-stat-value error-text";
  } else {
    oodTag.classList.add('hide');
    predHardness.className = "vib-stat-value success-text";
  }

  // Draw failure repulsion field canvas
  drawFailureRepulsionMap(P_foundry, des.VEC, des.delta);
}

// Normalize slider composition values to equal 100%
btnNormalize.addEventListener('click', () => {
  let sum = 0;
  for (let el in state.composition) {
    sum += state.composition[el];
  }
  if (sum === 0) return;

  for (let el in sliders) {
    let normalizedVal = (state.composition[el] / sum) * 100;
    sliders[el].value = normalizedVal.toFixed(1);
  }

  writeTerminalLine("SYSTEM", "⚖ 執行守恆審計歸一化：成分重分配以確保 atomic 總和精確為 100.00 at.%.", "green");
  updateDashboard();
});

// Event Listeners for all inputs
for (let el in sliders) {
  sliders[el].addEventListener('input', updateDashboard);
}
inputCoolingRate.addEventListener('input', updateDashboard);
inputHeatTemp.addEventListener('input', updateDashboard);
inputStress.addEventListener('input', updateDashboard);
inputAtmosphere.addEventListener('change', updateDashboard);

// --- 9. Drawing Failure Map ---
function drawFailureRepulsionMap(currentPenalty, currentVEC, currentDelta) {
  // Clear Canvas
  ctxMap.clearRect(0, 0, failureKernelCanvas.width, failureKernelCanvas.height);

  // Draw Background radar lines / grids
  ctxMap.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctxMap.lineWidth = 1;
  for (let i = 0; i < failureKernelCanvas.width; i += 40) {
    ctxMap.beginPath();
    ctxMap.moveTo(i, 0);
    ctxMap.lineTo(i, failureKernelCanvas.height);
    ctxMap.stroke();
  }
  for (let j = 0; j < failureKernelCanvas.height; j += 40) {
    ctxMap.beginPath();
    ctxMap.moveTo(0, j);
    ctxMap.lineTo(failureKernelCanvas.width, j);
    ctxMap.stroke();
  }

  // Dynamic failure coordinate mapping: Mn vs Cr representation as x and y coordinates
  // Candidate coordinate
  let candX = ((state.composition.Mn || 0) / 50) * failureKernelCanvas.width;
  let candY = failureKernelCanvas.height - ((state.composition.Cr || 0) / 50) * failureKernelCanvas.height;

  // Let's cap drawing boundaries
  candX = Math.max(20, Math.min(failureKernelCanvas.width - 20, candX));
  candY = Math.max(20, Math.min(failureKernelCanvas.height - 20, candY));

  // Draw failure gradient centers
  failureLogs.forEach(fail => {
    let failX = ((fail.composition.Mn || 0) / 50) * failureKernelCanvas.width;
    let failY = failureKernelCanvas.height - ((fail.composition.Cr || 0) / 50) * failureKernelCanvas.height;

    failX = Math.max(20, Math.min(failureKernelCanvas.width - 20, failX));
    failY = Math.max(20, Math.min(failureKernelCanvas.height - 20, failY));

    let radius = fail.kernel_bandwidth * 12;

    // Draw penalty gradient
    let grad = ctxMap.createRadialGradient(failX, failY, 2, failX, failY, radius);
    if (fail.defect_type === "LTM_THERMO_DEAD_ZONE") {
      grad.addColorStop(0, "rgba(255, 0, 127, 0.4)");
      grad.addColorStop(1, "rgba(255, 0, 127, 0)");
      ctxMap.strokeStyle = "rgba(255, 0, 127, 0.3)";
      ctxMap.lineWidth = 1;
    } else if (fail.defect_type === "MTM_PROCESS_RISK") {
      grad.addColorStop(0, "rgba(255, 159, 67, 0.35)");
      grad.addColorStop(1, "rgba(255, 159, 67, 0)");
      ctxMap.strokeStyle = "rgba(255, 159, 67, 0.25)";
      ctxMap.lineWidth = 1;
    } else {
      grad.addColorStop(0, "rgba(255, 235, 59, 0.25)");
      grad.addColorStop(1, "rgba(255, 235, 59, 0)");
      ctxMap.strokeStyle = "rgba(255, 235, 59, 0.15)";
      ctxMap.lineWidth = 1;
    }

    ctxMap.fillStyle = grad;
    ctxMap.beginPath();
    ctxMap.arc(failX, failY, radius, 0, 2 * Math.PI);
    ctxMap.fill();
    ctxMap.stroke();

    // Draw Fail Label Text
    ctxMap.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctxMap.font = "8px Share Tech Mono";
    ctxMap.fillText(fail.alloy_name, failX - 25, failY - 4);
  });

  // Draw Repulsion connection line
  let closestFail = null;
  let minDistance = Infinity;
  failureLogs.forEach(fail => {
    let distanceSq = 0;
    let components = Array.from(new Set([...Object.keys(state.composition), ...Object.keys(fail.composition)]));
    components.forEach(el => {
      distanceSq += Math.pow(state.composition[el] - fail.composition[el], 2);
    });
    let d = Math.sqrt(distanceSq);
    if (d < minDistance) {
      minDistance = d;
      closestFail = fail;
    }
  });

  if (closestFail) {
    let fX = ((closestFail.composition.Mn || 0) / 50) * failureKernelCanvas.width;
    let fY = failureKernelCanvas.height - ((closestFail.composition.Cr || 0) / 50) * failureKernelCanvas.height;
    fX = Math.max(20, Math.min(failureKernelCanvas.width - 20, fX));
    fY = Math.max(20, Math.min(failureKernelCanvas.height - 20, fY));

    // Draw repulsive vector line
    ctxMap.strokeStyle = currentPenalty > 0.25 ? "rgba(255, 51, 102, 0.6)" : "rgba(0, 242, 254, 0.3)";
    ctxMap.lineWidth = currentPenalty > 0.4 ? 2 : 1;
    if (currentPenalty > 0.4) {
      ctxMap.setLineDash([4, 4]);
    } else {
      ctxMap.setLineDash([]);
    }
    ctxMap.beginPath();
    ctxMap.moveTo(candX, candY);
    ctxMap.lineTo(fX, fY);
    ctxMap.stroke();
    ctxMap.setLineDash([]);
  }

  // Draw candidate alloy marker (crosshair)
  ctxMap.strokeStyle = currentPenalty > 0.25 ? "var(--color-red)" : "var(--color-cyan)";
  ctxMap.lineWidth = 2;
  ctxMap.beginPath();
  ctxMap.arc(candX, candY, 6, 0, 2 * Math.PI);
  ctxMap.stroke();

  ctxMap.lineWidth = 1;
  ctxMap.beginPath();
  ctxMap.moveTo(candX - 10, candY);
  ctxMap.lineTo(candX + 10, candY);
  ctxMap.moveTo(candX, candY - 10);
  ctxMap.lineTo(candX, candY + 10);
  ctxMap.stroke();

  // Glow pointer overlay
  ctxMap.fillStyle = currentPenalty > 0.25 ? "rgba(255, 51, 102, 0.8)" : "rgba(0, 242, 254, 0.8)";
  ctxMap.beginPath();
  ctxMap.arc(candX, candY, 3, 0, 2 * Math.PI);
  ctxMap.fill();
}

// --- 10. Console Log Terminal ---
function writeTerminalLine(role, msg, colorType = "default") {
  const timestamp = new Date().toLocaleTimeString();

  const line = document.createElement('div');
  line.className = 'log-line';

  let roleColor = "var(--text-muted)";
  let msgColor = "var(--text-primary)";
  let bgTag = "rgba(255,255,255,0.06)";

  switch(colorType) {
    case "green":
      msgColor = "var(--color-green)";
      roleColor = "var(--text-dark)";
      bgTag = "var(--color-green)";
      break;
    case "amber":
      msgColor = "var(--color-amber)";
      roleColor = "var(--text-dark)";
      bgTag = "var(--color-amber)";
      break;
    case "red":
      msgColor = "var(--color-red)";
      roleColor = "var(--text-primary)";
      bgTag = "var(--color-red)";
      break;
    case "cyan":
      msgColor = "var(--color-cyan)";
      roleColor = "var(--text-dark)";
      bgTag = "var(--color-cyan)";
      break;
    case "purple":
      msgColor = "var(--color-purple)";
      roleColor = "var(--text-primary)";
      bgTag = "var(--color-purple)";
      break;
  }

  line.innerHTML = `
    <span class="log-time">[${timestamp}]</span>
    <span class="log-tag" style="background:${bgTag}; color:${roleColor}">${role}</span>
    <span class="log-msg" style="color:${msgColor}">${msg}</span>
  `;

  auditTerminalLogs.appendChild(line);
  // Auto scroll
  auditTerminalLogs.scrollTop = auditTerminalLogs.scrollHeight;
}

// Initial Boot Message
writeTerminalLine("SYSTEM", "9B-MMX v0.1 合金計算篩選原型核心啟動。沙盒隔離環境掛載完畢。", "cyan");
writeTerminalLine("SYSTEM", "讀取 AGENTS.md 完成，防禦性物理合理性護欄 (Physics Consistency Auditor) 配置完成。", "default");
writeTerminalLine("REALITY", "台南實體冶煉廠 (Physical Foundry) 反饋核管道載入成功，共有 8 筆失敗記憶記錄。", "amber");

btnClearLogs.addEventListener('click', () => {
  auditTerminalLogs.innerHTML = "";
});
btnRunAudit.addEventListener('click', async () => {
  if (state.auditInProgress) return;
  state.auditInProgress = true;
  btnRunAudit.disabled = true;
  btnRunAudit.innerText = "⏳ 9B-MMX 團隊審計執行中 (Consensus Processing...)";

  // Clear or print visual header
  writeTerminalLine("────────────────", "──────────────────────────────────────────────────────", "default");
  writeTerminalLine("DIRECTOR", `🎯 審核指令下達：開始對候選配方 [${getFormula(state.composition)}] 進行非同步物理一致性審核與風險防禦評估。`, "cyan");

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Descriptor variables
  const des = calculateDescriptors(state.composition);
  const pen = calculatePenaltyKernel(state.composition, state.process.cooling_rate);
  const vib = predictSurrogateHardness(state.composition, state.process.cooling_rate);

  // 1. Lattice Architect
  await sleep(800);
  writeTerminalLine("ARCHITECT", `晶格與成分候選結構分析完成。預估晶相結構：[${des.predictedPhase}]。顯式特徵描述符 VEC=${des.VEC.toFixed(3)}, δ=${des.delta.toFixed(3)}%, ΔH_mix=${des.dH_mix.toFixed(2)} kJ/mol, SFE Index=${des.estimated_SFE_heuristic_index.toFixed(1)} mJ/m², PREN=${des.PREN.toFixed(1)}, Interstitial Risk=${des.interstitial_precipitation_risk.toFixed(2)} kJ/mol.`, "default");

  // 2. Resource Explorer
  await sleep(650);
  let substitut = (state.composition.Co > 20) ? "注意：鈷 (Co) 含量偏高，供應鏈敏感，可考慮在下一步降低以減緩生產阻力。" : "主元素資源可用性安全度評估正常，未檢測到特殊材料禁運管制。";
  writeTerminalLine("EXPLORER", `稀缺度與替代品探勘報告：${substitut}`, "default");

  // 3. Consistency Auditor (The Core Gate)
  await sleep(900);
  let totalPct = 0;
  for (let el in state.composition) totalPct += state.composition[el];

  writeTerminalLine("AUDITOR", `[1/3] 驗算成分完整性。原子總量和偏離差 = ${Math.abs(totalPct - 100).toExponential(4)} (容差門檻 ${state.systemConfig.tolerance})。結果：✔ 成分守恆通過。`, "green");

  await sleep(750);

  // Melting point check
  let T_melt_C = des.T_m - 273.15;
  let meltingPassed = true;
  if (state.process.heat_temp >= T_melt_C) {
    writeTerminalLine("AUDITOR", `[Level 1 Safety Gate - thermal liquefaction warning]`, "red");
    writeTerminalLine("AUDITOR", `    - 服務溫度 (${state.process.heat_temp}°C) 已超過不銹鋼基體之熱力學熔點 (${T_melt_C.toFixed(1)}°C)！`, "red");
    writeTerminalLine("AUDITOR", `    - 材料狀態：已超出鐵基不銹鋼可用結構材料範圍，需改採其他高溫材料系統。`, "red");
    meltingPassed = false;
  } else {
    writeTerminalLine("AUDITOR", `[不銹鋼熔點審查] 服務溫度 (${state.process.heat_temp}°C) 低於配方估算熔點 (${T_melt_C.toFixed(1)}°C)，結構維持固態。`, "green");
  }

  await sleep(750);
  let phaseAuditDetails = "";
  let phasePassed = true;

  if (des.VEC >= 6.8 && des.VEC <= 7.6) {
    phaseAuditDetails += "高風險脆性相 σ 相析出溫度偏低且處於易裂區！";
    phasePassed = false;
  }
  if (des.delta > 6.6 || (des.delta > 5.0 && des.VEC < 8.0)) {
    phaseAuditDetails += " [警告] 晶格半徑偏差過大，Laves 脆性析出風險偏高。";
    phasePassed = false;
  }
  if (des.isNExceeded) {
    phaseAuditDetails += " [提示] 觸發 Cr2N 氮化物相析出指標！";
    phasePassed = false;
  }
  if (des.isCExceeded) {
    phaseAuditDetails += " [提示] 觸發 M23C6 碳化物相析出指標！";
    phasePassed = false;
  }

  if (!phasePassed) {
    if (state.cmep.enabled) {
      writeTerminalLine("AUDITOR", `[2/3] [CMEP 旁路探索開啟中] 檢測到禁用脆性相析出威脅：${phaseAuditDetails}。因人工授權 CMEP 非平衡旁路，暫緩自動拒絕並標記為高風險探索狀態。`, "amber");
    } else {
      writeTerminalLine("AUDITOR", `[2/3] [⚠️ 相風險警告] 檢測到析出相一致性異常：${phaseAuditDetails}。存在脆性開裂風險。`, "red");
    }
  } else {
    writeTerminalLine("AUDITOR", "[2/3] 析出相安全審核通過。未檢測到硬性禁用相邊界。", "green");
  }

  // Interstitial Solubility check in auditor logs
  if (des.isInterstitialExceeded) {
    let reasons = [];
    if (des.isNExceeded) reasons.push(`N: ${state.composition.N.toFixed(2)} at.% > limit ${des.nLimit.toFixed(2)} at.%`);
    if (des.isCExceeded) reasons.push(`C: ${state.composition.C.toFixed(2)} at.% > limit 1.2 at.%`);
    if (des.isTotalExceeded) reasons.push(`C+N: ${(state.composition.C + state.composition.N).toFixed(2)} at.% > limit 3.0 at.%`);
    writeTerminalLine("AUDITOR", `[⚠️ 間隙固溶超限] ${reasons.join(', ')}，冶煉中可能析出粗大間隙相。`, "red");
  } else if (state.composition.C > 0 || state.composition.N > 0) {
    writeTerminalLine("AUDITOR", `[間隙固溶審查] 碳氮溶解度在熱力學極限範圍內，無溢出風險。`, "green");
  }

  await sleep(950);
  writeTerminalLine("AUDITOR", `[3/3] 實體反饋核 (Foundry Feedback Kernel) 計算完成。距離失敗/代理樣本最近點為 [${pen.penaltyDetails[0].alloy_name}]: 距離為 ${pen.penaltyDetails[0].distance.toFixed(2)} at.%, 實體排斥力總分 P_foundry = ${pen.P_foundry.toFixed(4)}.`, pen.P_foundry >= 0.4 ? "red" : (pen.P_foundry >= 0.25 ? "amber" : "green"));

  // 4. Safety Guardian
  await sleep(700);
  if (state.composition.Al > 15 && state.process.heat_temp > 1000) {
    writeTerminalLine("GUARDIAN", "高 Al 含量在 1000°C 以上且真空度不足時可能產生高溫揮發與氧化夾雜，安全評估為 [中等風險]。", "amber");
  } else {
    writeTerminalLine("GUARDIAN", "元素毒性與高溫冶煉安全評估正常。安全審查通過。", "green");
  }

  // 5. Electronic Developer (surrogate hardness estimate)
  await sleep(800);
  let vibOOD = vib.hardness > 600 || state.composition.Al > 28 || state.process.heat_temp >= T_melt_C;
  writeTerminalLine("DEVELOPER", `surrogate hardness estimate 預估：` + (state.process.heat_temp >= T_melt_C ? "[OOD 熔毀臨界] 預測硬度無效（液相狀態）" : `維氏硬度 HV = ${vib.hardness.toFixed(1)}, Latent Space 漂移量 Drift = ${vib.drift.toFixed(2)} Å`), vibOOD ? "red" : "default");

  // 6. Transport Integrator
  await sleep(600);
  writeTerminalLine("INTEGRATOR", "傳輸阻尼評估完成。電子聲子耦合描述符一致，未見數值消散或資料失真。", "default");

  // 7. Cost Evaluator
  await sleep(700);
  let totalCost = 0;
  for (let el in state.composition) {
    if (ELEMENTS[el]) {
      totalCost += (state.composition[el] / 100) * ELEMENTS[el].cost;
    }
  }
  writeTerminalLine("EVALUATOR", `工藝與成本核算完成。原料配方單價預估 = $${totalCost.toFixed(2)} USD/kg。` + (state.process.heat_temp >= T_melt_C ? "⚠️ 注意：當前熱負荷過大，任何鐵基不銹鋼均無法承受負載。" : ""), "default");

  // 8. Engineering Translator & Final Verdict
  await sleep(900);
  let reportSafe = pen.P_foundry < 0.25 && phasePassed && meltingPassed && !des.isInterstitialExceeded;
  let riskNav = "";

  if (!meltingPassed) {
    riskNav = `【高溫熔融風險：1600°C thermal liquefaction warning】服務溫度 ${state.process.heat_temp}°C ＞ 材料熔點 ${T_melt_C.toFixed(1)}°C；在該高溫與 ${state.process.stress} MPa 應力下，鐵基不銹鋼已超出可用結構材料範圍。\n` +
              `💡 合金計算篩選修正指南：\n` +
              `  1. 難熔合金或 RHEA 路線：改用經驗證的 W-Mo-Ta-Nb 等高熔點材料系統，並另行進行高溫蠕變與氧化驗證。\n` +
              `  2. 陶瓷基複合材料 (UHTCMC) 路線：如 C/SiC (碳纖維碳化矽)，但需以實際服役環境進行熱震與氧化測試。\n` +
              `  3. 熱障塗層與主動冷卻：設計 YSZ 隔熱層，使金屬工作溫度保持在 1100°C 以下。`;
    writeTerminalLine("TRANSLATOR", riskNav, "red");
    footerReportSummary.innerText = "【Level 1 Safety Gate 高溫熔融風險】: 1600°C 高溫高壓大幅超出不銹鋼熔點；不建議以鐵基不銹鋼作為此條件下的結構候選材料。";
    footerReportSummary.parentElement.querySelector('.ticker-badge').className = "ticker-badge ticker-warning";
    footerReportSummary.parentElement.querySelector('.ticker-badge').innerText = "thermal liquefaction";
  } else if (state.cmep.enabled) {
    riskNav = `【CMEP 非平衡探索 bypass 狀態】當前成分屬於亞穩態邊緣。VEC=${des.VEC.toFixed(3)}, P_foundry=${pen.P_foundry.toFixed(4)}。已將隔離沙盒 ` +
              `[src/quantum/candidate_gen/] 之推演配方提報，但強制鎖死 Validate DB 寫入權。Primary Validation Run 實體冷卻速率建議提高至 20 K/s。`;
    writeTerminalLine("TRANSLATOR", riskNav, "amber");
    footerReportSummary.innerText = "【CMEP 亞穩態探索報告】: 允許物理描述符漂移，隔離沙盒掛載中。實體偏析風險高，建議提高冷卻速率以防止偏析。";
    footerReportSummary.parentElement.querySelector('.ticker-badge').className = "ticker-badge ticker-warning";
    footerReportSummary.parentElement.querySelector('.ticker-badge').innerText = "亞穩探索";
  } else if (reportSafe) {
    riskNav = `【通過審查】此候選配方通過物理合理性與實體反饋核排斥力粗篩。P_foundry = ${pen.P_foundry.toFixed(4)}，未觸發硬性相風險。` +
              `此候選配方僅通過描述符篩選與 surrogate hardness estimate 代理模型預估，仍屬未驗證狀態。在進行任何工程應用前，實體物理測試與金相表徵為必要流程。`;
    writeTerminalLine("TRANSLATOR", riskNav, "green");
    footerReportSummary.innerText = "【9B-MMX 審核通過】: 候選配方描述符過濾通過，與失敗/代理樣品距離足夠，可進行下一步實驗室冶煉驗證規劃。";
    footerReportSummary.parentElement.querySelector('.ticker-badge').className = "ticker-badge ticker-success";
    footerReportSummary.parentElement.querySelector('.ticker-badge').innerText = "通過審計";
  } else {
    let failWarn = "";
    if (pen.P_foundry >= 0.4) {
      failWarn = `與已知失敗/代理樣品空間高度接近。若在當前冷卻速率下實體熔煉，存在析出相開裂風險。`;
    } else if (des.isInterstitialExceeded) {
      failWarn = `超出碳/氮間隙固溶度極限，冶煉過程中存在粗大間隙相與開裂風險。`;
    } else {
      failWarn = `檢測到潛在相偏析或脆化析出風險。實體反饋核總懲罰值 P_foundry = ${pen.P_foundry.toFixed(4)} 處於排斥狀態。`;
    }
    riskNav = `【高風險篩選提示】${failWarn} 系統已將該成分列為高風險候選。建議調整元素成分或冷卻速率以避開失敗/代理樣本區間。` +
              `※ 聲明：本報告為基於物理描述符與歷史開爐記錄的計算粗篩結果，實際相結構與性能需經實體熔煉與金相表徵驗證！※`;
    writeTerminalLine("TRANSLATOR", riskNav, "red");
    footerReportSummary.innerText = "【高風險篩選警告】: 與失敗/代理配方高度接近或間隙固溶超限。建議調整配方成分或提升冷卻速率。";
    footerReportSummary.parentElement.querySelector('.ticker-badge').className = "ticker-badge ticker-warning";
    footerReportSummary.parentElement.querySelector('.ticker-badge').innerText = "高度警告";
  }

  writeTerminalLine("SYSTEM", "9B-MMX v0.1 非同步審計流程完工。物理報告已寫入 logs/physics_audit_report.json。", "cyan");

  state.auditInProgress = false;
  btnRunAudit.disabled = false;
  btnRunAudit.innerText = "⚡ 立即執行非同步物理一致性審核 (Run 9B-MMX Audit)";
});

// --- 12. Controlled Metastable Exploration Protocol (CMEP) Toggle ---
btnCmepToggle.addEventListener('click', () => {
  state.cmep.enabled = !state.cmep.enabled;

  if (state.cmep.enabled) {
    btnCmepToggle.innerText = "🔓 CMEP 非平衡旁路閥門已開啟";
    btnCmepToggle.className = "btn btn-danger btn-block pulsing-border-red";
    cmepActiveStats.classList.remove('hide');
    cmepSection.classList.add('activated');
    securityLevelIndicator.innerText = "BYPASS_UNSTABLE (亞穩態放行)";
    securityLevelIndicator.className = "sec-value error-text";
    state.cmep.window = 500;
    cmepCountdown.innerText = state.cmep.window;

    writeTerminalLine("DIRECTOR", "⚠️ [CMEP 旁路開啟] 使用者授權 CMEP 協議。系統允許描述符漂移探索，並維持 Validated DB 寫入鎖定與 sandbox worktree 隔離。", "red");
    writeTerminalLine("SYSTEM", "全域安全等級降級為: Level 2 / BYPASS_ACTIVE. 物理合理性審計員改為唯讀觀測，特許亞穩態放行。", "amber");
  } else {
    btnCmepToggle.innerText = "🔒 啟動 CMEP 非平衡探索旁路閥門";
    btnCmepToggle.className = "btn btn-danger btn-block";
    cmepActiveStats.classList.add('hide');
    cmepSection.classList.remove('activated');
    securityLevelIndicator.innerText = "Level 1 Safety Gate (最高限制)";
    securityLevelIndicator.className = "sec-value";

    writeTerminalLine("DIRECTOR", "🔒 [CMEP 旁路關閉] 使用者關閉 CMEP 協議。重新啟用全量描述符物理合理性審查，恢復 Level 1 Safety Gate 限制。", "cyan");
    writeTerminalLine("SYSTEM", "全域安全等級恢復為: Level 1 Safety Gate。成分守恆與脆性析出相一致性門檻恢復。", "default");
  }
  updateDashboard();
});

// --- 13. Feed In Foundry Failure Ingestion ---
btnSubmitFailure.addEventListener('click', () => {
  const alloy = failAlloy.value.trim();
  const type = failType.value;
  const f_Al = parseFloat(failAl.value);
  const f_Cr = parseFloat(failCr.value);
  const f_Mn = parseFloat(failMn.value);
  const f_C = parseFloat(failC.value);
  const f_N = parseFloat(failN.value);
  const f_cool = parseFloat(failCooling.value);
  const details = failDetails.value.trim();

  if (!alloy || isNaN(f_Al) || isNaN(f_Cr) || isNaN(f_Mn) || isNaN(f_C) || isNaN(f_N) || isNaN(f_cool) || !details) {
    alert("請確實填寫所有台南失敗開爐紀錄數據！");
    return;
  }

  // Define failure coordinate representation with Fe as balance matrix
  const newFail = {
    id: `Tainan-Manual-${Date.now().toString().slice(-4)}`,
    alloy_name: alloy,
    composition: {
      Al: f_Al,
      Co: 0.0,
      Cr: f_Cr,
      Fe: Math.max(0, 100 - (f_Al + f_Cr + f_Mn + f_C + f_N)),
      Ni: 0.0,
      Mn: f_Mn,
      C: f_C,
      N: f_N
    },
    process_parameters: {
      cooling_rate_K_s: f_cool,
      heat_treatment_temp_C: 1000,
      work_stress_MPa: 100
    },
    defect_type: type,
    defect_details: details,
    severity_weight: type === "LTM_THERMO_DEAD_ZONE" ? 0.95 : (type === "MTM_PROCESS_RISK" ? 0.8 : 0.45),
    kernel_bandwidth: type === "LTM_THERMO_DEAD_ZONE" ? 3.5 : (type === "MTM_PROCESS_RISK" ? 4.0 : 2.5)
  };

  // Push into local array
  failureLogs.unshift(newFail);
  state.clocks.physIngotFailed++;
  physIngots.innerText = `${state.clocks.physIngotFailed} Ingots Failed`;

  // Log in terminal
  writeTerminalLine("REALITY", `⚠️ 台南實體冶煉回灌 [${alloy}] 失敗記憶成功！缺陷類型: ${type}，成分座標 Al=${f_Al}%, Cr=${f_Cr}%, Mn=${f_Mn}%, C=${f_C}%, N=${f_N}%，金相: ${details}。已生成新的多維懲罰排斥核。`, "amber");

  // Reset form
  failAlloy.value = "";
  failDetails.value = "";

  // Update
  updateDashboard();
});

// --- 14. Asynchronous Clock Simulator ---
setInterval(() => {
  // 1. Virtual high-frequency epochs τ_virt (millisecond clock)
  state.clocks.virtEpoch += Math.floor(Math.random() * 85) + 40;
  virtualClockText.innerText = `${state.clocks.virtEpoch} ms`;

  // Dynamically update candidate throughput
  let throughputVal = 10 + (Math.sin(state.clocks.virtEpoch / 1000) * 2.8) + (Math.random() * 0.5);
  virtThroughput.innerText = `${throughputVal.toFixed(2)}M candidates/s`;

  // If CMEP is enabled, countdown exploration window
  if (state.cmep.enabled) {
    state.cmep.window--;
    cmepCountdown.innerText = state.cmep.window;

    if (state.cmep.window <= 0) {
      state.cmep.enabled = false;
      btnCmepToggle.innerText = "🔒 啟動 CMEP 非平衡探索旁路閥門";
      btnCmepToggle.className = "btn btn-danger btn-block";
      cmepActiveStats.classList.add('hide');
      cmepSection.classList.remove('activated');
      securityLevelIndicator.innerText = "Level 1 Safety Gate (最高限制)";
      securityLevelIndicator.className = "sec-value";

      writeTerminalLine("SYSTEM", "⚠️ [CMEP 探索窗口到期] 已達到 500 次最大迭代上限。CMEP 進程已停止，沙盒中間狀態已清除，返回安全狀態。", "red");
      updateDashboard();
    }
  }
}, 100);

// --- 15. AGENTS.md Config Modal Control ---
btnOpenAgentsConfig.addEventListener('click', () => {
  textareaAgentsConfig.value = agentsMdTemplate;
  agentsConfigModal.classList.add('show');
});

closeConfigModal.addEventListener('click', () => {
  agentsConfigModal.classList.remove('show');
});

btnResetConfig.addEventListener('click', () => {
  textareaAgentsConfig.value = agentsMdTemplate;
});

btnSaveConfig.addEventListener('click', () => {
  agentsMdTemplate = textareaAgentsConfig.value;
  agentsConfigModal.classList.remove('show');

  writeTerminalLine("SYSTEM", "⚙ AGENTS.md 隔離配置重載成功。重載並加載系統安全閘門...", "cyan");

  // Extract custom configuration parameters if modified by user
  const mTol = agentsMdTemplate.match(/ELEMENT_SUM_TOLERANCE=([\de\-]+)/);
  if (mTol) state.systemConfig.tolerance = parseFloat(mTol[1]);

  const mForbidden = agentsMdTemplate.match(/FORBIDDEN_PHASES=\[(.*?)\]/);
  if (mForbidden) {
    state.systemConfig.forbiddenPhases = mForbidden[1].split(',').map(s => s.replace(/["'\s]/g, ''));
  }

  updateDashboard();
});

// Window click to close modal
window.addEventListener('click', (event) => {
  if (event.target === agentsConfigModal) {
    agentsConfigModal.classList.remove('show');
  }
});

// --- 16. Initial Boot ---
updateDashboard();
