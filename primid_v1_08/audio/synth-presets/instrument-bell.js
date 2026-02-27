(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.bell = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "sine", detune: 0 }, { type: "triangle", detune: 12 }],
    attack: 0.002,
    decay: 0.35,
    sustain: 0.05,
    release: 0.25,
    filter: { type: "lowpass", base: 3200, velocity: 4000 },
  });
})();
