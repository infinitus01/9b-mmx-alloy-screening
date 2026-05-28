/**
 * 9B-MMX Core Shared Module: descriptors.js
 * Consolidated elemental data, formula utilities, and Substitutional HEA descriptors.
 * Wrapped in an IIFE to prevent classic script global scope pollution in browser.
 */

(function () {
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

  function calculateDescriptors(composition, coolingRate = 1.0) {
    let totalSub = 0;
    for (let el in composition) {
      if (ELEMENTS[el] && ELEMENTS[el].type === "substitutional") {
        totalSub += composition[el];
      }
    }

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

    const wtPct = atPctToWtPct(composition);
    const PREN = (wtPct.Cr || 0) + 16 * (wtPct.N || 0);

    const estimated_SFE_heuristic_index = 25.7 +
      2.0 * (wtPct.Ni || 0) -
      0.9 * (wtPct.Cr || 0) -
      0.1 * (wtPct.Mn || 0) +
      30.0 * (wtPct.C || 0) -
      15.0 * (wtPct.N || 0) +
      5.0 * (wtPct.Al || 0) -
      1.5 * (wtPct.Co || 0);

    let predictedPhase = "Multi-phase mixture (High segregation risk)";
    if (delta <= 6.6 && dH_mix >= -15 && dH_mix <= 5 && omega >= 1.1) {
      if (VEC >= 8.0) predictedPhase = "Single FCC Phase (Ductile)";
      else if (VEC < 6.87) predictedPhase = "Single BCC Phase (Strong)";
      else predictedPhase = "Mixed FCC + BCC Phase";
    } else if (delta > 6.6 && dH_mix < -15) {
      predictedPhase = "Intermetallic Compound (Brittle)";
    }

    let baseHardness = 150;
    baseHardness += (composition.Al || 0) * 12.5;
    baseHardness += (composition.Cr || 0) * 3.5;
    baseHardness += (composition.Mn || 0) * 2.8;
    baseHardness += (composition.N || 0) * 85.0;
    baseHardness += (composition.C || 0) * 120.0;
    if (coolingRate < 1.0) {
      baseHardness -= 25;
    }

    return {
      VEC,
      delta,
      dH_mix,
      omega,
      T_m,
      predictedPhase,
      estimated_SFE_heuristic_index,
      PREN,
      surrogate_hardness_HV: baseHardness
    };
  }

  function calculateRawMaterialCostIndex(composition) {
    let totalCost = 0;
    for (let el in composition) {
      if (ELEMENTS[el]) {
        totalCost += (composition[el] / 100) * ELEMENTS[el].cost;
      }
    }
    return totalCost;
  }

  const DescriptorsModule = {
    ELEMENTS,
    ATOMIC_MASS,
    MIXING_ENTHALPIES,
    getdH,
    atPctToWtPct,
    getFormula,
    calculateDescriptors,
    calculateRawMaterialCostIndex
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DescriptorsModule;
  } else {
    globalThis.Descriptors = DescriptorsModule;
  }
})();
