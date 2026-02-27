/**
 * Sample-based instruments for PriMIDI 3D piano.
 * Supports all instruments in instruments/GSL (zones.json + zone_*.wav).
 */
(function () {
  'use strict';

  var registry = (window.PremiumSoundInstrumentProfiles = window.PremiumSoundInstrumentProfiles || {});

  var GSL_BASE = 'instruments/GSL/';
  var GSL_MANIFEST_URL = 'instruments/GSL/gsl-manifest.json';
  var gslManifest = null;
  var gslSlugToId = {};
  var gslZonesCache = {};

  function bufferMap(z) {
    if (!z._bufferByContext) z._bufferByContext = new WeakMap();
    return z._bufferByContext;
  }

  function isGslPreset(presetName) {
    return typeof presetName === 'string' && presetName.indexOf('gsl_') === 0;
  }

  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };

  function ensureGslManifest() {
    if (gslManifest) return Promise.resolve();
    var base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI.replace(/\/[^/]*$/, '/') : '';
    var url = base + GSL_MANIFEST_URL;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('GSL manifest: ' + r.status);
      return r.json();
    }).then(function (list) {
      gslManifest = list;
      gslSlugToId = {};
      list.forEach(function (entry) {
        gslSlugToId[entry.slug] = entry.id;
        (function (capturedId) {
          registry[entry.slug] = function () { return getGslPresetConfig(capturedId); };
        })(entry.id);
      });
      return gslManifest;
    });
  }

  function getGslPresetConfig(id) {
    var zones = gslZonesCache[id];
    if (!zones || !zones.length) return null;
    return {
      type: 'sample',
      basePath: GSL_BASE + encodeURIComponent(id) + '/',
      zones: zones,
      attack: SAMPLE_ENVELOPE.attack,
      decay: SAMPLE_ENVELOPE.decay,
      sustain: SAMPLE_ENVELOPE.sustain,
      release: SAMPLE_ENVELOPE.release
    };
  }

  function ensureGslZonesLoaded(presetName, baseUrl) {
    var id = gslSlugToId[presetName];
    if (!id) return Promise.reject(new Error('Unknown GSL preset: ' + presetName));
    if (gslZonesCache[id]) return Promise.resolve();
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    var url = base + GSL_BASE + encodeURIComponent(id) + '/zones.json';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('GSL zones: ' + r.status + ' ' + url);
      return r.json();
    }).then(function (zones) {
      gslZonesCache[id] = zones;
    });
  }

  function getPreset(presetName) {
    if (!isGslPreset(presetName)) return null;
    var id = gslSlugToId[presetName];
    if (!id || !gslZonesCache[id]) return null;
    return getGslPresetConfig(id);
  }

  function getZoneForMidi(presetName, midi) {
    var preset = getPreset(presetName);
    if (!preset || !preset.zones) return null;
    var zones = preset.zones;
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (midi >= z.keyLow && midi <= z.keyHigh) return z;
    }
    return zones[zones.length - 1];
  }

  function getZoneBuffer(zone, ctx) {
    return zone && ctx ? bufferMap(zone).get(ctx) : null;
  }

  function loadPreset(ctx, presetName, baseUrl) {
    var preset = getPreset(presetName);
    if (!preset || !preset.zones) return Promise.resolve();
    var basePath = preset.basePath;
    var zones = preset.zones;
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    return Promise.all(zones.map(function (z) {
      var url = base + basePath + (z.file || '');
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
          return r.arrayBuffer();
        })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { bufferMap(z).set(ctx, buf); })
        .catch(function (err) {
          return Promise.reject(new Error('Sample load failed (' + presetName + '): ' + (err && err.message ? err.message : String(err))));
        });
    })).then(function () {});
  }

  function ensurePresetLoaded(ctx, presetName, baseUrl) {
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    if (isGslPreset(presetName)) {
      return ensureGslZonesLoaded(presetName, base).then(function () {
        return loadPreset(ctx, presetName, baseUrl);
      });
    }
    return loadPreset(ctx, presetName, baseUrl);
  }

  window.InstrumentSampleHandler = {
    getPreset: getPreset,
    getZoneForMidi: getZoneForMidi,
    getZoneBuffer: getZoneBuffer,
    loadPreset: loadPreset,
    ensurePresetLoaded: ensurePresetLoaded,
    getGslManifest: function () { return gslManifest; },
    ensureGslManifest: ensureGslManifest,
    isGslPreset: isGslPreset
  };
})();
