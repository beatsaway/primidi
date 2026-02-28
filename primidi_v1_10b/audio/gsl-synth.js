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
    return (typeof window !== 'undefined' && window.currentGslPreset) ? window.currentGslPreset : null;
  }

  function triggerAttack(noteName, when, amplitude) {
    var presetName = getCurrentPreset();
    if (!presetName || !window.InstrumentSampleHandler) return;

    var midi = noteNameToMidi(noteName);
    if (midi == null) return;

    var ctx = ensureContext();
    if (ctx.state !== 'running') ctx.resume().catch(function () {});

    var handler = window.InstrumentSampleHandler;
    var preset = handler.getPreset(presetName);
    if (!preset || !preset.zones) return;

    var zone = handler.getZoneForMidi(presetName, midi);
    var buf = handler.getZoneBuffer(zone, ctx);
    if (!zone || !buf) return;

    var velocityNorm = Math.max(0.02, Math.min(1, amplitude || 0.8));
    var attack = (preset.attack != null) ? preset.attack : SAMPLE_ENVELOPE.attack;
    var decay = (preset.decay != null) ? preset.decay : SAMPLE_ENVELOPE.decay;
    var sustain = (preset.sustain != null) ? preset.sustain : SAMPLE_ENVELOPE.sustain;
    var release = (preset.release != null) ? preset.release : SAMPLE_ENVELOPE.release;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.connect(dryGain);
    gain.connect(reverbSend);

    var peak = velocityNorm;
    var sustainLevel = velocityNorm * sustain;
    var t0 = when != null ? when : ctx.currentTime;
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, t0 + attack + decay);

    var originalPitchSemitones = zone.originalPitchCents / 100;
    var playbackRate = Math.pow(2, (midi - originalPitchSemitones) / 12);
    var loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
    var loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);

    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(playbackRate, t0);
    src.loop = true;
    src.loopStart = loopStart;
    src.loopEnd = loopEnd;
    src.connect(gain);
    src.start(t0);

    if (!activeVoices[noteName]) activeVoices[noteName] = [];
    activeVoices[noteName].push({ gain: gain, bufferSource: src, sustain: sustainLevel, release: release });
  }

  function releaseOneVoice(noteName) {
    var list = activeVoices[noteName];
    if (!list || list.length === 0) return;
    var voice = list.shift();
    var ctx = audioCtx;
    if (!ctx) return;
    var t = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(voice.sustain, t);
    voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || SAMPLE_ENVELOPE.release));
    var stopTime = t + (voice.release || SAMPLE_ENVELOPE.release) + 0.05;
    try {
      voice.bufferSource.stop(stopTime);
    } catch (e) {}
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
      var voice = list.shift();
      if (ctx) {
        var t = ctx.currentTime;
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(voice.sustain, t);
        voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || releaseTime));
        try {
          voice.bufferSource.stop(t + (voice.release || releaseTime) + 0.05);
        } catch (e) {}
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
