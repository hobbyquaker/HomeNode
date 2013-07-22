/**
 *      HomeNodes HomeMatic Adapter
 *      Version 0.1
 *
 *      Copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io
 *
 */

var settings = {

    adapterId:  "hm1",

    // HomeNodes Hub Adresse
    hubAddress: "pi-blue",
    hubPort:    2099,

    // IP-Adresse des Servers auf dem der Homematic-Adapter selbst läuft
    listenIp:   "172.16.23.19",
    listenPort: 2013,

    // IP-Adresse der HomeMatic CCU
    ccuAddress: "172.16.23.3",
    inits: [
        { id: "io_cuxd", port: 8701 },
        { id: "io_rf", port: 2001 },
        { id: "io_wired", port: 2000 }
    ],
    loadCcuData: [
        "variables",
        "programs",
        "functions",
        "rooms",
        "devices"
    ]

};


var logger = require("../logger.js");
var binrpc = require("./homematic/binrpc.js");
var regahss = require("./homematic/rega.js");
var rega = new regahss({"ccuAddress":settings.ccuAddress});

var io = require('socket.io-client'),
    socket = io.connect(settings.hubAddress, {
        port: settings.hubPort
    });


socket.on('connect', function () {
    logger.info("Connecting HomeNode Hub");
});

socket.emit("introduce", {
    id:settings.adapterId,
    type:"homematic"
}, function (data) {
    if (data === "welcome") {
        console.log("Connection to HomeNode Hub established.");

        var homematic = new binrpc({
            ccuIp: settings.ccuAddress,
            listenIp: settings.listenIp,
            listenPort: settings.listenPort,
            inits: settings.inits,
            methods: {
                event: function (obj) {
                    var res = [];
                    switch (obj[0]) {
                        case "io_cuxd":
                        case "CUxD":
                            res = [settings.adapterId+".CUxD." + obj[1] + "." + obj[2], obj[3], true];
                            break;
                        case "io_rf":
                            res = [settings.adapterId+".BidCos-RF." + obj[1] + "." + obj[2], obj[3], true];
                            break;
                        case "io_wired":
                            res = [settings.adapterId+".BidCos-Wired." + obj[1] + "." + obj[2], obj[3], true];
                            break;
                        default:
                            res = [settings.adapterId+"."+obj[0] + "." + obj[1] + "." + obj[2], obj[3], true];
                    }
                    logger.verbose("socket --> event " + JSON.stringify(res));
                    socket.emit("method", ["setValue", res]);
                    return "";
                }
            }
        });

        homematic.init();



        function loadCcuData(index) {
            if (index === undefined) { index = 0; }
            if (settings.loadCcuData[index]) {
                rega.loadCcuData(settings.loadCcuData[index], function (data) {
                    logger.verbose("socket --> setMetaAdapter " + JSON.stringify(data));
                    socket.emit("method", ["setMetaAdapter", [settings.adapterId, data]]);

                    loadCcuData(index+1)

                });

            }
        }




        loadCcuData();


    }

});