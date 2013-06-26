var logger = require('./logger.js');
var binrpc = require("./binrpc.js");

var jayson = require("jayson");

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
                logger.verbose("jsonrpc -> localhost:2999 setValue "+"hm1."+obj[0]+"."+obj[1]+"."+obj[2]+" "+obj[3]+" "+true);
                homenode.request('setValue', ["hm1."+obj[0]+"."+obj[1]+"."+obj[2], obj[3], true], function(err, error, response) {

                });

        },
        newDevices: function (data) {
                homenode.request('setMetaAdapter', ["hm1."+data[0], data[1]], function(err, error, response) {

                });

        }
    }
});

hm1.init({
    wired: true,
    rf: true,
    cuxd: true
});


