/**
 * 9B-MMX Core Shared Module: interstitial.js
 * Interstitial carbon & nitrogen solubility checks and pairing enthalpies.
 * Wrapped in an IIFE to prevent classic script global scope pollution in browser.
 */

(function () {
  let ELEMENTS, getdH, atPctToWtPct;

  if (typeof require !== 'undefined') {
    const Descriptors = require('./descriptors.js');
    ELEMENTS = Descriptors.ELEMENTS;
    getdH = Descriptors.getdH;
    atPctToWtPct = Descriptors.atPctToWtPct;
  } else {
    ELEMENTS = globalThis.Descriptors.ELEMENTS;
    getdH = globalThis.Descriptors.getdH;
    atPctToWtPct = globalThis.Descriptors.atPctToWtPct;
  }

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

  function calculateInterstitialPrecipitationRisk(composition) {
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
    return interstitial_precipitation_risk;
  }

  function checkInterstitialSolubility(composition) {
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

    return {
      isInterstitialExceeded,
      isNExceeded,
      isCExceeded,
      isTotalExceeded,
      nLimit,
      cLimit,
      totalLimit
    };
  }

  function calculateExperimentalSievertsNLimit(composition) {
    const wtPct = atPctToWtPct(composition);
    const w_Cr = wtPct.Cr || 0;
    const w_Mn = wtPct.Mn || 0;
    const w_Ni = wtPct.Ni || 0;
    const w_Co = wtPct.Co || 0;
    const w_Al = wtPct.Al || 0;
    
    const e_N_Cr = -0.06;
    const e_N_Mn = -0.02;
    const e_N_Ni = +0.01;
    const e_N_Co = +0.01;
    const e_N_Al = -0.05;

    const log_f_N = e_N_Cr * w_Cr + e_N_Mn * w_Mn + e_N_Ni * w_Ni + e_N_Co * w_Co + e_N_Al * w_Al;
    const c_N_base_wt = 0.045;
    const c_N_max_wt = c_N_base_wt * Math.pow(10, -log_f_N);

    let totalMass = 0;
    let totalAt = 0;
    for (let el in composition) {
      if (el !== 'N') {
        totalMass += (composition[el] / 100) * (ATOMIC_MASS[el] || 55.85);
        totalAt += composition[el] / 100;
      }
    }
    const M_sub = totalAt > 0 ? (totalMass / totalAt) : 55.85;
    const c_N_max_at = (c_N_max_wt / 14.01) / ((c_N_max_wt / 14.01) + (100 - c_N_max_wt) / M_sub) * 100;

    return {
      limit_wt: c_N_max_wt,
      limit_at: c_N_max_at
    };
  }

  const InterstitialModule = {
    calculateInterstitialPrecipitationRisk,
    checkInterstitialSolubility,
    calculateExperimentalSievertsNLimit
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterstitialModule;
  } else {
    globalThis.Interstitial = InterstitialModule;
  }
})();
