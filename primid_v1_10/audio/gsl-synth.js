/**
 * GSL Sample Synth for PriMIDI 3D piano.
 * Plays GSL instrument samples from MIDI note on/off with velocity and sustain pedal.
 * Compatible with midi-mapping.js (triggerAttack, triggerRelease, releaseAllVoices).
 */
(function () {
  'use strict';

  var audioCtx = null;
  var masterGain = null;
  var activeVoices = {}; // noteName -> [{ gain, bufferSource, release }]
  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };

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
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
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
    gain.connect(masterGain);

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

  var synth = {
    triggerAttack: triggerAttack,
    triggerRelease: triggerRelease,
    releaseAllVoices: releaseAllVoices,
    setNoteEnvelope: setNoteEnvelope,
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
