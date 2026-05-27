# ─── AGENTS.md: 9B-MMX 權責與隔離配置文件 ───

# 1. 全域運行參數 (Global Runtime)
MAX_CONCURRENT_SUBAGENTS=3
MAX_AUTO_FIX_ITERATIONS=3
TIMEOUT_PER_SIMULATION_STEPS_SEC=1800
SANDBOX_MODE=worktree-isolated

# 2. 物理合理性閘門 (Physics Sanity Gate)
[CONSISTENCY_GATE]
ELEMENT_SUM_TOLERANCE=1e-6
FORCE_VALENCE_ELECTRON_CONCENTRATION_CHECK=true
FORBIDDEN_PHASES=["Laves_phase", "sigma_phase_at_high_temp", "Cr2N_nitride", "M23C6_carbide"]
DISSIPATION_ESTIMATE_MAX_VARIANCE=0.15

# 2.5 間隙型固溶極限閘門 (Interstitial Solubility Gate)
[INTERSTITIAL_GATE]
NITROGEN_SOLUBILITY_BASE_AT_PCT=1.5
NITROGEN_SOLUBILITY_CR_SLOPE=0.04
CARBON_SOLUBILITY_MAX_AT_PCT=1.2
TOTAL_INTERSTITIAL_MAX_AT_PCT=3.0

# 3. 受控亞穩態探索協議配置 (CMEP Configuration)
[METASTABLE_BYPASS]
ENABLED=false                            # 預設強制關閉
MAX_EXPLORATION_WINDOW=500_iterations    # 自動熔斷窗口
ALLOW_UNSTABLE_DESCRIPTOR_DRIFT=true      # 允許描述符向非平衡區漂移
FORBID_VALIDATED_DB_WRITE=true           # 強制禁止寫入已驗證庫
AUTO_EXPIRE=true                         # 啟用過期自毀

# 4. 角色寫入權限與目錄掛載限制 (Directory Sandbox)
[ROLE: Candidate_Architect]
ALLOW_WRITE=["src/quantum/candidate_gen/"]
READ_ONLY=["src/quantum/physics_auditor/", "logs/foundry_feedback/"]

[ROLE: Physics_Consistency_Auditor]
ALLOW_WRITE=["logs/physics_audit_report.json", "src/quantum/physics_auditor/"]
READ_ONLY=["src/quantum/candidate_gen/", "src/quantum/solvers/"]
SECURITY_LEVEL=LEVEL_1_SAFETY_GATE # 擁有最高物理審查與熔斷防護權限
