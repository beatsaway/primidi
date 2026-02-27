/**
 * Synth Calm – sample-based synth engine for v1_09.
 * Pregenerates a small set of audio samples per preset (12 notes, one octave C3–B3)
 * and plays them like Piano/Guitar Calm: BufferSource + gain envelope.
 * Same API as before; unified with other calm engines.
 */
(function () {
  'use strict';

  const DEFAULT_PRESET = 'warmPad';
  const MASTER_GAIN = 0.9;
  /** Number of pre-generated samples per preset: one per semitone in one octave (C3=48 to B3=59) */
  const BASE_MIDI_LOW = 48;
  const BASE_MIDI_HIGH = 59;
  const SAMPLES_PER_PRESET = BASE_MIDI_HIGH - BASE_MIDI_LOW + 1; // 12
  /** Duration of each pre-rendered note (seconds); release is applied at playback */
  const RENDER_DURATION = 4;
  /** Velocity used when pre-rendering (playback scales by actual velocity) */
  const NOMINAL_VELOCITY = 0.8;
  const MIN_ATTACK = 0.008;

  const ATTACK = 0.02;
  const DECAY = 0.15;
  const SUSTAIN = 0.6;
  const RELEASE = 0.3;
  /** Seconds to fade to near-silence if key/pedal held (like piano/guitar natural decay) */
  const NATURAL_DECAY = 10;
  /** Lowpass cutoff (Hz) at start of natural decay – full brightness */
  const NATURAL_DECAY_LOWPASS_START = 14000;
  /** Lowpass cutoff (Hz) at end of natural decay – subtle dim */
  const NATURAL_DECAY_LOWPASS_END = 2800;

  let masterGain = null;
  let audioCtxRef = null;
  const activeVoices = {};
  let sustainPedalDown = false;
  let currentPresetName = DEFAULT_PRESET;
  let keyboardPanAmount = 3;
  /** presetName -> WeakMap<AudioContext, AudioBuffer[]> (length SAMPLES_PER_PRESET) */
  const sampleCache = {};
  let loadPromise = null;

  function getRegistry() {
    if (!window.PremiumSoundInstrumentProfiles) window.PremiumSoundInstrumentProfiles = {};
    return window.PremiumSoundInstrumentProfiles;
  }

  function resolvePreset(name) {
    const registry = getRegistry();
    const provider = registry[name];
    if (typeof provider === 'function') {
      const preset = provider({ note: 60, velocity: 80, velocityNormalized: NOMINAL_VELOCITY, durationSeconds: 0 });
      if (preset && preset.attack != null && preset.oscillators) return preset;
    }
    const fallback = registry[DEFAULT_PRESET];
    if (typeof fallback === 'function') {
      const p = fallback({ note: 60, velocity: 80, velocityNormalized: NOMINAL_VELOCITY, durationSeconds: 0 });
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

  function noteToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  function buildNoiseBufferForOffline(offlineCtx) {
    const buffer = offlineCtx.createBuffer(1, offlineCtx.sampleRate, offlineCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /**
   * Render one note into an AudioBuffer using OfflineAudioContext (same voice logic as old real-time synth).
   */
  function renderOneNote(offlineCtx, preset, midiNote) {
    const t = 0;
    const attack = Math.max(MIN_ATTACK, preset.attack ?? 0.01);
    const decay = preset.decay ?? 0.12;
    const sustainLevel = NOMINAL_VELOCITY * (preset.sustain ?? 0.8);
    const freq = noteToFrequency(midiNote);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(NOMINAL_VELOCITY, t + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, t + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, t + attack + decay);
    gain.connect(offlineCtx.destination);

    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.setValueAtTime(1, t);
    let lastNode = voiceGain;

    if (preset.filter) {
      const filter = offlineCtx.createBiquadFilter();
      filter.type = preset.filter.type || 'lowpass';
      const cutoff = (preset.filter.base || 1200) + (preset.filter.velocity || 2000) * NOMINAL_VELOCITY;
      filter.frequency.setValueAtTime(cutoff, t);
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(gain);

    (preset.oscillators || []).forEach(function (config) {
      const osc = offlineCtx.createOscillator();
      osc.type = config.type || 'sine';
      osc.detune.setValueAtTime(config.detune || 0, t);
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(voiceGain);
      osc.start(t);
      osc.stop(t + RENDER_DURATION);
    });

    if (preset.noise) {
      const noiseBuffer = buildNoiseBufferForOffline(offlineCtx);
      const noiseSource = offlineCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(NOMINAL_VELOCITY * preset.noise, t + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.06, attack + 0.04));
      noiseSource.connect(noiseGain);
      noiseGain.connect(voiceGain);
      noiseSource.start(t);
      noiseSource.stop(t + 0.08);
    }
  }

  /**
   * Generate 12 AudioBuffers for a preset (one per semitone 48–59). Uses OfflineAudioContext.
   */
  function generatePresetSamples(ctx, presetName) {
    const preset = resolvePreset(presetName);
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(RENDER_DURATION * sampleRate);
    const promises = [];
    for (let i = 0; i < SAMPLES_PER_PRESET; i++) {
      const midiNote = BASE_MIDI_LOW + i;
      const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, length, sampleRate);
      renderOneNote(offlineCtx, preset, midiNote);
      promises.push(offlineCtx.startRendering());
    }
    return Promise.all(promises);
  }

  function getCacheForPreset(presetName) {
    if (!sampleCache[presetName]) sampleCache[presetName] = new WeakMap();
    return sampleCache[presetName];
  }

  /**
   * Ensure samples for the current preset are generated and cached for this context.
   */
  function ensurePresetSamples(ctx, presetName) {
    const cache = getCacheForPreset(presetName);
    if (cache.get(ctx)) return Promise.resolve();
    return generatePresetSamples(ctx, presetName).then(function (buffers) {
      cache.set(ctx, buffers);
      return buffers;
    });
  }

  function getMasterGain(ctx) {
    if (!ctx) return masterGain;
    if (!masterGain) {
      audioCtxRef = ctx;
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
      var silentStereo = ctx.createBuffer(2, 1, ctx.sampleRate);
      silentStereo.getChannelData(0)[0] = 0;
      silentStereo.getChannelData(1)[0] = 0;
      var silentSource = ctx.createBufferSource();
      silentSource.buffer = silentStereo;
      silentSource.loop = true;
      silentSource.connect(masterGain);
      silentSource.start(0);
    }
    return masterGain;
  }

  /**
   * Load synth: create master gain and pre-generate samples for the default preset.
   * Same pattern as PianoCalmEngine.ensureLoaded / GuitarCalmEngine.ensureLoaded.
   */
  function ensureLoaded(ctx, baseUrl) {
    if (!ctx) return Promise.reject(new Error('No AudioContext'));
    if (loadPromise) return loadPromise;
    getMasterGain(ctx);
    loadPromise = ensurePresetSamples(ctx, currentPresetName).catch(function (err) {
      loadPromise = null;
      console.warn('Synth Calm sample generation failed:', err);
    });
    return loadPromise;
  }

  function setPreset(name) {
    const registry = getRegistry();
    currentPresetName = name && registry[name] ? name : DEFAULT_PRESET;
    if (audioCtxRef) {
      ensurePresetSamples(audioCtxRef, currentPresetName).catch(function () {});
    }
  }

  function setKeyboardPan(value) {
    keyboardPanAmount = Math.max(0, Math.min(8, value == null ? 0 : value));
  }

  function getBuffersForCurrentPreset(ctx) {
    const cache = getCacheForPreset(currentPresetName);
    return cache.get(ctx) || null;
  }

  function noteOn(ctx, midiNote, velocity) {
    if (!ctx || !masterGain) return;
    const buffers = getBuffersForCurrentPreset(ctx);
    if (!buffers || !buffers.length) return;
    ctx.resume().catch(function () {});

    const vel = Math.max(0.02, Math.min(1, (velocity || 80) / 127));
    const index = ((midiNote % 12) + 12) % 12;
    const baseMidi = BASE_MIDI_LOW + index;

    const preset = resolvePreset(currentPresetName);
    const attackSec = Math.max(MIN_ATTACK, preset.attack ?? 0.01);
    const decaySec = preset.decay ?? 0.12;
    const loopStart = attackSec + decaySec;
    // Loop exactly one period of the *rendered* note so phase matches at wrap (smooth like piano/guitar)
    const periodSec = 1 / noteToFrequency(baseMidi);
    const loopEnd = Math.min(loopStart + periodSec, RENDER_DURATION);

    const playbackRate = Math.pow(2, (midiNote - baseMidi) / 12);
    const buf = buffers[index];
    if (!buf) return;

    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vel, t0 + ATTACK);
    gain.gain.linearRampToValueAtTime(vel * SUSTAIN, t0 + ATTACK + DECAY);
    gain.gain.linearRampToValueAtTime(0.001, t0 + ATTACK + DECAY + NATURAL_DECAY);

    const naturalDecayFilter = ctx.createBiquadFilter();
    naturalDecayFilter.type = 'lowpass';
    naturalDecayFilter.Q.value = 0.7;
    var tDecayStart = t0 + ATTACK + DECAY;
    naturalDecayFilter.frequency.setValueAtTime(NATURAL_DECAY_LOWPASS_START, t0);
    naturalDecayFilter.frequency.setValueAtTime(NATURAL_DECAY_LOWPASS_START, tDecayStart);
    naturalDecayFilter.frequency.linearRampToValueAtTime(NATURAL_DECAY_LOWPASS_END, tDecayStart + NATURAL_DECAY);

    const panner = ctx.createStereoPanner();
    var panNorm = (midiNote - 64) / 64;
    panNorm = Math.sign(panNorm) * Math.pow(Math.abs(panNorm), 0.5);
    panNorm = panNorm * 0.75;
    panner.pan.value = Math.max(-1, Math.min(1, panNorm * (keyboardPanAmount / 100)));
    gain.connect(naturalDecayFilter);
    naturalDecayFilter.connect(panner);
    panner.connect(masterGain);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    src.loop = true;
    src.loopStart = loopStart;
    src.loopEnd = loopEnd;
    src.connect(gain);
    src.start(0);

    var list = activeVoices[midiNote];
    if (!list) list = activeVoices[midiNote] = [];
    list.push({ gain: gain, source: src, keyDown: true });
  }

  function noteOff(ctx, midiNote) {
    var list = activeVoices[midiNote];
    if (!list || list.length === 0) return;
    if (sustainPedalDown) {
      list.forEach(function (v) { v.keyDown = false; });
      return;
    }
    var v = list.pop();
    if (list.length === 0) delete activeVoices[midiNote];
    var t = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.linearRampToValueAtTime(0.001, t + RELEASE);
    v.source.stop(t + RELEASE);
  }

  function setSustainPedal(down) {
    sustainPedalDown = down;
    if (down || !audioCtxRef) return;
    var ctx = audioCtxRef;
    var t = ctx.currentTime;
    for (var midi in activeVoices) {
      var list = activeVoices[midi];
      var kept = [];
      list.forEach(function (v) {
        if (v.keyDown) {
          kept.push(v);
        } else {
          v.gain.gain.cancelScheduledValues(t);
          v.gain.gain.setValueAtTime(v.gain.gain.value, t);
          v.gain.gain.linearRampToValueAtTime(0.001, t + RELEASE);
          try { v.source.stop(t + RELEASE); } catch (_) {}
        }
      });
      if (kept.length === 0) delete activeVoices[midi];
      else activeVoices[midi] = kept;
    }
  }

  function releaseAll(ctx) {
    if (!ctx) return;
    var t = ctx.currentTime;
    for (var midi in activeVoices) {
      activeVoices[midi].forEach(function (v) {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0.001, t + RELEASE);
        try { v.source.stop(t + RELEASE); } catch (_) {}
      });
    }
    for (var k in activeVoices) delete activeVoices[k];
  }

  window.SynthCalmEngine = {
    ensureLoaded: ensureLoaded,
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
