(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.epiano = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "triangle", detune: -3 }, { type: "triangle", detune: 3 }],
    attack: 0.004,
    decay: 0.15,
    sustain: 0.35,
    release: 0.2,
    noise: 0.04,
    filter: { type: "lowpass", base: 2400, velocity: 2800 },
  });
})();
