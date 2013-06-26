var extend = require("./extend.js");
var jayson = require("jayson");
var nano;
var dbData, dbMetaAdapters;
var logger = require('./logger.js');

homenode = {

    data: {},
    adapters: [],
    subscribers: [],
    profiles: {
        "key": {
            datatype: "integer", // float, bool, string, valueList, array, object
            min: 0,
            max: 100,
            default: 0,
            unit: "%",
            step: 1,

            parent: "key",
            children: []
        }
    },
    metaCommon: {
        "key": {
            name: "",
            desc: "",

            type: "HM.HSS_DP",

            profile: "key",

            valid: [], //undefined


            access: "rw",

            parent: "key",
            children: []

        }
    },
    metaAdapters: {},

    subscribe: function (regex, callback) {
        this.subscribers.push({regex:(new RegExp(regex)),callback:callback});
    },
    setValue: function (key, val, certain, src) {

        logger.verbose(src+" <-- setValue "+key+","+val+","+certain);

        var rev, oldval = this.data[key];
        if (oldval) {
            rev = oldval._rev;
        }
        var newval = {
            _rev: rev,
            value: val,
            timestamp: (new Date().getTime()),
            certain: certain
        };

        this.data[key] = newval;

        for (var i = 0; i < this.subscribers.length; i++) {
            if (key.match(this.subscribers[i].regex)) {
                this.subscribers[i].callback(key, newval, oldval);
            }
        }

    },
    getValue: function (key) {
        return this.data[key].value;
    },
    setMetaAdapter: function(key, doc) {
        console.log("setMetaAdapter "+key);
        console.log(doc);
        logger.verbose("couchdb --> insert "+key+" "+doc._rev);
        for (var i = 0; i < doc.length; i++) {
            this.metaAdapters[key+"."+doc[i].ADDRESS] = doc[i];
            dbMetaAdapters.insert(doc[i], key+"."+doc[i].ADDRESS, function (err, body) {
                if (err) {
                    logger.warn("couchdb <-- insert error: "+err.reason);
                }
            });
        }

    },
    getMeta: function() {},
    init: function () {
        var that = this;
        var server = jayson.server({
            subscribe: function(regex, url, callback) {
                that.subscribe(regex, function() {
                    // Sende Aktualisierung, Batches?
                });
                callback(null, true);
            },
            unsubscribe: function(url, callback) {

                callback(null, true);
            },
            setValue: function(key, val, certain, callback) {
                that.setValue(key, val, certain, "jsonrpc");
                callback(null, true);
            },
            getValue: function(key, callback) {
                callback(null, that.getValue(key));
            },
            setMetaAdapter: function(key, doc, callback) {
                that.setMetaAdapter(key, doc);
                callback(null, true);
            },
            getMeta: function(key, callback) {
                callback(null, that.getMeta(key));
            }
        });

        server.http().listen(2999);
    },
    initCouchDB: function() {
        var that = this;
        nano = require('nano')('http://localhost:5984');
        nano.db.create('homenode-meta-adapters');
        nano.db.create('homenode-data');
        dbData = nano.db.use('homenode-data');
        dbMetaAdapters = nano.db.use('homenode-meta-adapters');
        this.subscribe(".*", function(key, doc) {
            logger.verbose("couchdb --> insert "+key+" "+doc._rev);
            dbData.insert(doc, key, function(err, body) {

                if (!err) {
                    logger.verbose("couchdb <-- insert "+body.id+" "+(body.ok?"ok":"fail")+" "+body.rev);

                    that.data[key]._rev = body.rev;
                } else {
                    switch (err.status_code) {
                        case 409:
                            logger.warn("couchdb <-- insert error: "+err.reason);
                            dbData.get(key, function (error, existing) {
                                if (error) {
                                    logger.error("couchdb <-- get error:"+err.reason);
                                    return false;
                                }
                                doc._rev = existing._rev;
                                dbData.insert(doc, key, function(err, body) {
                                    if (!err) {
                                        logger.verbose("couchdb <-- insert "+body.id+" "+(body.ok?"ok":"fail")+" "+body.rev);

                                        that.data[key]._rev = body.rev;
                                    }
                                });
                            });
                            break;
                        default:
                            console.log(err)
                    }
                }
            });
        });
    }
};

homenode.init();
//homenode.initCouchDB();

