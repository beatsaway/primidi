(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.pluck = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "sawtooth", detune: 0 }],
    attack: 0.002,
    decay: 0.12,
    sustain: 0.2,
    release: 0.12,
    noise: 0.05,
    filter: { type: "lowpass", base: 1500, velocity: 2600 },
  });
})();
