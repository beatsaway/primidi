(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.brightLead = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "sawtooth", detune: -4 }, { type: "sawtooth", detune: 4 }],
    attack: 0.01,
    decay: 0.08,
    sustain: 0.6,
    release: 0.2,
    filter: { type: "lowpass", base: 1800, velocity: 3600 },
  });
})();
