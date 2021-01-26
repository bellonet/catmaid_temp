(function (CATMAID) {

  "use strict";

  /**
   * Persists key-value data through a backend API.
   *
   * @class DataStore
   * @constructor
   * @param {string} name Name of this datastore, alphanumeric and hyphens only.
   * @param {API}    api  (Optional) The back-end to use.
   */
  function DataStore(name, api = undefined) {
    this.name = name;
    this.entries = null;
    this.api = api;


    // A shared initialization promise.
    this._initEntries = null;

    CATMAID.asEventSource(this);
  }

  /**
   * Enumerate the user and project scopes for unique key-value entries provided
   * by the datastore.
   * @type {string[]}
   */
  DataStore.SCOPES = [
    'USER_PROJECT',
    'USER_DEFAULT',
    'PROJECT_DEFAULT',
    'GLOBAL'
  ];

  DataStore.EVENT_LOADED = 'event_loaded';

  /**
   * Clear any listeners to this store's events.
   */
  DataStore.prototype.destroy = function () {
    this.clear(DataStore.EVENT_LOADED);
  };

  /**
   * Load datastore values for the current user and project as well as
   * defaults.
   *
   * @return {Promise} Promise resolving once the datastore values are loaded.
   */
  DataStore.prototype.load = function () {
    return CATMAID.fetch({
          url: `/client/datastores/${this.name}/`,
          method: 'GET',
          data: {
            project_id: project ? project.id : undefined
          },
          api: this.api,
      })
      .then(data => {
        this.entries = data.reduce(
            function (e, d) {
              if (d.project) {
                var scope = d.user ? 'USER_PROJECT' : 'PROJECT_DEFAULT';
              } else {
                var scope = d.user ? 'USER_DEFAULT' : 'GLOBAL';
              }

              if (!e.has(d.key)) {
                e.set(d.key, {});
              }

              try {
                var value = (typeof d.value === 'string' || d.value instanceof String) ?
                    JSON.parse(d.value) :
                    d.value;
                e.get(d.key)[scope] = {
                  dirty: false,
                  value: value
                };
              } catch (error) {
                // Do not alert the user, since this will not affect
                // other key/scopes and there is nothing explicit they
                // can do to correct it.
                console.log('Client data for store ' + d.key +
                            ', scope ' + scope + ' was not parsable.');
              }

              return e;
            },
            new Map());
        this.trigger(DataStore.EVENT_LOADED, this);
      })
      .catch(error => {
        if (error instanceof CATMAID.ResourceUnavailableError ||
            error instanceof CATMAID.PermissionError) {
          this.entries = new Map();
          this.trigger(DataStore.EVENT_LOADED, this);
          return true;
        }
        return Promise.reject(error);
      });
  };

  /**
   * Retrieve values present in the datastore for a given key. Up to four
   * values may be returned, one for each scope.
   *
   * @param  {string} key Key in this datastore whose values to retrieve.
   * @return {Promise}    Promise yielding a values object, whose attributes
   *                      are scopes.
   */
  DataStore.prototype.get = function (key) {
    if (this.entries === null) {
      let initialized = false;
      if (!this._initEntries) {
        this._initEntries = this.load();
        initialized = true;
      }
      return this._initEntries.then(() => {
        if (initialized) {
          this._initEntries = undefined;
        }
        return this.get(key);
      });
    }

    var values = $.extend({}, this.entries.get(key));
    values = Object.keys(values).reduce(function (o, scope) {
      o[scope] = values[scope].value;
      return o;
    }, {});
    return Promise.resolve(values);
  };

  /**
   * Set a value in this datastore for a specified key and scope. Replaces any
   * existing value for the specified key and scope.
   *
   * @param  {string}  key          Key in this datastore whose value to set.
   * @param  {Object}  value        Object to store as the value.
   * @param  {string}  scope        Scope (from DataStore.SCOPES) for which to
   *                                set the specified key.
   * @param  {boolean} writeThrough True to immediately write the new value to
   *                                the backend.
   * @return {Promise}              Promise resolving once the backend store is
   *                                complete, or immediately if writeThrough is
   *                                false.
   */
  DataStore.prototype.set = function (key, value, scope, writeThrough) {
    if (DataStore.SCOPES.indexOf(scope) === -1)
      throw new TypeError('Unknown datastore scope.');

    if (!this.entries.has(key)) {
      this.entries.set(key, {});
    }
    this.entries.get(key)[scope] = {
      dirty: true,
      value: value
    };

    if (writeThrough) return this._store(key, scope);
    else return Promise.resolve();
  };

  /**
   * Store the current value for a specified key and scope to the backend.
   *
   * @param  {string}  key          Key in this datastore whose value to store.
   * @param  {string}  scope        Scope (from DataStore.SCOPES) to store.
   * @return {Promise}              Promise resolving once the backend store is
   *                                complete.
   */
  DataStore.prototype._store = function (key, scope) {
    var entry = this.entries.get(key)[scope];
    entry.dirty = false;
    return CATMAID.fetch({
        url: `/client/datastores/${this.name}/`,
        method: 'PUT',
        data: {
          project_id: (scope === 'USER_DEFAULT' ||
                       scope === 'GLOBAL') ?
              undefined : project.id,
          ignore_user: scope === 'PROJECT_DEFAULT' ||
                       scope === 'GLOBAL',
          key: key,
          value: JSON.stringify(entry.value)
        },
        api: this.api,
      })
      .catch(reason => {
        if (reason && reason.status && reason.status === 403) {
          console.log('Datastore lacks permissions to store for ' +
                      `store: ${this.name} key: ${key} scope: ${scope}`);
        }
      });
  };

  /**
   * Store any values that are dirty, that is, values that have been changed
   * using set but have not been stored to the backend.
   */
  DataStore.prototype._storeDirty = function () {
    this.entries.forEach(function (scopes, key) {
      Object.keys(scopes).forEach(function (scope) {
        var entry = scopes[scope];
        if (entry.dirty) {
          this._store(key, scope);
        }
      }, this);
    }, this);
  };

  /**
   * Clear all data in this data store. Warning, this is a destructive method.
   */
  DataStore.prototype.clearStore = function (scope) {
    return CATMAID.fetch({
        url: `/client/datastores/${this.name}/`,
        method: 'DELETE',
        data: {
          project_id: (scope === 'USER_DEFAULT' ||
                       scope === 'GLOBAL') ?
              undefined : project.id,
          ignore_user: scope === 'PROJECT_DEFAULT' ||
                       scope === 'GLOBAL',
        },
        api: this.api,
    });
  };

  CATMAID.DataStore = DataStore;

  /**
   * A manager for loading, retrieving and reloading DataStores. Most access
   * to stores should be through this manager's get method.
   */
  CATMAID.DataStoreManager = (function () {
    var datastores = new Map();

    return {
      get: function (name) {
        if (datastores.has(name)) {
          return datastores.get(name);
        } else {
          var store = new DataStore(name);
          datastores.set(name, store);
          return store;
        }
      },

      reloadAll: function () {
        var loaders = [];
        datastores.forEach(function (datastore) {
          loaders.push(datastore.load());
        });
        return Promise.all(loaders);
      }
    };
  })();

})(CATMAID);
