# VeilProof Antigravity Prompt Pack

The frontend is already built. This pack implements the backend and connects existing handlers/services only. No screen generation, redesign, or framework migration is included.

## Start

1. Open the actual imported frontend repository in Antigravity.
2. Make `references/` and `DEVELOPMENT_PLAN.md` available there as reference material.
3. Paste `prompts/MASTER.txt` first.
4. Paste implementation prompts in filename order: P00A through P11B. Run one subphase at a time and check its completion gate.
5. For a fresh chat, paste MASTER then R01. Use R02 for repair, R03 for missing services, and R04 for reducing scope.

There are 28 implementation prompts, one master prompt, and four recovery prompts. The plan contains dependencies, outputs, completion gates, external setup, the smaller fallback build, and judge rehearsal.

Do not paste secrets into chat. Use ignored configuration or your provider's secret manager. Supplied reference documents may contain earlier machine-specific paths; resolve them by filename in your actual repository.

This is a planning/prompt deliverable, not implemented application code or proof of passing application tests.
