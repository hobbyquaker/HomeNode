/**
 *      HomeNodes Hub
 *
 *      Copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io
 *
 */

var settings = {

    // Websocket listening Port
    listenPort: 2099,

    // Simple-API listening Port
    simpleListenPort: 2098,

    // Database Connection
    couchDb: true,

    couchDbAddress: "localhost",
    couchDbPort: 5984,
    // Database Names
    couchDbData:            "homenode-data",
    couchDbMeta:            "homenode-meta",
    couchDbMetaAdapters:    "homenode-meta-adapters"

}

var logger = require('./logger.js'),
    io = require('socket.io').listen(settings.listenPort, {log:false});

if (settings.couchDb) {
    var nano = require('nano')('http://'+settings.couchDbAddress+':'+settings.couchDbPort);
}

var hub = {
    version: "0.1",

    data: {},

    metaData: {},

    adapters: {},

    metaAdapters: {},

    subscribers: [],

    subscribe: function (callback, regex, updates) {
        this.subscribers.push({regex:(new RegExp(regex)),updates:updates,callback:callback});
    },
    setMetaData: function (key, obj) {
        this.metaData[key] = obj;
    },
    setMetaAdapter: function (key, obj) {
        this.metaAdapters[key] = obj;
        if (settings.couchDb) {
            this.insertDb("metaAdaptersDb", key, obj);
        }

    },
    getMetaData: function (key) {
        return this.metaData[key];
    },
    getMetaAdapter: function (key) {
        return this.metaAdapters[key];
    },
    setValue: function (key, val, ack) {

        logger.verbose(" <-- setValue "+key+"="+val+" ack="+ack);
        if (this.data[key]) {
            var oldval = this.data[key];
        } else {
            var oldval = {};
        }

        var newval = oldval;

        newval.val = val;
        newval.ts = (new Date().getTime());

        if (!oldval.ack || newval.val !== oldval.val) {
            newval.ack = ack;
        }

        this.data[key] = newval;

        if (settings.couchDb) {
           // this.insertData(key);
        }

        var change = (newval.val !== oldval.val || newval.ack !== oldval.ack);

        // Call Subscribers
        for (var i = 0; i < this.subscribers.length; i++) {
            var sub = this.subscribers[i];
            if ((sub.updates || change) && key.match(sub.regex)) {
                // Todo: Weitermachen wenn was schief läuft!
                sub.callback(key, newval, oldval);
            }
        }
    },
    getValue: function (key) {
        return this.data[key].value;
    },
    getTimestamp: function (key) {

    },
    init: function () {
        logger.info("HomeNodes Hub "+this.version);
        logger.info("Copyright (c) 2013 Hobbyquaker ");

        var that = this;

        if (settings.couchDb) {
            this.initCouchDb();
        }

        io.sockets.on('connection', function (socket) {
            logger.verbose("connection");
            socket.on('introduce', function (data, callback) {
                socket.set("adapterId", data.id);
                that.adapters[data.id] = data;
                callback("welcome");
                logger.info("Adapter " + data.id + " ("+that.adapters[data.id].type+") introduced himself");
                logger.verbose("current Adapters: " + JSON.stringify(that.adapters));
            });
            socket.on('event', function (data) {
                socket.get('adapterId', function (err, id) {
                    logger.verbose('event '+ id);
                    console.log(data);
                });
            });
            socket.on('method', function (data) {
                socket.get('adapterId', function (err, id) {
                    logger.debug('method ' + id + " "+JSON.stringify(data));
                    var method = data[0];
                    var params = data[1];
                    that[method].apply(that, params);
                });
            });
            socket.on('disconnect', function (data) {
                socket.get('adapterId', function (err, id) {
                    if (!err) {
                        logger.info('Adapter '+ id +' ('+that.adapters[id].type+') disconnected');
                        delete that.adapters[id];
                        logger.verbose("current Adapters: " + JSON.stringify(that.adapters));

                    }
                });
            });
        });

    },
    initCouchDb: function () {
        logger.verbose("init CouchDB");
        nano.db.create(settings.couchDbData, function(err, body) {
            if (!err) {
                logger.verbose('database '+settings.couchDbData+' created');
            } else {
                if (err.error != "file_exists") {
                    logger.error(err);
                }
            }
        });
        nano.db.create(settings.couchDbMeta, function(err, body) {
            if (!err) {
                logger.verbose('database '+settings.couchDbMeta+' created');
            } else {
                if (err.error != "file_exists") {
                    logger.error(err);
                }
            }
        });
        nano.db.create(settings.couchDbMetaAdapters, function(err, body) {
            if (!err) {
                logger.verbose('database '+settings.couchDbMetaAdapters+' created');
            } else {
                if (err.error != "file_exists") {
                    logger.error(err);
                }
            }
        });
        hub.dataDb =            nano.use(settings.couchDbData);
        hub.metaDb =            nano.use(settings.couchDbMeta);
        hub.metaAdaptersDb =    nano.use(settings.couchDbMetaAdapters);
    },
    insertData: function (key) {
        var that = this;
        logger.verbose("database insert dataDb "+key+": "+JSON.stringify(this.data[key]));
        this.dataDb.insert(that.data[key], key, function (err, body) {
            if (err && err.status_code == 409) {
                logger.warn("database dataDb "+key+" update conflict");
                that.dataDb.get(key, function (err, cur) {
                    that.data[key]._rev = cur._rev;
                    console.log(that.data);
                    that.insertData(key);
                });
            } else if (err) {
                logger.error("database dataDb "+key+" "+err.reason);
            } else {

            }
        });

    },
    insertDb: function (db, key, val) {
        var that = this;
        logger.verbose("database insert "+db+" "+key+": "+JSON.stringify(val));
        this[db].insert(val, key, function (err, body) {
            if (err && err.status_code == 409) {
                logger.warn("database "+db+" "+key+" update conflict");
                that.getDb(db, key, function (cur) {
                    val._rev = cur._rev;
                    switch (db) {
                        case "dataDb":
                            that.data[key]._rev = cur._rev;
                            break;
                        case "metaAdaptersDb":
                            that.metaAdapters[key]._rev = cur._rev;
                            break;
                        case "metaDb":
                            that.metaData[key]._rev = cur._rev;
                            break;
                    }
                    that.insertDb(db, key, val);
                });
            } else if (err) {
                logger.error("database "+err.reason);
            } else {
                switch (db) {
                    case "dataDb":
                        that.data[key]._rev = body._rev;
                        break;
                    case "metaAdaptersDb":
                        that.metaAdapters[key]._rev = body._rev;
                        break;
                    case "metaDb":
                        that.metaData[key]._rev = body._rev;
                        break;
                }
            }
        });
    },
    getDb: function (db, key, callback) {
        this[db].get(key, function (err, body) {
            if (err) {
                logger.error("database get error"+db+" "+key+" "+err.reason);
                return false;
            }
            callback(body);
        });
    }

};

hub.init();


