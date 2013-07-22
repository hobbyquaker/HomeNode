/**
 *      HomeNodes Wunderground Adapter
 *      Version 0.1
 *
 *      Copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io
 *
 */

var http = require("http");


var settings = {

    adapterId:  "wg",

    // HomeNodes Hub Adresse
    hubAddress: "pi-blue",
    hubPort:    2099,

    interval:   3600000


};


var logger = require("../logger.js");

var io = require('socket.io-client'),
    socket = io.connect(settings.hubAddress, {
        port: settings.hubPort
    });


socket.on('connect', function () {
    console.log("Connecting HomeNode Hub");
});

socket.emit("introduce", {
    id:settings.adapterId,
    type:"wunderground"
}, function (data) {
    if (data === "welcome") {
        console.log("Connection to HomeNode Hub established.");

        wunderground.fetch(setData);

        setInterval(function () {
            wunderground.fetch(setData);
        }, settings.interval);

    }

});

function setData(data) {
    console.log(JSON.stringify(data, true, 2));
    socket.emit("method", ["setMetaAdapter", [settings.adapterId, data]]);
    socket.emit("method", ["setValue", [settings.adapterId+".weather", data.current_observation.weather]]);
    socket.emit("method", ["setValue", [settings.adapterId+".temp_c", data.current_observation.temp_c]]);
    socket.emit("method", ["setValue", [settings.adapterId+".relative_humidity", data.current_observation.relative_humidity]]);
    socket.emit("method", ["setValue", [settings.adapterId+".wind_kph", data.current_observation.wind_kph]]);
    socket.emit("method", ["setValue", [settings.adapterId+".pressure_mb", data.current_observation.pressure_mb]]);
    socket.emit("method", ["setValue", [settings.adapterId+".pressure_trend", data.current_observation.pressure_trend]]);
    socket.emit("method", ["setValue", [settings.adapterId+".dewpoint_c", data.current_observation.dewpoint_c]]);
    socket.emit("method", ["setValue", [settings.adapterId+".pressure_trend", data.current_observation.pressure_trend]]);
    socket.emit("method", ["setValue", [settings.adapterId+".feelslike_c", data.current_observation.feelslike_c]]);
    socket.emit("method", ["setValue", [settings.adapterId+".visibility_km", data.current_observation.visibility_km]]);
    socket.emit("method", ["setValue", [settings.adapterId+".solarradiation", data.current_observation.solarradiation]]);
    socket.emit("method", ["setValue", [settings.adapterId+".UV", data.current_observation.UV]]);
    socket.emit("method", ["setValue", [settings.adapterId+".precip_1hr_metric", data.current_observation.precip_1hr_metric]]);
    socket.emit("method", ["setValue", [settings.adapterId+".precip_today_metric", data.current_observation.precip_today_metric]]);
    socket.emit("method", ["setValue", [settings.adapterId+".icon_url", data.current_observation.icon_url]]);
};


var wunderground  = {

    url : "http://api.wunderground.com/api/06a17ce0f5815c2c/",
    location: "/lang:DL/q/STR.json",

    keys: {
        conditions: "current_observation",
        alerts: "alerts",
        forecast: "forecast"
    },

    data: {},

    ack: [],

    interval: 3600, // Refresh Interval in Seconds

    fetch: function (callback) {
        for (var feature in this.keys) {
            var url = this.url + feature + this.location;
            console.log("fetching: " + url);
            http.get(url, function(res) {
                var output = "";

                res.on('data', function (chunk) {
                    output += chunk;
                });

                res.on('end', function() {
                    var obj = JSON.parse(output);
                    for (var feature in obj.response.features) {
                        var key = wunderground.keys[feature];
                        wunderground.data[key] = obj[key];
                        wunderground.ack.push(key);
                        if (wunderground.ack.length == Object.keys(wunderground.keys).length) {
                            callback(wunderground.data);
                        }
                        break;
                    }
                });

            }).on('error', function(e) {
                    console.log("error: " + e.message);
                });

        }

    },


};

