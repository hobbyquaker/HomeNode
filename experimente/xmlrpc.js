var xmlrpc = require('xmlrpc');

var nano = require('nano')('http://localhost:5984');

nano.db.create('test');

var db = nano.db.use('test');



/**
 *
 * @param options
 * @constructor
 *
 * options: {
 *            ccuAddress: "",
 *            subscribeRfd: "",
 *            subscribeRs485d: "",
 *            subscribePfmd: "",
 *            subscribeCuxd: "",
 *            serverPort: 9090
 *          }
 *
 */

var Homematic = function (options) {
    console.log("Homematic Module Constructor");
    console.log(options);
    this.ccuAddress = options.ccuAddress;
    this.server = {};
    this.listenPort = 9090;
    this.listenAddress = getIPAddress();
    console.log("Address "+this.listenAddress);
}

Homematic.prototype = {
    ccuAddress: undefined,
    listenAddress: undefined,
    listenPort: undefined,
    startServer: function () {
        var _this = this;
        this.server = xmlrpc.createServer({ host: undefined, port: this.listenPort });

        // Handle methods not found
        this.server.on('NotFound', function(method, params) {
            console.log('Method ' + method + ' does not exist');
        });
        // Handle method calls by listening for events with the method call name
        this.server.on('system.multicall', function(err, methods, callback) {
            methods = methods[0];

            for (var i=0;  i < methods.length; i++) {
                _this.server.emit(methods[i].methodName, null, methods[i].params, callback);
            }
        });
        this.server.on('listDevices', function (err, params, callback) {
            console.log('listDevices');
            //console.log(params);

            // ...perform an action...

            // Send a method response with a value
            callback(null, undefined);
        });
        this.server.on('event', function (err, params, callback) {
            console.log('event ' + params[1]+"."+params[2]+" "+params[3]);
            //console.log(params);

            /*var data = {}; // = db.get(params[1]);

           db.get(params[1], function (error, existing) {
                console.log("db.get "+params[1]);
                console.log(existing);

                if(!error) {
                    data = existing;

                }

                data[params[2]] = params[3];

                console.log("db.insert "+params[1]+" "+data._rev);
                console.log(data);

                db.insert(data, params[1], function(err, body) {
                    if (!err) {
                       // console.log(body);
                    }
                });
            });*/
            // ...perform an action...

            // Send a method response with a value
            callback(null, undefined);
        });
        this.server.on('newDevices', function (err, params, callback) {
            console.log('Method call params for newDevices: ');
            console.log(params);

            // ...perform an action...

            // Send a method response with a value
            callback(null, undefined);
        });
        this.server.on('newDevice', function (err, params, callback) {
            console.log('Method call params for newDevice: ');
            console.log(params);

            // ...perform an action...

            // Send a method response with a value
            callback(null, undefined);
        });
        console.log('XML-RPC server listening on port '+ this.listenPort);
    },
    subscribe: function (port) {
        this.xmlrpc(port, "init", ["http://"+this.listenAddress+":"+this.listenPort, "HomeNode"], function (data) {
            console.log("init response");
            console.log(data);
        });
    },
    unsubscribe: function (port, callback) {
        this.xmlrpc(port, "init", ["http://"+this.listenAddress+":"+this.listenPort, ""], function (data) {
            console.log("initCancel response");
            console.log(data);
            callback();
        });
    },
    xmlrpc: function (port, method, params, callback) {
        console.log("xmlrpc call "+this.ccuAddress+":"+port+" method="+method+" params=");
        console.log(params);
        var client = xmlrpc.createClient({ host: this.ccuAddress, port: port, path: '/'})

        if (!params) { params = []; }

        client.methodCall(method, params, function (error, value) {
            if (error) {
                console.log("xmlrpc error");
                console.log(error);
            } else {
                if (typeof(callback) == 'function') {
                    callback(value);
                }
            }
        });

    },
    binrpc: function (port, method, params, callback) {

    }
}

module.exports = Homematic;


function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }

    return '0.0.0.0';
}