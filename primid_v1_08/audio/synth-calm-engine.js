/**
 * SynthCalm – real-time synth engine for v1_08.
 * Uses preset objects from PremiumSoundInstrumentProfiles (oscillators, ADSR, filter, noise).
 * No dependency on v1_64 premiumsound.js; presets are loaded via instrument-*.js in synth-presets/.
 */
(function () {
  const DEFAULT_PRESET = 'warmPad';
  const MIN_ATTACK = 0.008; // minimum attack (8 ms) to avoid note-on clicks with fast-attack presets
  let masterGain = null;
  let audioCtxRef = null;
  let noiseBuffer = null;
  const activeNotes = new Map(); // midiNote -> list of { gain, oscillators, sustain, release }
  let sustainPedalDown = false;
  let currentPresetName = DEFAULT_PRESET;
  let keyboardPanAmount = 3; // 0–8, same as Piano/Guitar Calm

  function getRegistry() {
    if (!window.PremiumSoundInstrumentProfiles) window.PremiumSoundInstrumentProfiles = {};
    return window.PremiumSoundInstrumentProfiles;
  }

  function resolvePreset(name, context) {
    const registry = getRegistry();
    const provider = registry[name];
    if (typeof provider === 'function') {
      const preset = provider(context);
      if (preset && preset.attack != null && preset.oscillators) return preset;
    }
    const fallback = registry[DEFAULT_PRESET];
    if (typeof fallback === 'function') {
      const p = fallback(context);
      if (p && p.attack != null && p.oscillators) return p;
    }
    return {
      oscillators: [{ type: 'sine', detune: 0 }],
      attack: 0.01,
      decay: 0.12,
      sustain: 0.8,
      release: 0.25,
      filter: { type: 'lowpass', base: 1600, velocity: 2000 },
    };
  }

  function noteToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function buildNoiseBuffer(ctx) {
    if (noiseBuffer) return noiseBuffer;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  }

  function getMasterGain(ctx) {
    if (!ctx) return masterGain;
    if (!masterGain) {
      audioCtxRef = ctx;
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.9, ctx.currentTime);
    }
    return masterGain;
  }

  function setPreset(name) {
    currentPresetName = name && getRegistry()[name] ? name : DEFAULT_PRESET;
  }

  function setKeyboardPan(value) {
    keyboardPanAmount = Math.max(0, Math.min(8, value == null ? 0 : value));
  }

  function noteOn(ctx, midiNote, velocity) {
    if (!ctx) return;
    getMasterGain(ctx);
    const velocityNormalized = Math.max(0.02, (velocity || 80) / 127);
    const preset = resolvePreset(currentPresetName, {
      note: midiNote,
      velocity: velocity || 80,
      velocityNormalized,
      durationSeconds: 0,
    });

    const t = ctx.currentTime;
    const attack = Math.max(MIN_ATTACK, preset.attack ?? 0.01);
    const decay = preset.decay ?? 0.12;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    const panner = ctx.createStereoPanner();
    let panNorm = (midiNote - 64) / 64;
    panNorm = Math.sign(panNorm) * Math.pow(Math.abs(panNorm), 0.5);
    panNorm = panNorm * 0.75;
    panner.pan.value = Math.max(-1, Math.min(1, panNorm * (keyboardPanAmount / 100)));
    gain.connect(panner);
    panner.connect(masterGain);
    const peak = velocityNormalized;
    const sustain = velocityNormalized * (preset.sustain ?? 0.8);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.linearRampToValueAtTime(sustain, t + attack + decay);

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(1, t);
    let lastNode = voiceGain;

    if (preset.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = preset.filter.type || 'lowpass';
      const cutoff = (preset.filter.base || 1200) + (preset.filter.velocity || 2000) * velocityNormalized;
      filter.frequency.setValueAtTime(cutoff, t);
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(gain);

    const oscillators = (preset.oscillators || []).map(function (config) {
      const osc = ctx.createOscillator();
      osc.type = config.type || 'sine';
      osc.detune.setValueAtTime(config.detune || 0, t);
      osc.frequency.setValueAtTime(noteToFrequency(midiNote), t);
      osc.connect(voiceGain);
      osc.start(t);
      return osc;
    });

    if (preset.noise) {
      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      noiseSource.buffer = buildNoiseBuffer(ctx);
      const noiseLevel = velocityNormalized * preset.noise;
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(noiseLevel, t + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.06, attack + 0.04));
      noiseSource.connect(noiseGain);
      noiseGain.connect(voiceGain);
      noiseSource.start(t);
      noiseSource.stop(t + 0.08);
    }

    let list = activeNotes.get(midiNote) || [];
    list.forEach(function (v) { releaseVoice(ctx, v, t); });
    list = [{ gain, oscillators, sustain, release: preset.release ?? 0.25 }];
    activeNotes.set(midiNote, list);
  }

  function releaseVoice(ctx, voice, eventTime) {
    const releaseTime = voice.release ?? 0;
    voice.gain.gain.cancelScheduledValues(eventTime);
    voice.gain.gain.linearRampToValueAtTime(0.0001, eventTime + releaseTime);
    const stopTime = eventTime + releaseTime + 0.05;
    if (voice.oscillators) {
      voice.oscillators.forEach(function (osc) {
        try { osc.stop(stopTime); } catch (_) {}
      });
    }
  }

  function noteOff(ctx, midiNote) {
    if (!ctx) return;
    const list = activeNotes.get(midiNote);
    if (!list || !list.length) return;
    if (sustainPedalDown) return;
    const voice = list.shift();
    releaseVoice(ctx, voice, ctx.currentTime);
    if (list.length) activeNotes.set(midiNote, list);
    else activeNotes.delete(midiNote);
  }

  function setSustainPedal(down) {
    sustainPedalDown = down;
    if (!down && audioCtxRef) releaseAll(audioCtxRef);
  }

  function releaseAll(ctx) {
    if (!ctx) return;
    const t = ctx.currentTime;
    activeNotes.forEach(function (list, midiNote) {
      list.forEach(function (voice) {
        releaseVoice(ctx, voice, t);
      });
    });
    activeNotes.clear();
  }

  window.SynthCalmEngine = {
    getMasterGain: getMasterGain,
    setPreset: setPreset,
    setKeyboardPan: setKeyboardPan,
    getCurrentPreset: function () { return currentPresetName; },
    noteOn: noteOn,
    noteOff: noteOff,
    setSustainPedal: setSustainPedal,
    releaseAll: releaseAll,
  };
})();
