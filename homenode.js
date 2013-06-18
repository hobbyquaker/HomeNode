var jayson = require("jayson");

var homenode = {
    datapoints: {},
    datapointsMeta: {},
    subscribers: {},
    subscribe: function (pattern, callback) {
        var pattern = "all";
        if (!this.subscribers[pattern]) {
            this.subscribers[pattern] = [];
        }
        this.subscribers[pattern].push(callback);
    },
    setValue: function (key, val, certain) {

        console.log("setValue("+key+","+val+")");

        var oldval = this.datapoints[key];
        var newval = {
            value: val,
            timestamp: undefined,
            certain: certain
        };
        this.datapoints[key] = val;

        key = "all";
        if (this.subscribers[key]) {
            for (var i = 0; i < this.subscribers[key].length; i++) {
                this.subscribers[key][i](key, newval, oldval);
            }
        }
    },
    getValue: function (key) {
        return this.datapoints[key].value;
    },
    init: function () {
        var that = this;
        var server = jayson.server({
            setValue: function(key, val, callback, certain) {
                that.setValue(key, val, certain);
                callback(null, true);
            },
            getValue: function(key, callback) {
                callback(null, that.getValue(key));
            }
        });

        server.http().listen(3000);
    }
};

homenode.init();


homenode.subscribe("all", function (key,val) {
    console.log("i'm a subscriber!!! "+key+" "+val);
});
homenode.subscribe("all", function (key,val) {
    console.log("me2!!! "+key+" "+val);
});