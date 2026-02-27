(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.string = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "sawtooth", detune: -5 }, { type: "triangle", detune: 5 }],
    attack: 0.04,
    decay: 0.2,
    sustain: 0.65,
    release: 0.35,
    filter: { type: "lowpass", base: 1600, velocity: 2800 },
  });
})();
