/**
 * v1_09 simple effects (v1_64 style): reverb + mid-EQ (mid cut).
 * One reverb send (convolver, generated IR), dry/wet mix, then mid/side with mid gain (midEq -100..0).
 */
(function () {
  'use strict';

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
  var lastReverb = 223 / 100; // default 223% (slider value; setReverb uses v/100)
  var lastMidEq = -100; // scale -100..0 (default max cut)

  function createImpulseResponse(ctx, seconds, decay) {
    var length = Math.floor(ctx.sampleRate * seconds);
    var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (var ch = 0; ch < impulse.numberOfChannels; ch++) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        var t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  function setEffects(ctx, reverb, midEq) {
    if (!ctx) return;
    lastReverb = reverb != null ? reverb : lastReverb;
    lastMidEq = midEq != null ? midEq : lastMidEq;
    var t = ctx.currentTime;
    if (reverbSend && reverbSend.gain) {
      reverbSend.gain.setTargetAtTime(lastReverb * 0.6, t, 0.01); // 0–400% -> 0–2.4
    }
    if (reverbWet && reverbWet.gain) {
      reverbWet.gain.setTargetAtTime(lastReverb * 0.6, t, 0.01);
    }
    var clamped = Math.max(-100, Math.min(0, lastMidEq)); // -100 = max cut, 0 = no cut
    var db = -36 + ((clamped + 100) / 100) * 24; // -100 -> -36 dB, 0 -> -12 dB
    var midAmount = Math.pow(10, db / 20);
    if (midGain && midGain.gain) {
      midGain.gain.setTargetAtTime(midAmount, t, 0.03);
    }
    if (sideGain && sideGain.gain) {
      sideGain.gain.setTargetAtTime(1, t, 0.03);
    }
  }

  /**
   * Connect engine's masterGain through simple reverb + mid/side EQ to destination.
   * Disconnects masterGain from destination first.
   * @param {AudioContext} ctx
   * @param {GainNode} engineMasterGain
   * @returns {{ setReverb: function(0-1), setMidEq: function(-100..0), setEffects: function({reverb, midEq}) }}
   */
  function connect(ctx, engineMasterGain) {
    if (!ctx || !engineMasterGain) return null;
    try {
      engineMasterGain.disconnect();
    } catch (e) {}
    dryGain = ctx.createGain();
    reverbSend = ctx.createGain();
    reverbNode = ctx.createConvolver();
    reverbWet = ctx.createGain();
    widthSplit = ctx.createChannelSplitter(2);
    midSum = ctx.createGain();
    sideSum = ctx.createGain();
    midGain = ctx.createGain();
    sideGain = ctx.createGain();
    sideGainInv = ctx.createGain();
    widthMerge = ctx.createChannelMerger(2);
    invGain = ctx.createGain();

    reverbNode.buffer = createImpulseResponse(ctx, 2.2, 2.4);
    midGain.gain.setValueAtTime(1, ctx.currentTime);
    sideGain.gain.setValueAtTime(1, ctx.currentTime);
    invGain.gain.setValueAtTime(-1, ctx.currentTime);
    sideGainInv.gain.setValueAtTime(-1, ctx.currentTime);

    engineMasterGain.connect(dryGain);
    engineMasterGain.connect(reverbSend);
    reverbSend.connect(reverbNode);
    reverbNode.connect(reverbWet);

    var merger = ctx.createChannelMerger(2);
    var drySplitter = ctx.createChannelSplitter(2);
    dryGain.connect(drySplitter);
    drySplitter.connect(merger, 0, 0);
    drySplitter.connect(merger, 1, 1);
    reverbWet.connect(merger, 0, 0);
    reverbWet.connect(merger, 0, 1);

    merger.connect(widthSplit);
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
    widthMerge.connect(ctx.destination);

    setEffects(ctx, lastReverb, lastMidEq);

    return {
      setReverb: function (value) {
        lastReverb = Math.max(0, Math.min(4, value)); // 0–400%
        setEffects(ctx, lastReverb, null);
      },
      setMidEq: function (value) {
        lastMidEq = Math.max(-100, Math.min(0, value)); // -100 = max cut
        setEffects(ctx, null, lastMidEq);
      },
      setMasterVolume: function (value) {
        var v = Math.max(0, Math.min(4, value)); // 0–400%
        if (engineMasterGain && engineMasterGain.gain) engineMasterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
      },
      setEffects: function (opts) {
        setEffects(ctx, opts.reverb, opts.midEq);
      }
    };
  }

  window.PianoCalmEffects = {
    connect: connect,
    setEffects: setEffects
  };
})();
