/**
 *      HomeNodes
 *
 *      Copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io
 *
 */

var settings = {

    adapterId:  "test1",

    // HomeNodes Hub Adresse
    hubAddress: "pi-blue",
    hubPort:    2099,

};


var logger = require("./logger.js");


var io = require('socket.io-client'),
    socket = io.connect(settings.hubAddress, {
        port: settings.hubPort
    });


socket.on('connect', function () {
    console.log("Connecting HomeNode Hub");
});

socket.emit("introduce", {
    id:settings.adapterId,
    type:"homematic"
}, function (data) {
    if (data === "welcome") {
        console.log("Connection to HomeNode Hub established.");

        socket.emit("method", ["subscribe", [function (data) {
            console.log(data);
        }, ".*", true]]);


    }

});