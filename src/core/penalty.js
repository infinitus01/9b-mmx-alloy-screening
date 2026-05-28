/**
 * 9B-MMX Core Shared Module: penalty.js
 * Multi-dimensional Gaussian Kernel Density Estimation (KDE) failure-distance calculation.
 * Wrapped in an IIFE to prevent classic script global scope pollution in browser.
 */

(function () {
  function calculatePenalty(composition, coolingRate, failureLogs) {
    let P_foundry = 0;
    let penaltyDetails = [];

    failureLogs.forEach(fail => {
      let distanceSq = 0;
      let components = Array.from(new Set([...Object.keys(composition), ...Object.keys(fail.composition)]));
      components.forEach(el => {
        let x1 = composition[el] || 0;
        let x2 = fail.composition[el] || 0;
        distanceSq += Math.pow(x1 - x2, 2);
      });

      let coolingDiff = Math.abs(coolingRate - fail.process_parameters.cooling_rate_K_s);
      let processCorrection = Math.exp(-Math.pow(coolingDiff, 2) / 2.0);

      let activeSeverity = fail.severity_weight || 0.8;
      if (fail.process_sensitivity === "precipitation_slow_cooling") {
        if (coolingRate <= 1.0) {
          activeSeverity *= 1.5;
        } else if (coolingRate >= 100.0) {
          activeSeverity *= 0.2;
        }
      }

      let exponent = -distanceSq / (2 * Math.pow(fail.kernel_bandwidth, 2));
      let basePenalty = activeSeverity * Math.exp(exponent);
      let finalPenalty = basePenalty * processCorrection;

      P_foundry += finalPenalty;

      penaltyDetails.push({
        fail_id: fail.id,
        alloy_name: fail.alloy_name,
        defect_type: fail.defect_type,
        distance: Math.sqrt(distanceSq).toFixed(2),
        raw_penalty: basePenalty.toFixed(4),
        final_penalty: finalPenalty.toFixed(4),
        active_severity: activeSeverity
      });
    });

    penaltyDetails.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    return {
      total_penalty_score: P_foundry,
      details: penaltyDetails
    };
  }

  const PenaltyModule = {
    calculatePenalty
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PenaltyModule;
  } else {
    globalThis.Penalty = PenaltyModule;
  }
})();
