

var homematic = require("./xmlrpc.js");

var hm = new homematic({ccuAddress:"172.16.23.3"});

/*hm.rfd("listDevices", [], function (data) {
    console.log(data);
});
*/

hm.startServer();
hm.subscribe(2000);
hm.subscribe(2001);

//process.stdin.resume();

process.on('SIGINT', function () {
    console.log('\nGot SIGINT');

    hm.unsubscribe(2000, function () {
        hm.unsubscribe(2001, function () {
            process.exit(1);
        });
    });
});




