(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.softPiano = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "triangle", detune: 0 }],
    attack: 0.005,
    decay: 0.22,
    sustain: 0.4,
    release: 0.25,
    noise: 0.03,
    filter: { type: "lowpass", base: 2000, velocity: 2200 },
  });
})();
