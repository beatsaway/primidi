/**
 * Piano Calm sample engine (v1_09) – v1_64 style.
 * Loads WAV zones from sound/piano_calm_wavs/, plays notes via BufferSource + gain envelope.
 * Single preset only; masterGain → destination (no filter/reverb).
 */
(function () {
  'use strict';

  var BASE_PATH = 'sound/';
  var ATTACK = 0.02;
  var DECAY = 0.15;
  var SUSTAIN = 0.6;
  var RELEASE = 0.3;
  var NATURAL_DECAY = 6; // seconds to fade to silence if key/pedal held (like real piano)
  var MASTER_GAIN = 0.9;

  var PIANO_ZONES = [
    { keyLow: 0,  keyHigh: 34,  originalPitchCents: 3100, file: 'piano_calm_wavs/zone_0_midi0_keys_0-34.wav',   loopStart: 2.414875283446712,  loopEnd: 2.5583219954648526 },
    { keyLow: 35, keyHigh: 41,  originalPitchCents: 3800, file: 'piano_calm_wavs/zone_1_midi0_keys_35-41.wav',  loopStart: 1.6789569160997733, loopEnd: 1.7335147392290249 },
    { keyLow: 42, keyHigh: 47,  originalPitchCents: 4500, file: 'piano_calm_wavs/zone_2_midi0_keys_42-47.wav',  loopStart: 1.514467120181406,  loopEnd: 1.6964172335600907 },
    { keyLow: 48, keyHigh: 52,  originalPitchCents: 5000, file: 'piano_calm_wavs/zone_3_midi0_keys_48-52.wav',  loopStart: 1.325668934240363,  loopEnd: 1.4620861678004535 },
    { keyLow: 53, keyHigh: 57,  originalPitchCents: 5500, file: 'piano_calm_wavs/zone_4_midi0_keys_53-57.wav',  loopStart: 1.249092970521542,  loopEnd: 1.295079365079365 },
    { keyLow: 58, keyHigh: 62,  originalPitchCents: 6000, file: 'piano_calm_wavs/zone_5_midi0_keys_58-62.wav',  loopStart: 0.9061678004535147, loopEnd: 0.9559183673469388 },
    { keyLow: 63, keyHigh: 68,  originalPitchCents: 6500, file: 'piano_calm_wavs/zone_6_midi0_keys_63-68.wav',  loopStart: 0.5954648526077098, loopEnd: 0.6327891156462585 },
    { keyLow: 69, keyHigh: 75,  originalPitchCents: 7200, file: 'piano_calm_wavs/zone_7_midi0_keys_69-75.wav',  loopStart: 0.423265306122449,  loopEnd: 0.5188208616780046 },
    { keyLow: 76, keyHigh: 83,  originalPitchCents: 7900, file: 'piano_calm_wavs/zone_8_midi0_keys_76-83.wav',  loopStart: 0.6796825396825397, loopEnd: 0.7228571428571429 },
    { keyLow: 84, keyHigh: 92,  originalPitchCents: 8800, file: 'piano_calm_wavs/zone_9_midi0_keys_84-92.wav',  loopStart: 0.4145124716553288, loopEnd: 0.4273015873015873 },
    { keyLow: 93, keyHigh: 127, originalPitchCents: 9700, file: 'piano_calm_wavs/zone_10_midi0_keys_93-127.wav', loopStart: 0.3438548752834467, loopEnd: 0.3672108843537415 }
  ];

  function bufferMap(z) {
    if (!z._bufferByContext) z._bufferByContext = new WeakMap();
    return z._bufferByContext;
  }

  function getZoneForMidi(midi) {
    for (var i = 0; i < PIANO_ZONES.length; i++) {
      var z = PIANO_ZONES[i];
      if (midi >= z.keyLow && midi <= z.keyHigh) return z;
    }
    return PIANO_ZONES[PIANO_ZONES.length - 1];
  }

  function getZoneBuffer(zone, ctx) {
    return zone && ctx ? bufferMap(zone).get(ctx) : null;
  }

  function getBaseUrl() {
    if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
    if (typeof window !== 'undefined' && window.location && window.location.href) return window.location.href;
    return '';
  }

  var loadPromise = null;
  var masterGain = null;
  var activeVoices = {}; // midiNote -> [{ gain, source, keyDown }]
  var sustainPedalActive = false;

  /** Harmonic/timbre settings from UI (0–100 except tilt -100–100). Applied per note from pitch + velocity. Default: sub/wood/resonance/brightness 100, string 0. */
  var harmonicSettings = {
    subCut: 100,
    wood: 100,
    resonance: 100,
    string: 0,
    brightness: 100,
    tilt: 0,
    attackPresence: 0,
    highCut: 0,
    highNoteDamp: 0  // 0–100: low-pass more on higher notes (mimic "high notes die faster")
  };

  /** Keyboard pan amount 0–8%: lower notes left, higher notes right, middle range less affected. */
  var keyboardPanAmount = 3;

  function midiNoteToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Build per-voice filter chain for harmonic profile. Returns { first, last } so caller does src.connect(first); last.connect(gain).
   * @param {AudioContext} ctx
   * @param {number} midiNote
   * @param {number} vel 0–1
   */
  function buildHarmonicChain(ctx, midiNote, vel) {
    var freq = midiNoteToFreq(midiNote);
    var s = harmonicSettings;
    var anyOn = s.subCut > 0 || s.wood > 0 || s.resonance > 0 || s.string > 0 || s.brightness > 0 || s.tilt !== 0 || s.attackPresence > 0 || s.highCut > 0 || s.highNoteDamp > 0;
    if (!anyOn) return null;

    var nodes = [];
    var t = ctx.currentTime;

    // Sub cut: highpass 20–80 Hz
    if (s.subCut > 0) {
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 20 + (s.subCut / 100) * 60;
      hp.Q.value = 0.7;
      nodes.push(hp);
    }

    // Wood: low shelf ~200 Hz, gain 0 to +6 dB
    if (s.wood > 0 || (s.tilt !== 0 && midiNote < 60)) {
      var lowShelf = ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 200;
      var woodGain = (s.wood / 100) * 6;
      var tiltLow = midiNote < 60 ? (1 - midiNote / 60) * (s.tilt / 100) * 6 : 0;
      lowShelf.gain.value = woodGain + tiltLow;
      nodes.push(lowShelf);
    }

    // Resonance: peaking at fundamental
    if (s.resonance > 0 && freq >= 30 && freq <= 4000) {
      var peakRes = ctx.createBiquadFilter();
      peakRes.type = 'peaking';
      peakRes.frequency.value = freq;
      peakRes.Q.value = 1.5;
      peakRes.gain.value = (s.resonance / 100) * 6;
      nodes.push(peakRes);
    }

    // String: peaking ~2 kHz
    if (s.string > 0) {
      var peakStr = ctx.createBiquadFilter();
      peakStr.type = 'peaking';
      peakStr.frequency.value = 2000;
      peakStr.Q.value = 1.2;
      peakStr.gain.value = (s.string / 100) * 6;
      nodes.push(peakStr);
    }

    // Attack presence: peaking ~4 kHz
    if (s.attackPresence > 0) {
      var peakAtt = ctx.createBiquadFilter();
      peakAtt.type = 'peaking';
      peakAtt.frequency.value = 4000;
      peakAtt.Q.value = 1;
      peakAtt.gain.value = (s.attackPresence / 100) * 6;
      nodes.push(peakAtt);
    }

    // Brightness (velocity) + tilt (high) + high cut: one high shelf
    if (s.brightness > 0 || (s.tilt !== 0 && midiNote >= 60) || s.highCut > 0) {
      var highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 4000;
      var brightGain = (s.brightness / 100) * vel * 6; // velocity-dependent
      var tiltHigh = midiNote >= 60 ? ((midiNote - 60) / 67) * (s.tilt / 100) * 6 : 0;
      var cutGain = -(s.highCut / 100) * 6;
      highShelf.gain.value = brightGain + tiltHigh + cutGain;
      nodes.push(highShelf);
    }

    // High note damp: low-pass per note; higher notes get lower cutoff (darker, "die faster")
    if (s.highNoteDamp > 0) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.7;
      // MIDI 21 (A0) -> 14 kHz, MIDI 127 -> ~2.5 kHz; amount scales the effect
      var noteNorm = Math.max(0, (midiNote - 21) / 106);
      var cutoffMax = 14000;
      var cutoffMin = 2500;
      lp.frequency.value = cutoffMax - noteNorm * (cutoffMax - cutoffMin) * (s.highNoteDamp / 100);
      nodes.push(lp);
    }

    if (nodes.length === 0) return null;
    for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return { first: nodes[0], last: nodes[nodes.length - 1] };
  }

  /**
   * Load all zone WAVs. Call once after AudioContext is created.
   * @param {AudioContext} ctx
   * @param {string} [baseUrl]
   * @returns {Promise<void>}
   */
  function ensureLoaded(ctx, baseUrl) {
    if (!ctx) return Promise.reject(new Error('No AudioContext'));
    if (loadPromise) return loadPromise;
    var base = (baseUrl || getBaseUrl() || '').replace(/\/[^/]*$/, '/') + BASE_PATH;
    loadPromise = Promise.all(PIANO_ZONES.map(function (z) {
      var url = base + z.file;
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
          return r.arrayBuffer();
        })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { bufferMap(z).set(ctx, buf); });
    })).then(function () {
      if (!masterGain) {
        masterGain = ctx.createGain();
        masterGain.gain.value = MASTER_GAIN;
        var silentStereo = ctx.createBuffer(2, 1, ctx.sampleRate);
        silentStereo.getChannelData(0)[0] = 0;
        silentStereo.getChannelData(1)[0] = 0;
        var silentSource = ctx.createBufferSource();
        silentSource.buffer = silentStereo;
        silentSource.loop = true;
        silentSource.connect(masterGain);
        silentSource.start(0);
      }
    });
    return loadPromise;
  }

  /**
   * Start a note (v1_64 style: gain envelope + BufferSource loop).
   * @param {AudioContext} ctx
   * @param {number} midiNote 0–127
   * @param {number} velocity 0–127 (normalized to 0–1 for gain)
   */
  function noteOn(ctx, midiNote, velocity) {
    if (!ctx || !masterGain) return;
    var zone = getZoneForMidi(midiNote);
    var buf = getZoneBuffer(zone, ctx);
    if (!buf) return;
    ctx.resume().catch(function () {});

    var vel = Math.max(0.02, Math.min(1, (velocity || 80) / 127));
    var originalPitchSemitones = zone.originalPitchCents / 100;
    var playbackRate = Math.pow(2, (midiNote - originalPitchSemitones) / 12);
    var loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
    var loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);

    var gain = ctx.createGain();
    var t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vel, t0 + ATTACK);
    gain.gain.linearRampToValueAtTime(vel * SUSTAIN, t0 + ATTACK + DECAY);
    // Natural decay: note fades to silence over time even if key/pedal held (like real piano)
    gain.gain.linearRampToValueAtTime(0.001, t0 + ATTACK + DECAY + NATURAL_DECAY);

    var panner = ctx.createStereoPanner();
    var panNorm = (midiNote - 64) / 64;
    panNorm = Math.sign(panNorm) * Math.pow(Math.abs(panNorm), 0.5);
    panNorm = panNorm * 0.75;
    panner.pan.value = Math.max(-1, Math.min(1, panNorm * (keyboardPanAmount / 100)));
    gain.connect(panner);
    panner.connect(masterGain);

    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    src.loop = true;
    src.loopStart = loopStart;
    src.loopEnd = loopEnd;
    var chain = buildHarmonicChain(ctx, midiNote, vel);
    if (chain) {
      src.connect(chain.first);
      chain.last.connect(gain);
    } else {
      src.connect(gain);
    }
    src.start(0);

    var list = activeVoices[midiNote];
    if (!list) list = activeVoices[midiNote] = [];
    list.push({ gain: gain, source: src, keyDown: true });
  }

  /**
   * End a note (release envelope then stop source).
   * @param {AudioContext} ctx
   * @param {number} midiNote
   */
  function noteOff(ctx, midiNote) {
    var list = activeVoices[midiNote];
    if (!list || list.length === 0) return;
    if (sustainPedalActive) {
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
    sustainPedalActive = down;
    if (down) return;
    var ctx = masterGain && masterGain.context;
    if (!ctx) return;
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
          v.source.stop(t + RELEASE);
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
        v.source.stop(t + RELEASE);
      });
    }
    activeVoices = {};
  }

  function setHarmonicSettings(opts) {
    if (!opts) return;
    if (opts.subCut != null) harmonicSettings.subCut = Math.max(0, Math.min(100, opts.subCut));
    if (opts.wood != null) harmonicSettings.wood = Math.max(0, Math.min(200, opts.wood));
    if (opts.resonance != null) harmonicSettings.resonance = Math.max(0, Math.min(200, opts.resonance));
    if (opts.string != null) harmonicSettings.string = Math.max(0, Math.min(100, opts.string));
    if (opts.brightness != null) harmonicSettings.brightness = Math.max(0, Math.min(100, opts.brightness));
    if (opts.tilt != null) harmonicSettings.tilt = Math.max(-100, Math.min(100, opts.tilt));
    if (opts.attackPresence != null) harmonicSettings.attackPresence = Math.max(0, Math.min(100, opts.attackPresence));
    if (opts.highCut != null) harmonicSettings.highCut = Math.max(0, Math.min(100, opts.highCut));
    if (opts.highNoteDamp != null) harmonicSettings.highNoteDamp = Math.max(0, Math.min(100, opts.highNoteDamp));
  }

  function setKeyboardPan(value) {
    keyboardPanAmount = Math.max(0, Math.min(8, value == null ? 0 : value));
  }

  window.PianoCalmEngine = {
    ensureLoaded: ensureLoaded,
    noteOn: noteOn,
    noteOff: noteOff,
    setSustainPedal: setSustainPedal,
    releaseAll: releaseAll,
    getMasterGain: function () { return masterGain; },
    getZoneForMidi: getZoneForMidi,
    getZoneBuffer: getZoneBuffer,
    setHarmonicSettings: setHarmonicSettings,
    setKeyboardPan: setKeyboardPan
  };
})();
