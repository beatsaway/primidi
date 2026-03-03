/**
 * GSL Sample Synth for PriMIDI 3D piano.
 * Plays GSL instrument samples from MIDI note on/off with velocity and sustain pedal.
 * Reverb (send + convolver) and stereo width (mid/side). Compatible with midi-mapping.js.
 */
(function () {
  'use strict';

  var audioCtx = null;
  var masterGain = null;
  var dryGain = null;
  var reverbSend = null;
  var reverbNode = null;
  var reverbWet = null;
  var widthSplit = null;
  var midSum = null;
  var sideSum = null;
  var midGain = null;
  var sideGain = null;
  var sideGainInv = null;
  var widthMerge = null;
  var invGain = null;
  var sumGain = null;
  var lastMasterVolumePercent = 1000; // 0–2000, default 1000%
  var activeVoices = {}; // noteName -> [{ gain, bufferSource, release }]
  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };
  var DELAY_MOD_CHANCE = 0.618;
  var DELAY_MOD_AMOUNT_HUMAN = 0.05;
  var DELAY_MOD_AMOUNT_DRUNK = 0.128;
  var REF_NOTE_DURATION_FOR_DELAY = 0.25;
  var VOLUME_MOD_MIN = 0.05;
  var VOLUME_MOD_MAX = 1.3;
  var VOLUME_MOD_CURVE = 2.0;
  var NUM_SLOTS = 6;
  /* Per-layer gain nodes for every-bar volume modulation; filled in ensureContext */
  var slotGains = [];
  /* Per-layer phase offsets so pseudo-random delays don't match across layers (same key = different delay each layer) */
  var delayStateBySlot = { 0: { counter: 0 }, 1: { counter: 317 }, 2: { counter: 733 }, 3: { counter: 101 }, 4: { counter: 419 }, 5: { counter: 521 } };
  var flickerStateBySlot = { 0: { counter: 0 }, 1: { counter: 0 }, 2: { counter: 0 }, 3: { counter: 0 }, 4: { counter: 0 }, 5: { counter: 0 } };

  function linearToDb(value) {
    return 20 * Math.log10(Math.max(value, 0.0001));
  }
  function dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
  function applyVolumeCurve(pos) {
    var clamped = Math.max(0, Math.min(1, pos));
    return Math.pow(clamped, VOLUME_MOD_CURVE);
  }
  function applyVolumeModIntensity(multiplier, intensity) {
    if (intensity <= 0) return 1.0;
    if (intensity >= 1) return multiplier;
    return intensity * (multiplier - 1) + 1;
  }
  function getVolumeModMultiplier(volumeMod, cyclePosition, intensity) {
    if (!volumeMod || volumeMod === 'none') return 1.0;
    intensity = intensity != null && !isNaN(intensity) ? Math.max(0, Math.min(1, intensity)) : 1;
    var pos = Math.max(0, Math.min(1, cyclePosition));
    var curvedPos = applyVolumeCurve(pos);
    var minDb = linearToDb(VOLUME_MOD_MIN);
    var maxDb = linearToDb(VOLUME_MOD_MAX);
    var raw = 1.0;
    switch (volumeMod) {
      case 'uphill':
        raw = dbToLinear(minDb + (curvedPos * (maxDb - minDb)));
        break;
      case 'downhill':
        raw = dbToLinear(maxDb - (curvedPos * (maxDb - minDb)));
        break;
      case 'valley':
        raw = pos <= 0.5
          ? dbToLinear(maxDb - (applyVolumeCurve(pos * 2) * (maxDb - minDb)))
          : dbToLinear(minDb + (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        break;
      case 'hill':
        raw = pos <= 0.5
          ? dbToLinear(minDb + (applyVolumeCurve(pos * 2) * (maxDb - minDb)))
          : dbToLinear(maxDb - (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        break;
      case '2hill': {
        var phase = (pos * 4) % 2;
        raw = phase <= 1
          ? dbToLinear(minDb + (applyVolumeCurve(phase) * (maxDb - minDb)))
          : dbToLinear(maxDb - (applyVolumeCurve(phase - 1) * (maxDb - minDb)));
        break;
      }
      default: {
        var nvalleyMatch = volumeMod && String(volumeMod).match(/^(\d+)valley$/);
        if (nvalleyMatch) {
          var nVal = Math.max(1, Math.min(99, parseInt(nvalleyMatch[1], 10)));
          var phaseVal = (pos * nVal) % 1;
          raw = phaseVal <= 0.5
            ? dbToLinear(maxDb - (applyVolumeCurve(phaseVal * 2) * (maxDb - minDb)))
            : dbToLinear(minDb + (applyVolumeCurve((phaseVal - 0.5) * 2) * (maxDb - minDb)));
        } else {
          var nhillMatch = volumeMod && String(volumeMod).match(/^(\d+)hill$/);
          if (nhillMatch) {
            var nHill = Math.max(1, Math.min(99, parseInt(nhillMatch[1], 10)));
            var phaseHill = (pos * 2 * nHill) % 2;
            raw = phaseHill <= 1
              ? dbToLinear(minDb + (applyVolumeCurve(phaseHill) * (maxDb - minDb)))
              : dbToLinear(maxDb - (applyVolumeCurve(phaseHill - 1) * (maxDb - minDb)));
          }
        }
        break;
      }
    }
    return applyVolumeModIntensity(raw, intensity);
  }

  function createImpulseResponse(ctx, seconds, decay) {
    var length = Math.floor(ctx.sampleRate * seconds);
    var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (var ch = 0; ch < impulse.numberOfChannels; ch += 1) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i += 1) {
        var t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  function noteNameToMidi(noteName) {
    if (typeof window !== 'undefined' && window.noteNameToMidiNote) {
      return window.noteNameToMidiNote(noteName);
    }
    var noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var m = String(noteName).match(/^([A-G]#?)(\d+)$/);
    if (!m) return null;
    var noteIndex = noteNames.indexOf(m[1]);
    if (noteIndex === -1) return null;
    var octave = parseInt(m[2], 10);
    return (octave + 1) * 12 + noteIndex;
  }

  function ensureContext() {
    if (audioCtx) return audioCtx;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(lastMasterVolumePercent / 100, audioCtx.currentTime);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(1, audioCtx.currentTime);
    reverbSend = audioCtx.createGain();
    reverbSend.gain.setValueAtTime(0.3, audioCtx.currentTime);
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = createImpulseResponse(audioCtx, 2.2, 2.4);
    reverbWet = audioCtx.createGain();
    reverbWet.gain.setValueAtTime(0.3, audioCtx.currentTime);

    sumGain = audioCtx.createGain();
    sumGain.gain.setValueAtTime(1, audioCtx.currentTime);
    dryGain.connect(sumGain);
    reverbSend.connect(reverbNode);
    reverbNode.connect(reverbWet);
    reverbWet.connect(sumGain);
    slotGains.length = 0;
    for (var s = 0; s < NUM_SLOTS; s += 1) {
      var sg = audioCtx.createGain();
      sg.gain.setValueAtTime(1, audioCtx.currentTime);
      sg.connect(dryGain);
      sg.connect(reverbSend);
      slotGains.push(sg);
    }
    startEveryBarUpdateLoop();

    widthSplit = audioCtx.createChannelSplitter(2);
    sumGain.connect(widthSplit);
    midSum = audioCtx.createGain();
    sideSum = audioCtx.createGain();
    midGain = audioCtx.createGain();
    sideGain = audioCtx.createGain();
    sideGainInv = audioCtx.createGain();
    invGain = audioCtx.createGain();
    invGain.gain.setValueAtTime(-1, audioCtx.currentTime);
    sideGainInv.gain.setValueAtTime(-1, audioCtx.currentTime);
    widthMerge = audioCtx.createChannelMerger(2);

    widthSplit.connect(midSum, 0);
    widthSplit.connect(midSum, 1);
    widthSplit.connect(sideSum, 0);
    widthSplit.connect(invGain, 1);
    invGain.connect(sideSum);
    midSum.connect(midGain);
    sideSum.connect(sideGain);
    sideGain.connect(sideGainInv);
    midGain.connect(widthMerge, 0, 0);
    sideGain.connect(widthMerge, 0, 0);
    midGain.connect(widthMerge, 0, 1);
    sideGainInv.connect(widthMerge, 0, 1);
    widthMerge.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    setStereoWidth(-75);
    return audioCtx;
  }

  function getCurrentPreset() {
    var slots = getCurrentPresetSlots();
    return (slots && slots.length > 0) ? slots[0] : ((typeof window !== 'undefined' && window.currentGslPreset) ? window.currentGslPreset : null);
  }

  function getCurrentPresetSlots() {
    return (typeof window !== 'undefined' && window.gslPresetSlots && Array.isArray(window.gslPresetSlots)) ? window.gslPresetSlots : [];
  }

  function getSlotVolume(slotIndex) {
    var defaults = [33, 33, 33, 33, 33, 33];
    var arr = typeof window !== 'undefined' && window.gslSlotVolumes && Array.isArray(window.gslSlotVolumes) ? window.gslSlotVolumes : defaults;
    var p = arr[slotIndex];
    return (p != null && !isNaN(p)) ? Math.max(0, Math.min(100, p)) / 100 : 1;
  }

  function getSlotSemitone(slotIndex) {
    var defaults = [0, 0, 0, 0, 0, 0];
    var arr = typeof window !== 'undefined' && window.gslSlotSemitones && Array.isArray(window.gslSlotSemitones) ? window.gslSlotSemitones : defaults;
    var s = arr[slotIndex];
    return (s != null && !isNaN(s)) ? Math.max(-12, Math.min(12, s)) : 0;
  }

  function getLayerPlayStyle(slotIndex) {
    var g = typeof window !== 'undefined' && window.gslLayerPlayStyle;
    if (typeof g === 'string') return (g === 'human' || g === 'drunk') ? g : 'none';
    var arr = Array.isArray(g) ? g : ['none', 'none', 'none', 'none', 'none', 'none'];
    var v = arr[slotIndex];
    return (v === 'human' || v === 'drunk') ? v : 'none';
  }

  var everyBarUpdateLoopStarted = false;
  function startEveryBarUpdateLoop() {
    if (everyBarUpdateLoopStarted || !audioCtx) return;
    everyBarUpdateLoopStarted = true;
    function tick() {
      if (!audioCtx || slotGains.length === 0) {
        requestAnimationFrame(tick);
        return;
      }
      var getBarPhase = typeof window !== 'undefined' && window.primidiGetBarPhase;
      var phase = 0;
      if (getBarPhase) {
        var bp = getBarPhase();
        phase = bp.phase != null ? bp.phase : 0;
      }
      var patterns = (typeof window !== 'undefined' && window.gslEveryBarPattern && Array.isArray(window.gslEveryBarPattern)) ? window.gslEveryBarPattern : [];
      var intensities = (typeof window !== 'undefined' && window.gslEveryBarIntensity && Array.isArray(window.gslEveryBarIntensity)) ? window.gslEveryBarIntensity : [];
      var now = audioCtx.currentTime;
      for (var idx = 0; idx < slotGains.length && idx < NUM_SLOTS; idx += 1) {
        var pattern = patterns[idx] || 'none';
        var intensity = intensities[idx];
        if (intensity == null || isNaN(intensity)) intensity = 0.76;
        var mult = getVolumeModMultiplier(pattern, phase, intensity);
        slotGains[idx].gain.setTargetAtTime(mult, now, 0.02);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, state) {
    if (!delayModPattern || delayModPattern === 'none') return 0;
    if (delayModPattern !== 'human' && delayModPattern !== 'drunk') return 0;
    if (!state) return 0;
    state.counter += 1;
    var remainder = (state.counter * 0.61803398875) % 1;
    if (remainder > DELAY_MOD_CHANCE) return 0;
    var amount = delayModPattern === 'drunk' ? DELAY_MOD_AMOUNT_DRUNK : DELAY_MOD_AMOUNT_HUMAN;
    return noteDurationSeconds * amount * remainder;
  }

  function triggerAttack(noteName, when, amplitude) {
    var slots = getCurrentPresetSlots();
    if (!slots.length || !window.InstrumentSampleHandler) return;

    var midi = noteNameToMidi(noteName);
    if (midi == null) return;

    var ctx = ensureContext();
    if (ctx.state !== 'running') ctx.resume().catch(function () {});

    var handler = window.InstrumentSampleHandler;
    var velocityNorm = Math.max(0.02, Math.min(1, amplitude || 0.8));
    var t0 = when != null ? when : ctx.currentTime;
    var group = [];

    for (var i = 0; i < slots.length; i++) {
      var presetName = slots[i];
      var preset = handler.getPreset(presetName);
      if (!preset || !preset.zones) continue;

      var zone = handler.getZoneForMidi(presetName, midi);
      var buf = handler.getZoneBuffer(zone, ctx);
      if (!zone || !buf) continue;

      var playStyle = getLayerPlayStyle(i);
      var delayState = delayStateBySlot[i] || (delayStateBySlot[i] = { counter: 0 });
      var bpm = (typeof window !== 'undefined' && window.gslBpm != null) ? Math.max(40, Math.min(240, Number(window.gslBpm))) : 120;
      var refNoteDuration = 60 / bpm;
      var rawDelay = getDelayOffsetSeconds(refNoteDuration, playStyle, delayState);
      var intensity = (typeof window !== 'undefined' && window.gslDelayIntensity != null) ? window.gslDelayIntensity : 1;
      var delayOffset = rawDelay * intensity;
      var t0Layer = t0 + delayOffset;
      if (typeof window !== 'undefined' && window.primidiOnLayerTrigger) window.primidiOnLayerTrigger(i, delayOffset);

      var slotVol = getSlotVolume(i);
      var flickerMode = (typeof window !== 'undefined' && window.gslFlickerMode) ? window.gslFlickerMode : 'none';
      if (flickerMode !== 'none') {
        var flickerState = flickerStateBySlot[i] || (flickerStateBySlot[i] = { counter: 0 });
        flickerState.counter += 1;
        var frac = (flickerState.counter * 0.61803398875) % 1;
        if (flickerMode === 'subtle') {
          slotVol = (slotVol / 2) + (slotVol / 2) * frac;
        } else if (flickerMode === 'moderate') {
          slotVol = (slotVol / 2) + (1 - slotVol / 2) * frac;
        } else if (flickerMode === 'strong') {
          slotVol = 0.33 + 0.67 * frac;
        }
      }
      var attack = (preset.attack != null) ? preset.attack : SAMPLE_ENVELOPE.attack;
      var decay = (preset.decay != null) ? preset.decay : SAMPLE_ENVELOPE.decay;
      var sustain = (preset.sustain != null) ? preset.sustain : SAMPLE_ENVELOPE.sustain;
      var release = (preset.release != null) ? preset.release : SAMPLE_ENVELOPE.release;

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      var slotGain = slotGains[i];
      if (slotGain) {
        gain.connect(slotGain);
      } else {
        gain.connect(dryGain);
        gain.connect(reverbSend);
      }

      var peak = velocityNorm * slotVol;
      var sustainLevel = velocityNorm * sustain * slotVol;
      gain.gain.linearRampToValueAtTime(peak, t0Layer + attack);
      gain.gain.linearRampToValueAtTime(sustainLevel, t0Layer + attack + decay);

      var semitoneOffset = getSlotSemitone(i);
      var originalPitchSemitones = zone.originalPitchCents / 100;
      var playbackRate = Math.pow(2, (midi + semitoneOffset - originalPitchSemitones) / 12);
      var loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
      var loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);

      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.setValueAtTime(playbackRate, t0Layer);
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = loopEnd;
      src.connect(gain);
      src.start(t0Layer);

      group.push({ gain: gain, bufferSource: src, sustain: sustainLevel, release: release });
    }

    if (group.length === 0) return;
    if (!activeVoices[noteName]) activeVoices[noteName] = [];
    activeVoices[noteName].push(group);
  }

  function releaseOneVoice(noteName) {
    var list = activeVoices[noteName];
    if (!list || list.length === 0) return;
    var group = list.shift();
    var ctx = audioCtx;
    if (!ctx) return;
    var t = ctx.currentTime;
    for (var i = 0; i < group.length; i++) {
      var voice = group[i];
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(voice.sustain, t);
      voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || SAMPLE_ENVELOPE.release));
      var stopTime = t + (voice.release || SAMPLE_ENVELOPE.release) + 0.05;
      try {
        voice.bufferSource.stop(stopTime);
      } catch (e) {}
    }
    if (list.length === 0) delete activeVoices[noteName];
  }

  function triggerRelease(noteName) {
    releaseOneVoice(noteName);
  }

  function releaseAllVoices(noteName) {
    var list = activeVoices[noteName];
    if (!list) return;
    var ctx = audioCtx;
    var releaseTime = SAMPLE_ENVELOPE.release;
    while (list.length > 0) {
      var group = list.shift();
      if (ctx && group) {
        var t = ctx.currentTime;
        for (var i = 0; i < group.length; i++) {
          var voice = group[i];
          voice.gain.gain.cancelScheduledValues(t);
          voice.gain.gain.setValueAtTime(voice.sustain, t);
          voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || releaseTime));
          try {
            voice.bufferSource.stop(t + (voice.release || releaseTime) + 0.05);
          } catch (e) {}
        }
      }
    }
    delete activeVoices[noteName];
  }

  function setNoteEnvelope() {}
  function updateNoteKeyState() {}
  function setSustainPedal() {}

  function setReverb(value) {
    var v = Math.max(0, Math.min(1, value));
    var amount = v * 0.6;
    if (!audioCtx) ensureContext();
    if (reverbSend) reverbSend.gain.setTargetAtTime(amount, audioCtx.currentTime, 0.01);
    if (reverbWet) reverbWet.gain.setTargetAtTime(amount, audioCtx.currentTime, 0.01);
  }

  function setStereoWidth(midEq) {
    var clamped = Math.max(-100, Math.min(0, midEq));
    var db = -36 + ((clamped + 100) / 100) * 24;
    var midAmount = Math.pow(10, db / 20);
    if (!audioCtx) ensureContext();
    if (midGain) midGain.gain.setTargetAtTime(midAmount, audioCtx.currentTime, 0.03);
    if (sideGain) sideGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.03);
  }

  function setMasterVolume(percent) {
    var p = Math.max(0, Math.min(2000, percent));
    lastMasterVolumePercent = p;
    if (!audioCtx) ensureContext();
    if (masterGain) masterGain.gain.setTargetAtTime(p / 100, audioCtx.currentTime, 0.01);
  }

  function getMasterVolume() {
    return lastMasterVolumePercent;
  }

  var synth = {
    triggerAttack: triggerAttack,
    triggerRelease: triggerRelease,
    releaseAllVoices: releaseAllVoices,
    setNoteEnvelope: setNoteEnvelope,
    setReverb: setReverb,
    setStereoWidth: setStereoWidth,
    setMasterVolume: setMasterVolume,
    getMasterVolume: getMasterVolume,
    synth: {
      audioCtx: null,
      masterGain: null,
      updateNoteKeyState: updateNoteKeyState,
      setSustainPedal: setSustainPedal
    }
  };

  Object.defineProperty(synth.synth, 'audioCtx', {
    get: function () { ensureContext(); return audioCtx; },
    configurable: true
  });
  Object.defineProperty(synth.synth, 'masterGain', {
    get: function () { return masterGain; },
    configurable: true
  });

  window.gslSynth = synth;
  window.synth = synth;
})();
