var jayson = require("jayson"),

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
    setValue: function (key, val, certain) {

        console.log("setValue("+key+","+val+")");

        var oldval = this.data[key];

        var newval = {
            value: val,
            timestamp: undefined,
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
    setMeta: function() {},
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
            setValue: function(key, val, callback, certain) {
                that.setValue(key, val, certain);
                callback(null, true);
            },
            getValue: function(key, callback) {
                callback(null, that.getValue(key));
            },
            setMeta: function(key, val, callback) {
                that.setMeta(key, val);
                callback(null, true);
            },
            getMeta: function(key, callback) {
                callback(null, that.getMeta(key));
            }
        });

        server.http().listen(2999);
    }
};

homenode.init();


