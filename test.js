var binrpc = require("./binrpc.js"),
    winston = require('winston');

var devices = {
    hm1: {

    }
};

var hm1 = new binrpc({
    ccuIp: "172.16.23.3",
    listenIp: "172.16.23.153",
    listenPort: 3000,
    prefix: "hm1",
    methods: {
        event: function (obj) {
            //winston.info("event: " + JSON.stringify(obj));
        },
        newDevices: function (data) {
            //console.log(data);
            //devices.hm1[data[0]] = data[1];
            //console.log(devices.hm1);
        }
    }
});

hm1.init({
    wired: true,
    rf: true,
    cuxd: true
});


