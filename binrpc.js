var Put = require('put');
var net = require('net');
var binary = require('binary');

var binrpc = {
    debug: function (str) {
        console.log(str);
    },
    request: function (method, data, callback) {
        console.log({methodName:method,data:JSON.stringify(data)});
        this.sendRequest(this.buildRequest(method, data), callback);
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
        console.log("parseData data.length="+data.length);
        console.log(data);
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
                binrpc.debug("struct.length "+struct.elementCount);

                var elements = struct.elements;
                var result = {};
                for (var i = 0; i < struct.elementCount; i++) {
                    binrpc.debug("struct["+i+"]");
                    var key = binary.parse(elements)
                        .word32bu("keylength")
                        .buffer("key", "keylength")
                        .buffer("rest", data.length)
                        .vars;
                    console.log(key.key.toString());


                    elements = key.rest;
                    var elem = (binrpc.parseData(elements));
                    elements = elem.rest;
                    result[key.key.toString()] = elem.content;


                }
                console.log(result);
                return {content: result, rest: elements};

                break;
            case 0x100:
                var arr = binary.parse(res.elements)
                    .word32bu("elementCount")
                    .buffer("elements", data.length)
                    .vars;
                binrpc.debug("array.length "+arr.elementCount);

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
                binrpc.debug(result);
                return {content: result, rest: elements};
                break;
            case 0x04:
                var flt = binary.parse(res.elements)
                    .word32bs("mantissa")
                    .word32bs("exponent")
                    .buffer("rest", data.length)
                    .vars;
                flt.content = (((Math.pow(2, flt.exponent)) * (flt.mantissa / (1 << 30))).toFixed(6));
                binrpc.debug("float "+flt.content);
                return flt;
                break;
            case 0x03:
                var str = binary.parse(res.elements)
                    .word32bu("strLength")
                    .buffer("strContent", "strLength")
                    .buffer("rest", data.length)
                     .vars;
                str.content = str.strContent.toString();
                binrpc.debug("string "+str.content)
                return str;
                break;
            case 0x02:
                var int = binary.parse(res.elements)
                    .word8("value")
                    .buffer("rest", data.length)
                    .vars;
                int.content = (int.value == 1 ? true : false);
                binrpc.debug("bool " + int.content);
                return (int);
                break;

                break;
            case 0x01:
                var int = binary.parse(res.elements)
                    .word32bu("value")
                    .buffer("rest", data.length)
                    .vars;
                int.content = int.value;
                binrpc.debug("integer " + int.content);
                return (int);
                break;
            default:
                binrpc.debug("unknow data type " + res.dataType + " :(");
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
console.log("parseResponse data.length="+data.length+" msgSize="+vars.msgSize+ " body.length="+vars.body.length);
        if (vars.head.toString() !== "Bin") {
            console.log("malformed header :-(");
            return false;
        }

        vars.head = vars.head.toString();

        switch (vars.msgType) {
            case 0:
                console.log("BIN-RPC Request?!");
               // console.log(binrpc.parseData(vars.body));
                break;
            case 1:
                console.log("BIN-RPC Response");
                var res = binrpc.parseData(vars.body);
                //console.log(res.content);
                break;
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

        if (vars.head.toString() !== "Bin") {
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
                console.log("BIN-RPC Request");

                var res = binrpc.parseData(method.body);



                console.log(JSON.stringify({methodName:method.name.toString(),params:res.content}));
                break;

        }

        return vars;
    },
    sendRequest: function (buf, callback) {
        var response = new Buffer(0);
        var chunk = 0;
        var length;

        var client = net.createConnection(8701, '172.16.23.3',
            function() { //'connect' listener
                console.log('sending:');
                console.log(buf);
                client.write(buf.toString());
            });

        client.on('data', function(data) {
            console.log("receiving chunk "+chunk+" data.length="+data.length);

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

            console.log("response.length="+response.length);

            if (response.length >= (length + 8)) {
                client.end();
                var res = binrpc.parseResponse(response);
                if (callback) { callback(res); }
            }

            /*console.log("##############################\n\n\n");
            console.log("receiving: ");
            console.log(data.length);
            var res = binrpc.parseResponse(data);
            // console.log(res);
            client.end();
            if (callback) { callback(res); }*/

        });

        client.on('end', function() {

            console.log('disconnected');
        });
    }


};

//var buf = binrpc.buildRequest("getValue", ["CUX0100001:1", "TEMPERATURE"]);
//var buf = binrpc.buildRequest("getDeviceDescription", ["CUX0100002"]);
//var buf = binrpc.buildRequest("getParamset", ["CUX0100002:1", "MASTER"]);
//var buf = binrpc.buildRequest("system.listMethods");
//var buf = binrpc.buildRequest("listDevices");

var server = net.createServer(function(c) {
    console.log('Server connected');

    c.on('end', function() {
        console.log('Server disconnected');
    });

    c.on('data', function (data) {
        var res = binary.parse(data)
            .buffer("content", data.length)
            .vars;

        //console.log(res.content);

        binrpc.parseRequest(res.content);

        var buf = Put()
                .put(new Buffer('Bin', 'ascii'))
                .word8(1)
                .word32be(8) // Msg Size
                .word32be(3)
                .word32be(0)
                .buffer()
            ;
        console.log("responding: ");
        console.log("buf");
        c.write(buf);

    });

});

server.listen(8124, function() { //'listening' listener
    console.log('RPC Server listening on Port 8124');
});

// RPC Init abmelden bevor Prozess beendet wird
process.on('SIGINT', function () {
    binrpc.request("init", ["xmlrpc_bin://172.16.23.153:8124", ""])
    server.close();
});




binrpc.request("listDevices", [], function(res) {
    console.log("CALLBACK!");
    console.log(res);
});
/*
binrpc.request("system.listMethods", [], function(res) {
    console.log("CALLBACK!");
    console.log(res);
});
//binrpc.request("init", ["xmlrpc_bin://172.16.23.153:8124", "BinNode"]);
*/