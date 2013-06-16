var Put = require('put');
var net = require('net');
var binary = require('binary');
var argv = require('optimist').
    usage('Usage: $0 --ccu [ip] --listen [ip] --lport [num] --rf --hs485 --cux --debug [num]').
    demand(['listen','lport', 'ccu']).
    argv;

var binrpc = {
    options: {},
    serverRunning: false,
    methods: {
        "system.multicall": function (data) {
           binrpc.debug(0,"method system.multicall " + data.length);

            for (var i = 0; i < data.length; i++) {
                if (binrpc.methods[data[i].methodName]) {
                    binrpc.methods[data[i].methodName](data[i].params);
                } else {
                   console.log("method " + data[i].methodName + " nicht gefunden :-(");
                }
            }

        },
        "event": function (data) {
            binrpc.debug(0,"method event");
            binrpc.debug(0,data);

            var output = {};
            output[data[0]+"."+data[1]+"."+data[2]] = data[3];

            console.log(output);

        }
    },
    debug: function (lvl, str) {
        if (argv.debug >= lvl) {
           console.log(str);
        }
    },
    request: function (port, method, data, callback) {
       binrpc.debug(0,{port:port,methodName:method,data:JSON.stringify(data)});
        this.sendRequest(port, this.buildRequest(method, data), callback);
    },
    buildRequest: function (method, data) {
        //console.log("binrpc.buildRequest(" + method);
        //console.log(data);
        //console.log(");");
        if (!data) {
            data = [];
        }

        var dataLength = 0;

        for (var i = 0; i < data.length; i++) {
            dataLength += (8 + data[i].length);
        }

        var buf = Put()
            .put(new Buffer('Bin', 'ascii'))
            .word8(0)
            .word32be(8 + method.length + dataLength) // Msg Size
            .word32be(method.length)
            .put(new Buffer(method, 'ascii'))
            .word32be(data.length)
            .buffer()
        ;
        /*var databuf = Put()
            .word32be(0) // Data Length
            .buffer();*/



        for (var i = 0; i < data.length; i++) {
            buf = Buffer.concat([buf, binrpc.buildString(data[i])]);
        }
        //console.log(buf);
        return buf;
    },
    buildString: function (str) {
        var buf = Put()
            .word32be(3)
            .word32be(str.length)
            .put(new Buffer(str, 'ascii'))
            .buffer();
        return buf;
    },
    parseData: function (data) {
        //console.log("parseData data.length="+data.length);
        //console.log(data);
        if (!data) { return };
        var res = binary.parse(data)
            .word32bu("dataType")
            .buffer("elements", data.length)
            .vars;


        switch (res.dataType) {
            case 0x101:
                var struct = binary.parse(res.elements)
                    .word32bu("elementCount")
                    .buffer("elements", data.length)
                    .vars;
                binrpc.debug(1,"struct.length "+struct.elementCount);

                var elements = struct.elements;
                var result = {};
                for (var i = 0; i < struct.elementCount; i++) {
                    binrpc.debug(1,"struct["+i+"]");
                    var key = binary.parse(elements)
                        .word32bu("keylength")
                        .buffer("key", "keylength")
                        .buffer("rest", data.length)
                        .vars;
                    //console.log(key.key.toString());


                    elements = key.rest;
                    var elem = (binrpc.parseData(elements));
                    elements = elem.rest;
                    result[key.key.toString()] = elem.content;


                }
                //console.log(result);
                return {content: result, rest: elements};

                break;
            case 0x100:
                var arr = binary.parse(res.elements)
                    .word32bu("elementCount")
                    .buffer("elements", data.length)
                    .vars;
                binrpc.debug(1,"array.length "+arr.elementCount);

                var elements = arr.elements;
                var result = [];
                for (var i = 0; i < arr.elementCount; i++) {
                    //console.log("array["+i+"] ");
                    //console.log("elements");
                    //console.log(elements);
                    if (!elements) {
                        return {content: "", rest: undefined};
                    }
                    var res = binrpc.parseData(elements);

                    elements = res.rest;
                    result.push(res.content);
                }
                binrpc.debug(1,result);
                return {content: result, rest: elements};
                break;
            case 0x04:
                var flt = binary.parse(res.elements)
                    .word32bs("mantissa")
                    .word32bs("exponent")
                    .buffer("rest", data.length)
                    .vars;
                flt.content = (((Math.pow(2, flt.exponent)) * (flt.mantissa / (1 << 30))).toFixed(6));
                binrpc.debug(1,"float "+flt.content);
                return flt;
                break;
            case 0x03:
                var str = binary.parse(res.elements)
                    .word32bu("strLength")
                    .buffer("strContent", "strLength")
                    .buffer("rest", data.length)
                     .vars;
                str.content = str.strContent.toString();
                binrpc.debug(1,"string "+str.content)
                return str;
                break;
            case 0x02:
                var int = binary.parse(res.elements)
                    .word8("value")
                    .buffer("rest", data.length)
                    .vars;
                int.content = (int.value == 1 ? true : false);
                binrpc.debug(1,"bool " + int.content);
                return (int);
                break;

                break;
            case 0x01:
                var int = binary.parse(res.elements)
                    .word32bu("value")
                    .buffer("rest", data.length)
                    .vars;
                int.content = int.value;
                binrpc.debug(1,"integer " + int.content);
                return (int);
                break;
            default:
                binrpc.debug(1,"unknow data type " + res.dataType + " :(");
        }
    },
    parseResponse: function (data) {

        var vars = binary.parse(data)
                .buffer("head", 3)
                .word8("msgType")
                .word32bu("msgSize")
                .buffer("body", "msgSize")
                .vars
            ;
//console.log("parseResponse data.length="+data.length+" msgSize="+vars.msgSize+ " body.length="+vars.body.length);
        if (vars.head.toString() != "Bin") {
           console.log("malformed header :-( " + vars.head.toString() );
            //return false;
        }

        vars.head = vars.head.toString();

        switch (vars.msgType) {
            case 0:
               binrpc.debug(0,"BIN-RPC Request?!");
               //debug(0,binrpc.parseData(vars.body));
                break;
            case 1:
               binrpc.debug(0,"BIN-RPC Response");
                var res = binrpc.parseData(vars.body);
                //console.log(res.content);
                break;
        }

        if (res.rest.length > 0) {
           console.log("rest..... :-(");
           binrpc.debug(0,res.rest);
        }
        return res.content;

    },
    parseRequest: function (data) {
        var vars = binary.parse(data)
                .buffer("head", 3)
                .word8("msgType")
                .word32bu("msgSize")
                .buffer("body", data.length)
                .vars
            ;

        if (vars.head.toString() != "Bin") {
            console.log("malformed header :-(");
            return false;
        }

        vars.head = vars.head.toString();

        var method = binary.parse(vars.body)
            .word32bu("strSize")
            .buffer("name", "strSize")
            .word32bu("elementcount")
            .buffer("body", data.length)
            .vars

        switch (vars.msgType) {
            case 0:
                binrpc.debug(0,"BIN-RPC Request");
                var res = binrpc.parseData(method.body);

                if (method.name.toString() == "event") {
                    var data = [];
                    // Hmm?!? Einzelne (nicht in multicall verpackte) Events etwas seltsam - Nach Methode folgen direkt
                    // 3 Strings und eine weitere Variable, ohne "Umverpackung" in Struct oder Array und ohne Angabe
                    // der Anzahl der Parameter...
                    var tmp = binrpc.parseData(method.body);
                    data.push(tmp.content);
                    tmp = binrpc.parseData(tmp.rest);
                    data.push(tmp.content);
                    tmp = binrpc.parseData(tmp.rest);
                    data.push(tmp.content);
                    tmp = binrpc.parseData(tmp.rest);
                    data.push(tmp.content);
                    binrpc.methods.event(data);
                    break;
                }

                if (binrpc.methods[method.name.toString()]) {
                    binrpc.methods[method.name.toString()](res.content);
                } else {
                    console.log("method " + method.name.toString() + " nicht gefunden :-(");
                }
                //console.log(JSON.stringify({methodName:method.name.toString(),params:res.content}));
                break;
            default:
               binrpc.debug(0,"hier läuft was schief :(");
        }

        return vars;
    },
    sendRequest: function (port, buf, callback) {
        var response = new Buffer(0);
        var chunk = 0;
        var length;

        var client = net.createConnection(port, binrpc.options.connectIp,
            function() { //'connect' listener
               binrpc.debug(0,'sending:');
               binrpc.debug(0,buf);
                client.write(buf.toString());
            });

        client.on('data', function(data) {
            //console.log("receiving chunk "+chunk+" data.length="+data.length);

            if (chunk == 0) {
                var vars = binary.parse(data)
                    .buffer("head", 3)
                    .word8("msgType")
                    .word32bu("msgSize")
                    .vars;
                length = vars.msgSize;
                response = data;
            } else {
                response = Buffer.concat([response, data]);

            }
            chunk = chunk + 1;

           //debug(0,"response.length="+response.length);

            if (response.length >= (length + 8)) {
                client.end();
                var res = binrpc.parseResponse(response);
                if (callback) { callback(res); }
            }

            /*console.log("##############################\n\n\n");
           binrpc.debug(0,"receiving: ");
           binrpc.debug(0,data.length);
            var res = binrpc.parseResponse(data);
            //debug(0,res);
            client.end();
            if (callback) { callback(res); }*/

        });

        client.on('end', function() {

           binrpc.debug(0,'disconnected');
        });
    },
    init: function (options) {
        binrpc.options = options;

        if (!binrpc.serverRunning) {
            binrpc.serverRunning = true;

            var server = net.createServer(function(c) {
                var receiver = new Buffer(0);
                var chunk = 0;
                var length;

               binrpc.debug(0,'client connected');

                c.on('end', function() {
                   binrpc.debug(0,'client disconnected');
                });

                c.on('data', function (data) {
                    //console.log("server receiving:");
                    //console.log(data);

                    if (chunk == 0) {
                        var vars = binary.parse(data)
                            .buffer("head", 3)
                            .word8("msgType")
                            .word32bu("msgSize")
                            .vars;
                        length = vars.msgSize;
                        receiver = data;
                    } else {
                        receiver = Buffer.concat([receiver, data]);

                    }
                    chunk = chunk + 1;

                    //console.log("receiver.length="+receiver.length);

                    if (receiver.length >= (length + 8)) {
                        //var res = binrpc.parseResponse(receiver);
                        //if (callback) { callback(res); }
                        //console.log(res.content);

                        binrpc.parseRequest(receiver);

                        var buf = Put()
                                .put(new Buffer('Bin', 'ascii'))
                                .word8(1)
                                .word32be(8) // Msg Size
                                .word32be(3)
                                .word32be(0)
                                .buffer()
                            ;
                       binrpc.debug(0,"responding: ");
                       binrpc.debug(0,buf);
                        c.write(buf);
                    }

                });

            });
            server.listen(binrpc.options.listenPort, function() { //'listening' listener
               console.log('RPC server listening on port '+binrpc.options.listenPort);
            });
        }
        // RPC Init anmelden
        binrpc.request(options.connectPort, "init", ["xmlrpc_bin://"+binrpc.options.listenIp+":"+binrpc.options.listenPort, binrpc.options.identifier]);

        // RPC Init abmelden bevor Prozess beendet wird
        process.on('SIGINT', function () {
            if (binrpc.serverRunning) {
                binrpc.serverRunning = false;
                if (argv.wired) {
                    binrpc.request(2000, "init", ["xmlrpc_bin://"+binrpc.options.listenIp+":"+binrpc.options.listenPort, ""])
                    console.log("stopping rs485 init");
                }
                if (argv.rf) {
                    binrpc.request(2001, "init", ["xmlrpc_bin://"+binrpc.options.listenIp+":"+binrpc.options.listenPort, ""])
                    console.log("stopping rf init");
                }
                if (argv.cux) {
                    binrpc.request(8701, "init", ["xmlrpc_bin://"+binrpc.options.listenIp+":"+binrpc.options.listenPort, ""])
                    console.log("stopping cux init");
                }
                server.close();
                console.log("RPC Server stopped");
            }
        });
    }
};

if (argv.wired) {
    binrpc.init({
        connectIp: argv.ccu,
        connectPort: 2000,
        listenIp: argv.listen,
        listenPort: argv.lport,
        identifier: argv.identifier || "BidCos-Wired"
    });
    console.log("starting rs485 init");
}

if (argv.rf) {
    binrpc.init({
        connectIp: argv.ccu,
        connectPort: 2001,
        listenIp: argv.listen,
        listenPort: argv.lport,
        identifier: argv.identifier || "BidCos-RF"

    });
    console.log("starting rf init");
}

if (argv.cux) {
    binrpc.init({
        connectIp: argv.ccu,
        connectPort: 8701,
        listenIp: argv.listen,
        listenPort: argv.lport,
        identifier: argv.identifier || "CUxD"
    });
    console.log("starting cux init");
}


//var buf = binrpc.buildRequest("getValue", ["CUX0100001:1", "TEMPERATURE"]);
//var buf = binrpc.buildRequest("getDeviceDescription", ["CUX0100002"]);
//var buf = binrpc.buildRequest("getParamset", ["CUX0100002:1", "MASTER"]);
//var buf = binrpc.buildRequest("system.listMethods");
//var buf = binrpc.buildRequest("listDevices");


/*
binrpc.request("listDevices", [], function(res) {
   binrpc.debug(0,res);
});

binrpc.request("system.listMethods", [], function(res) {
   binrpc.debug(0,res);
});*/

