/**
 * Guitar Calm sample engine – v1_64 style (from v1_64 instruments/guitar).
 * Loads WAV zones from sound/guitar_calm_wavs/, plays notes via BufferSource + gain envelope.
 * Same loop-point logic as piano: each zone has loopStart/loopEnd in seconds.
 */
(function () {
  'use strict';

  var BASE_PATH = 'sound/guitar_calm_wavs/';
  var ATTACK = 0.02;
  var DECAY = 0.15;
  var SUSTAIN = 0.6;
  var RELEASE = 0.3;
  var NATURAL_DECAY = 5;
  var MASTER_GAIN = 0.9;

  // Guitar zones – WAVs in sound/guitar_calm_wavs/
  var GUITAR_ZONES = [
    { keyLow: 0,  keyHigh: 47,  originalPitchCents: 4500, file: 'zone_0_midi25_keys_0-47.wav',   loopStart: 1.6107482993197279, loopEnd: 1.6375963718820862 },
    { keyLow: 48, keyHigh: 54,  originalPitchCents: 5000, file: 'zone_1_midi25_keys_48-54.wav',  loopStart: 2.0592743764172336, loopEnd: 2.1337868480725624 },
    { keyLow: 55, keyHigh: 63,  originalPitchCents: 5900, file: 'zone_2_midi25_keys_55-63.wav',  loopStart: 1.536326530612245,  loopEnd: 1.6291156462585034 },
    { keyLow: 64, keyHigh: 73,  originalPitchCents: 6900, file: 'zone_3_midi25_keys_64-73.wav',  loopStart: 1.1586394557823129, loopEnd: 1.2061678004535147 },
    { keyLow: 74, keyHigh: 127, originalPitchCents: 7900, file: 'zone_4_midi25_keys_74-127.wav', loopStart: 0.8000907029478458,  loopEnd: 0.8319274376417233 }
  ];

  function bufferMap(z) {
    if (!z._bufferByContext) z._bufferByContext = new WeakMap();
    return z._bufferByContext;
  }

  function getZoneForMidi(midi) {
    for (var i = 0; i < GUITAR_ZONES.length; i++) {
      var z = GUITAR_ZONES[i];
      if (midi >= z.keyLow && midi <= z.keyHigh) return z;
    }
    return GUITAR_ZONES[GUITAR_ZONES.length - 1];
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
  var activeVoices = {};
  var sustainPedalActive = false;
  var keyboardPanAmount = 3;

  /**
   * Load all zone WAVs. Call once after AudioContext is created.
   */
  function ensureLoaded(ctx, baseUrl) {
    if (!ctx) return Promise.reject(new Error('No AudioContext'));
    if (loadPromise) return loadPromise;
    var base = (baseUrl || getBaseUrl() || '').replace(/\/[^/]*$/, '/') + BASE_PATH;
    loadPromise = Promise.all(GUITAR_ZONES.map(function (z) {
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
    }).catch(function () {
      loadPromise = null;
      return Promise.resolve();
    });
    return loadPromise;
  }

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
    src.connect(gain);
    src.start(0);

    var list = activeVoices[midiNote];
    if (!list) list = activeVoices[midiNote] = [];
    list.push({ gain: gain, source: src, keyDown: true });
  }

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
        if (v.keyDown) kept.push(v);
        else {
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

  function setKeyboardPan(value) {
    keyboardPanAmount = Math.max(0, Math.min(8, value == null ? 0 : value));
  }

  window.GuitarCalmEngine = {
    ensureLoaded: ensureLoaded,
    noteOn: noteOn,
    noteOff: noteOff,
    setSustainPedal: setSustainPedal,
    releaseAll: releaseAll,
    getMasterGain: function () { return masterGain; },
    getZoneForMidi: getZoneForMidi,
    getZoneBuffer: getZoneBuffer,
    setKeyboardPan: setKeyboardPan
  };
})();
