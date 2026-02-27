(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.organ = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "square", detune: -2 }, { type: "square", detune: 2 }],
    attack: 0.01,
    decay: 0.1,
    sustain: 0.85,
    release: 0.2,
    filter: { type: "lowpass", base: 2200, velocity: 800 },
  });
})();
