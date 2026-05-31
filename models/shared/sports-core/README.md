# Shared Sports Core

This folder owns model-neutral sports utilities: odds math, participant shaping, signal normalization, generic structured context, and the reusable match-model factory.

Sport cartridges should import these contracts and supply sport-specific adapters. For MLB-M0, the cartridge supplies `buildAnalysisModel` and player-prop logic; the shared core supplies the plumbing around those adapters.

The web compatibility path `web/src/lib/sports-model.js` should point here, not directly at a sport cartridge. That keeps generated day files stable while making ownership clear for future cartridges.
