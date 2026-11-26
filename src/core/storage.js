/* Code Adventure - penyimpanan lokal (IndexedDB + fallback localStorage) */
(function (global) {
  'use strict';
  var CA = (global.CA = global.CA || {});
  var util = CA.util;

  var DB_NAME = 'code-adventure-db';
  var DB_VERSION = 1;
  var STORE = 'kv';
  var KEY = 'app-state';
  var LS_KEY = 'code-adventure-state';

  function blankState() {
    return {
      version: 1,
      profiles: {},
      activeProfileId: null,
      settings: { sound: true, speed: 600, teacherPin: '1234', locale: 'id' },
      classes: {},
      workspaces: {},
      daily: {}
    };
  }

  function normalize(state) {
    var base = blankState();
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch (e) { return base; }
    }
    if (!state || typeof state !== 'object') return base;
    base.profiles = state.profiles && typeof state.profiles === 'object' ? state.profiles : {};
    base.classes = state.classes && typeof state.classes === 'object' ? state.classes : {};
    base.workspaces = state.workspaces && typeof state.workspaces === 'object' ? state.workspaces : {};
    base.daily = state.daily && typeof state.daily === 'object' ? state.daily : {};
    base.settings = Object.assign(base.settings, state.settings || {});
    base.activeProfileId = state.activeProfileId || null;
    base.version = 1;
    return base;
  }

  function newProfile(name, avatar) {
    return {
      id: util.uid('siswa'),
      name: name || 'Petualang',
      avatar: avatar || '🤖',
      createdAt: new Date().toISOString(),
      xp: 0,
      levels: {},
      achievements: [],
      history: [],
      errorStats: {},
      blockStats: {},
      attempts: {},
      lastLevel: 1
    };
  }

  var Storage = {
    state: blankState(),
    ready: false,
    backend: 'memory',
    _db: null,
    _queue: Promise.resolve(),

    init: function () {
      var self = this;
      return new Promise(function (resolve) {
        function fallback(reason) {
          self.backend = 'localStorage';
          try {
            var raw = global.localStorage && global.localStorage.getItem(LS_KEY);
            self.state = normalize(raw ? JSON.parse(raw) : self.state);
          } catch (e) {
            self.backend = 'memory';
          }
          self.ready = true;
          resolve(self);
        }
        if (!global.indexedDB) return fallback('no indexedDB');
        var req;
        try {
          req = global.indexedDB.open(DB_NAME, DB_VERSION);
        } catch (e) {
          return fallback(e);
        }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = function () {
          self._db = req.result;
          self.backend = 'indexedDB';
          var tx = self._db.transaction(STORE, 'readonly');
          var get = tx.objectStore(STORE).get(KEY);
          get.onsuccess = function () {
            var data = get.result;
            if (typeof data === 'string') {
              try { data = JSON.parse(data); } catch (e) { data = null; }
            }
            self.state = normalize(data || null);
            self.ready = true;
            resolve(self);
          };
          get.onerror = function () {
            self.ready = true;
            resolve(self);
          };
        };
        req.onerror = function () { fallback(req.error); };
        req.onblocked = function () { fallback('blocked'); };
      });
    },

    _persist: function () {
      var self = this;
      var snapshot = JSON.stringify(this.state);
      this._queue = this._queue.then(function () {
        return new Promise(function (resolve) {
          if (self.backend === 'indexedDB' && self._db) {
            try {
              var tx = self._db.transaction(STORE, 'readwrite');
              tx.objectStore(STORE).put(snapshot, KEY);
              tx.oncomplete = function () { resolve(true); };
              tx.onerror = function () {
                self._writeLocal(snapshot);
                resolve(false);
              };
            } catch (e) {
              self._writeLocal(snapshot);
              resolve(false);
            }
          } else {
            self._writeLocal(snapshot);
            resolve(true);
          }
        });
      });
      return this._queue;
    },

    _writeLocal: function (snapshot) {
      try {
        if (global.localStorage) global.localStorage.setItem(LS_KEY, snapshot);
      } catch (e) { /* kuota penuh: state tetap ada di memori */ }
    },

    save: function () { return this._persist(); },

    getSetting: function (key, fallbackValue) {
      var v = this.state.settings[key];
      return v === undefined ? fallbackValue : v;
    },

    setSetting: function (key, value) {
      this.state.settings[key] = value;
      return this._persist();
    },

    listProfiles: function () {
      return Object.keys(this.state.profiles).map(function (id) { return this.state.profiles[id]; }, this)
        .sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });
    },

    getProfile: function (id) {
      if (!id) id = this.state.activeProfileId;
      return id ? this.state.profiles[id] || null : null;
    },

    createProfile: function (name, avatar, activate) {
      var p = newProfile(name, avatar);
      this.state.profiles[p.id] = p;
      if (activate !== false) this.state.activeProfileId = p.id;
      this._persist();
      return p;
    },

    saveProfile: function (profile) {
      if (!profile || !profile.id) return this._persist();
      profile.errorStats = profile.errorStats || {};
      profile.blockStats = profile.blockStats || {};
      profile.levels = profile.levels || {};
      profile.history = profile.history || [];
      this.state.profiles[profile.id] = profile;
      this.state.activeProfileId = profile.id;
      return this._persist();
    },

    setActiveProfile: function (id) {
      if (!this.state.profiles[id]) return this._persist();
      this.state.activeProfileId = id;
      return this._persist();
    },

    deleteProfile: function (id) {
      delete this.state.profiles[id];
      Object.keys(this.state.workspaces).forEach(function (k) {
        if (k.indexOf(id + ':') === 0) delete this.state.workspaces[k];
      }, this);
      if (this.state.activeProfileId === id) this.state.activeProfileId = null;
      return this._persist();
    },

    saveWorkspace: function (profileId, key, xml) {
      var k = profileId + ':' + key;
      this.state.workspaces[k] = { xml: xml, savedAt: new Date().toISOString() };
      return this._persist();
    },

    loadWorkspace: function (profileId, key) {
      var rec = this.state.workspaces[profileId + ':' + key];
      return rec ? rec.xml : null;
    },

    listClasses: function () {
      return Object.keys(this.state.classes).map(function (code) { return this.state.classes[code]; }, this);
    },

    saveClass: function (cls) {
      if (!cls || !cls.code) return this._persist();
      cls.students = cls.students || [];
      cls.challenges = cls.challenges || [];
      this.state.classes[cls.code] = cls;
      return this._persist();
    },

    getClass: function (code) {
      return this.state.classes[String(code || '').toUpperCase()] || null;
    },

    deleteClass: function (code) {
      delete this.state.classes[code];
      return this._persist();
    },

    exportAll: function () {
      return JSON.stringify({ app: 'CODE ADVENTURE', version: 1, exportedAt: new Date().toISOString(), data: this.state }, null, 2);
    },

    importAll: function (raw, merge) {
      var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      var data = parsed && parsed.data ? parsed.data : parsed;
      var incoming = normalize(data);
      if (merge) {
        Object.assign(this.state.profiles, incoming.profiles);
        Object.assign(this.state.classes, incoming.classes);
        Object.assign(this.state.workspaces, incoming.workspaces);
        Object.assign(this.state.settings, incoming.settings);
      } else {
        this.state = incoming;
      }
      return this._persist();
    },

    resetAll: function () {
      this.state = blankState();
      return this._persist();
    }
  };

  CA.Storage = Storage;
  CA.newProfile = newProfile;
})(typeof window !== 'undefined' ? window : globalThis);
