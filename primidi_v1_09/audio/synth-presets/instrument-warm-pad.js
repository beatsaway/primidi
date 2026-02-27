(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.warmPad = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "triangle", detune: -6 }, { type: "sine", detune: 6 }],
    attack: 0.06,
    decay: 0.18,
    sustain: 0.75,
    release: 0.5,
    filter: { type: "lowpass", base: 1200, velocity: 2400 },
  });
})();
