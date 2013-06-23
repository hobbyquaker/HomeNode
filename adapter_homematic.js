var logger = require('./logger.js');
var binrpc = require("./binrpc.js");

var jayson = require("jayson");

// create a client
var homenode = jayson.client.http({
    port: 2999,
    hostname: 'localhost'
});




var hm1 = new binrpc({
    ccuIp: "172.16.23.3",
    listenIp: "172.16.23.153",
    listenPort: 2013,
    methods: {
        event: function (obj) {
            // invoke "add"
                homenode.request('setValue', [obj[0]+"."+obj[1]+"."+obj[2], obj[3]], function(err, error, response) {

                });

        },
        newDevices: function (data) {


        }
    }
});

hm1.init({
    wired: true,
    rf: true,
    cuxd: true
});


