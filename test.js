var o = {};

Object.observe(o, function(changes) {
    changes.forEach(function(change, i) {
        console.log(change.name, change.type, change.object[change.name]);
    });
});

// 3 changes, as a list of changes. Similar to how Mutation Observers work.
o.first = 'Eric';
o.last = 'Bidelman';
delete o.first;