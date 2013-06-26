var binrpc = require("./binrpc.js");

var homematic = new binrpc({
    ccuIp: "172.16.23.3",
    listenIp: "172.16.23.153",
    listenPort: 2013,
    methods: {
        event: function (obj) {
        }
    }
});

homematic.init({
    wired: true,
    rf: true,
    cuxd: true
});
