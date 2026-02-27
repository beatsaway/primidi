(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.bass = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "square", detune: 0 }],
    attack: 0.008,
    decay: 0.1,
    sustain: 0.7,
    release: 0.15,
    filter: { type: "lowpass", base: 800, velocity: 1200 },
  });
})();
