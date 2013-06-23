/*!
 * CanJS - 1.1.6
 * http://canjs.us/
 * Copyright (c) 2013 Bitovi
 * Fri, 31 May 2013 14:40:35 GMT
 * Licensed MIT
 * Includes: can/construct/construct.js,can/observe/observe.js,can/observe/delegate/delegate.js,can/observe/setter/setter.js,can/observe/attributes/attributes.js,can/observe/validations/validations.js,can/util/string/string.js
 * Download from: http://bitbuilder.herokuapp.com/can.custom.js?configuration=jquery&plugins=can%2Fconstruct%2Fconstruct.js&plugins=can%2Fobserve%2Fobserve.js&plugins=can%2Fobserve%2Fdelegate%2Fdelegate.js&plugins=can%2Fobserve%2Fsetter%2Fsetter.js&plugins=can%2Fobserve%2Fattributes%2Fattributes.js&plugins=can%2Fobserve%2Fvalidations%2Fvalidations.js&plugins=can%2Futil%2Fstring%2Fstring.js
 */
(function(undefined) {

    // ## can/util/can.js
    var __m5 = (function() {
        var can = window.can || {};
        if (typeof GLOBALCAN === 'undefined' || GLOBALCAN !== false) {
            window.can = can;
        }

        can.isDeferred = function(obj) {
            var isFunction = this.isFunction;
            // Returns `true` if something looks like a deferred.
            return obj && isFunction(obj.then) && isFunction(obj.pipe);
        };

        var cid = 0;
        can.cid = function(object, name) {
            if (object._cid) {
                return object._cid
            } else {
                return object._cid = (name || "") + (++cid)
            }
        }
        can.VERSION = '@EDGE';
        return can;
    })();

    // ## can/util/array/each.js
    var __m6 = (function(can) {
        can.each = function(elements, callback, context) {
            var i = 0,
                key;
            if (elements) {
                if (typeof elements.length === 'number' && elements.pop) {
                    if (elements.attr) {
                        elements.attr('length');
                    }
                    for (key = elements.length; i < key; i++) {
                        if (callback.call(context || elements[i], elements[i], i, elements) === false) {
                            break;
                        }
                    }
                } else if (elements.hasOwnProperty) {
                    for (key in elements) {
                        if (elements.hasOwnProperty(key)) {
                            if (callback.call(context || elements[key], elements[key], key, elements) === false) {
                                break;
                            }
                        }
                    }
                }
            }
            return elements;
        };

        return can;
    })(__m5);

    // ## can/util/jquery/jquery.js
    var __m3 = (function($, can) {
        // _jQuery node list._
        $.extend(can, $, {
            trigger: function(obj, event, args) {
                if (obj.trigger) {
                    obj.trigger(event, args);
                } else {
                    $.event.trigger(event, args, obj, true);
                }
            },
            addEvent: function(ev, cb) {
                $([this]).bind(ev, cb);
                return this;
            },
            removeEvent: function(ev, cb) {
                $([this]).unbind(ev, cb);
                return this;
            },
            // jquery caches fragments, we always needs a new one
            buildFragment: function(elems, context) {
                var oldFragment = $.buildFragment,
                    ret;

                elems = [elems];
                // Set context per 1.8 logic
                context = context || document;
                context = !context.nodeType && context[0] || context;
                context = context.ownerDocument || context;

                ret = oldFragment.call(jQuery, elems, context);

                return ret.cacheable ? $.clone(ret.fragment) : ret.fragment || ret;
            },
            $: $,
            each: can.each
        });

        // Wrap binding functions.
        $.each(['bind', 'unbind', 'undelegate', 'delegate'], function(i, func) {
            can[func] = function() {
                var t = this[func] ? this : $([this]);
                t[func].apply(t, arguments);
                return this;
            };
        });

        // Wrap modifier functions.
        $.each(["append", "filter", "addClass", "remove", "data", "get"], function(i, name) {
            can[name] = function(wrapped) {
                return wrapped[name].apply(wrapped, can.makeArray(arguments).slice(1));
            };
        });

        // Memory safe destruction.
        var oldClean = $.cleanData;

        $.cleanData = function(elems) {
            $.each(elems, function(i, elem) {
                if (elem) {
                    can.trigger(elem, "destroyed", [], false);
                }
            });
            oldClean(elems);
        };

        return can;
    })(jQuery, __m5, __m6);

    // ## can/util/string/string.js
    var __m2 = (function(can) {
        // ##string.js
        // _Miscellaneous string utility functions._

        // Several of the methods in this plugin use code adapated from Prototype
        // Prototype JavaScript framework, version 1.6.0.1.
        // © 2005-2007 Sam Stephenson
        var strUndHash = /_|-/,
            strColons = /\=\=/,
            strWords = /([A-Z]+)([A-Z][a-z])/g,
            strLowUp = /([a-z\d])([A-Z])/g,
            strDash = /([a-z\d])([A-Z])/g,
            strReplacer = /\{([^\}]+)\}/g,
            strQuote = /"/g,
            strSingleQuote = /'/g,

        // Returns the `prop` property from `obj`.
        // If `add` is true and `prop` doesn't exist in `obj`, create it as an
        // empty object.
            getNext = function(obj, prop, add) {
                var result = obj[prop];

                if (result === undefined && add === true) {
                    result = obj[prop] = {}
                }
                return result
            },

        // Returns `true` if the object can have properties (no `null`s).
            isContainer = function(current) {
                return (/^f|^o/).test(typeof current);
            };

        can.extend(can, {
            // Escapes strings for HTML.

            esc: function(content) {
                // Convert bad values into empty strings
                var isInvalid = content === null || content === undefined || (isNaN(content) && ("" + content === 'NaN'));
                return ("" + (isInvalid ? '' : content))
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(strQuote, '&#34;')
                    .replace(strSingleQuote, "&#39;");
            },


            getObject: function(name, roots, add) {

                // The parts of the name we are looking up
                // `['App','Models','Recipe']`
                var parts = name ? name.split('.') : [],
                    length = parts.length,
                    current,
                    r = 0,
                    i, container, rootsLength;

                // Make sure roots is an `array`.
                roots = can.isArray(roots) ? roots : [roots || window];

                rootsLength = roots.length

                if (!length) {
                    return roots[0];
                }

                // For each root, mark it as current.
                for (r; r < rootsLength; r++) {
                    current = roots[r];
                    container = undefined;

                    // Walk current to the 2nd to last object or until there
                    // is not a container.
                    for (i = 0; i < length && isContainer(current); i++) {
                        container = current;
                        current = getNext(container, parts[i]);
                    }

                    // If we found property break cycle
                    if (container !== undefined && current !== undefined) {
                        break
                    }
                }

                // Remove property from found container
                if (add === false && current !== undefined) {
                    delete container[parts[i - 1]]
                }

                // When adding property add it to the first root
                if (add === true && current === undefined) {
                    current = roots[0]

                    for (i = 0; i < length && isContainer(current); i++) {
                        current = getNext(current, parts[i], true);
                    }
                }

                return current;
            },
            // Capitalizes a string.

            capitalize: function(s, cache) {
                // Used to make newId.
                return s.charAt(0).toUpperCase() + s.slice(1);
            },

            // Underscores a string.

            underscore: function(s) {
                return s
                    .replace(strColons, '/')
                    .replace(strWords, '$1_$2')
                    .replace(strLowUp, '$1_$2')
                    .replace(strDash, '_')
                    .toLowerCase();
            },
            // Micro-templating.

            sub: function(str, data, remove) {
                var obs = [];

                str = str || '';

                obs.push(str.replace(strReplacer, function(whole, inside) {

                    // Convert inside to type.
                    var ob = can.getObject(inside, data, remove === true ? false : undefined);

                    if (ob === undefined) {
                        obs = null;
                        return "";
                    }

                    // If a container, push into objs (which will return objects found).
                    if (isContainer(ob) && obs) {
                        obs.push(ob);
                        return "";
                    }

                    return "" + ob;
                }));

                return obs === null ? obs : (obs.length <= 1 ? obs[0] : obs);
            },

            // These regex's are used throughout the rest of can, so let's make
            // them available.
            replacer: strReplacer,
            undHash: strUndHash
        });
        return can;
    })(__m3);

    // ## can/construct/construct.js
    var __m1 = (function(can) {

        // ## construct.js
        // `can.Construct`
        // _This is a modified version of
        // [John Resig's class](http://ejohn.org/blog/simple-javascript-inheritance/).
        // It provides class level inheritance and callbacks._

        // A private flag used to initialize a new class instance without
        // initializing it's bindings.
        var initializing = 0;


        can.Construct = function() {
            if (arguments.length) {
                return can.Construct.extend.apply(can.Construct, arguments);
            }
        };


        can.extend(can.Construct, {

            newInstance: function() {
                // Get a raw instance object (`init` is not called).
                var inst = this.instance(),
                    arg = arguments,
                    args;

                // Call `setup` if there is a `setup`
                if (inst.setup) {
                    args = inst.setup.apply(inst, arguments);
                }

                // Call `init` if there is an `init`
                // If `setup` returned `args`, use those as the arguments
                if (inst.init) {
                    inst.init.apply(inst, args || arguments);
                }

                return inst;
            },
            // Overwrites an object with methods. Used in the `super` plugin.
            // `newProps` - New properties to add.
            // `oldProps` - Where the old properties might be (used with `super`).
            // `addTo` - What we are adding to.
            _inherit: function(newProps, oldProps, addTo) {
                can.extend(addTo || newProps, newProps || {})
            },
            // used for overwriting a single property.
            // this should be used for patching other objects
            // the super plugin overwrites this
            _overwrite: function(what, oldProps, propName, val) {
                what[propName] = val;
            },
            // Set `defaults` as the merger of the parent `defaults` and this
            // object's `defaults`. If you overwrite this method, make sure to
            // include option merging logic.

            setup: function(base, fullName) {
                this.defaults = can.extend(true, {}, base.defaults, this.defaults);
            },
            // Create's a new `class` instance without initializing by setting the
            // `initializing` flag.
            instance: function() {

                // Prevents running `init`.
                initializing = 1;

                var inst = new this();

                // Allow running `init`.
                initializing = 0;

                return inst;
            },
            // Extends classes.

            extend: function(fullName, klass, proto) {
                // Figure out what was passed and normalize it.
                if (typeof fullName != 'string') {
                    proto = klass;
                    klass = fullName;
                    fullName = null;
                }

                if (!proto) {
                    proto = klass;
                    klass = null;
                }
                proto = proto || {};

                var _super_class = this,
                    _super = this.prototype,
                    name, shortName, namespace, prototype;

                // Instantiate a base class (but only create the instance,
                // don't run the init constructor).
                prototype = this.instance();

                // Copy the properties over onto the new prototype.
                can.Construct._inherit(proto, _super, prototype);

                // The dummy class constructor.

                function Constructor() {
                    // All construction is actually done in the init method.
                    if (!initializing) {
                        return this.constructor !== Constructor && arguments.length ?
                            // We are being called without `new` or we are extending.
                            arguments.callee.extend.apply(arguments.callee, arguments) :
                            // We are being called with `new`.
                            this.constructor.newInstance.apply(this.constructor, arguments);
                    }
                }

                // Copy old stuff onto class (can probably be merged w/ inherit)
                for (name in _super_class) {
                    if (_super_class.hasOwnProperty(name)) {
                        Constructor[name] = _super_class[name];
                    }
                }

                // Copy new static properties on class.
                can.Construct._inherit(klass, _super_class, Constructor);

                // Setup namespaces.
                if (fullName) {

                    var parts = fullName.split('.'),
                        shortName = parts.pop(),
                        current = can.getObject(parts.join('.'), window, true),
                        namespace = current,
                        _fullName = can.underscore(fullName.replace(/\./g, "_")),
                        _shortName = can.underscore(shortName);



                    current[shortName] = Constructor;
                }

                // Set things that shouldn't be overwritten.
                can.extend(Constructor, {
                    constructor: Constructor,
                    prototype: prototype,

                    namespace: namespace,

                    _shortName: _shortName,

                    fullName: fullName,
                    _fullName: _fullName
                });

                // Dojo and YUI extend undefined
                if (shortName !== undefined) {
                    Constructor.shortName = shortName;
                }

                // Make sure our prototype looks nice.
                Constructor.prototype.constructor = Constructor;


                // Call the class `setup` and `init`
                var t = [_super_class].concat(can.makeArray(arguments)),
                    args = Constructor.setup.apply(Constructor, t);

                if (Constructor.init) {
                    Constructor.init.apply(Constructor, args || t);
                }


                return Constructor;

            }

        });
        return can.Construct;
    })(__m2);

    // ## can/util/bind/bind.js
    var __m8 = (function(can) {


        // ## Bind helpers
        can.bindAndSetup = function() {
            // Add the event to this object
            can.addEvent.apply(this, arguments);
            // If not initializing, and the first binding
            // call bindsetup if the function exists.
            if (!this._init) {
                if (!this._bindings) {
                    this._bindings = 1;
                    // setup live-binding
                    this._bindsetup && this._bindsetup();

                } else {
                    this._bindings++;
                }

            }

            return this;
        };

        can.unbindAndTeardown = function(ev, handler) {
            // Remove the event handler
            can.removeEvent.apply(this, arguments);

            this._bindings--;
            // If there are no longer any bindings and
            // there is a bindteardown method, call it.
            if (!this._bindings) {
                this._bindteardown && this._bindteardown();
            }
            return this;
        }

        return can;

    })(__m3);

    // ## can/observe/observe.js
    var __m7 = (function(can, bind) {
        // ## observe.js
        // `can.Observe`
        // _Provides the observable pattern for JavaScript Objects._
        // Returns `true` if something is an object with properties of its own.
        var canMakeObserve = function(obj) {
                return obj && !can.isDeferred(obj) && (can.isArray(obj) || can.isPlainObject(obj) || (obj instanceof can.Observe));
            },

        // Removes all listeners.
            unhookup = function(items, namespace) {
                return can.each(items, function(item) {
                    if (item && item.unbind) {
                        item.unbind("change" + namespace);
                    }
                });
            },
        // Listens to changes on `child` and "bubbles" the event up.
        // `child` - The object to listen for changes on.
        // `prop` - The property name is at on.
        // `parent` - The parent object of prop.
        // `ob` - (optional) The Observe object constructor
        // `list` - (optional) The observable list constructor
            hookupBubble = function(child, prop, parent, Ob, List) {
                Ob = Ob || Observe;
                List = List || Observe.List;

                // If it's an `array` make a list, otherwise a child.
                if (child instanceof Observe) {
                    // We have an `observe` already...
                    // Make sure it is not listening to this already
                    // It's only listening if it has bindings already.
                    parent._bindings && unhookup([child], parent._cid);
                } else if (can.isArray(child)) {
                    child = new List(child);
                } else {
                    child = new Ob(child);
                }
                // only listen if something is listening to you
                if (parent._bindings) {
                    // Listen to all changes and `batchTrigger` upwards.
                    bindToChildAndBubbleToParent(child, prop, parent)
                }


                return child;
            },
            bindToChildAndBubbleToParent = function(child, prop, parent) {
                child.bind("change" + parent._cid, function() {
                    // `batchTrigger` the type on this...
                    var args = can.makeArray(arguments),
                        ev = args.shift();
                    args[0] = (prop === "*" ? [parent.indexOf(child), args[0]] : [prop, args[0]]).join(".");

                    // track objects dispatched on this observe
                    ev.triggeredNS = ev.triggeredNS || {};

                    // if it has already been dispatched exit
                    if (ev.triggeredNS[parent._cid]) {
                        return;
                    }

                    ev.triggeredNS[parent._cid] = true;
                    // send change event with modified attr to parent
                    can.trigger(parent, ev, args);
                    // send modified attr event to parent
                    //can.trigger(parent, args[0], args);
                });
            }
        // An `id` to track events for a given observe.
        observeId = 0,
            // A helper used to serialize an `Observe` or `Observe.List`.
            // `observe` - The observable.
            // `how` - To serialize with `attr` or `serialize`.
            // `where` - To put properties, in an `{}` or `[]`.
            serialize = function(observe, how, where) {
                // Go through each property.
                observe.each(function(val, name) {
                    // If the value is an `object`, and has an `attrs` or `serialize` function.
                    where[name] = canMakeObserve(val) && can.isFunction(val[how]) ?
                        // Call `attrs` or `serialize` to get the original data back.
                        val[how]() :
                        // Otherwise return the value.
                        val;
                });
                return where;
            },
            attrParts = function(attr, keepKey) {
                if (keepKey) {
                    return [attr];
                }
                return can.isArray(attr) ? attr : ("" + attr).split(".");
            },
            // Which batch of events this is for -- might not want to send multiple
            // messages on the same batch.  This is mostly for event delegation.
            batchNum = 1,
            // how many times has start been called without a stop
            transactions = 0,
            // an array of events within a transaction
            batchEvents = [],
            stopCallbacks = [],
            makeBindSetup = function(wildcard) {
                return function() {
                    var parent = this;
                    this._each(function(child, prop) {
                        if (child && child.bind) {
                            bindToChildAndBubbleToParent(child, wildcard || prop, parent)
                        }
                    })
                };
            };


        var Observe = can.Map = can.Observe = can.Construct({

                // keep so it can be overwritten
                bind: can.bindAndSetup,
                unbind: can.unbindAndTeardown,
                id: "id",
                canMakeObserve: canMakeObserve,
                // starts collecting events
                // takes a callback for after they are updated
                // how could you hook into after ejs

                startBatch: function(batchStopHandler) {
                    transactions++;
                    batchStopHandler && stopCallbacks.push(batchStopHandler);
                },

                stopBatch: function(force, callStart) {
                    if (force) {
                        transactions = 0;
                    } else {
                        transactions--;
                    }

                    if (transactions == 0) {
                        var items = batchEvents.slice(0),
                            callbacks = stopCallbacks.slice(0);
                        batchEvents = [];
                        stopCallbacks = [];
                        batchNum++;
                        callStart && this.startBatch();
                        can.each(items, function(args) {
                            can.trigger.apply(can, args);
                        });
                        can.each(callbacks, function(cb) {
                            cb();
                        });
                    }
                },

                triggerBatch: function(item, event, args) {
                    // Don't send events if initalizing.
                    if (!item._init) {
                        if (transactions == 0) {
                            return can.trigger(item, event, args);
                        } else {
                            event = typeof event === "string" ? {
                                type: event
                            } :
                                event;
                            event.batchNum = batchNum;
                            batchEvents.push([
                                item,
                                event,
                                args
                            ]);
                        }
                    }
                },

                keys: function(observe) {
                    var keys = [];
                    Observe.__reading && Observe.__reading(observe, '__keys');
                    for (var keyName in observe._data) {
                        keys.push(keyName);
                    }
                    return keys;
                }
            },

            {
                setup: function(obj) {
                    // `_data` is where we keep the properties.
                    this._data = {};

                    // The namespace this `object` uses to listen to events.
                    can.cid(this, ".observe");
                    // Sets all `attrs`.
                    this._init = 1;
                    this.attr(obj);
                    this.bind('change' + this._cid, can.proxy(this._changes, this));
                    delete this._init;
                },
                _bindsetup: makeBindSetup(),
                _bindteardown: function() {
                    var cid = this._cid;
                    this._each(function(child) {
                        unhookup([child], cid)
                    })
                },
                _changes: function(ev, attr, how, newVal, oldVal) {
                    Observe.triggerBatch(this, {
                        type: attr,
                        batchNum: ev.batchNum
                    }, [newVal, oldVal]);
                },
                _triggerChange: function(attr, how, newVal, oldVal) {
                    Observe.triggerBatch(this, "change", can.makeArray(arguments))
                },
                // no live binding iterator
                _each: function(callback) {
                    var data = this.__get();
                    for (var prop in data) {
                        if (data.hasOwnProperty(prop)) {
                            callback(data[prop], prop)
                        }
                    }
                },

                attr: function(attr, val) {
                    // This is super obfuscated for space -- basically, we're checking
                    // if the type of the attribute is not a `number` or a `string`.
                    var type = typeof attr;
                    if (type !== "string" && type !== "number") {
                        return this._attrs(attr, val)
                    } else if (val === undefined) { // If we are getting a value.
                        // Let people know we are reading.
                        Observe.__reading && Observe.__reading(this, attr)
                        return this._get(attr)
                    } else {
                        // Otherwise we are setting.
                        this._set(attr, val);
                        return this;
                    }
                },

                each: function() {
                    Observe.__reading && Observe.__reading(this, '__keys');
                    return can.each.apply(undefined, [this.__get()].concat(can.makeArray(arguments)))
                },

                removeAttr: function(attr) {
                    // Info if this is List or not
                    var isList = this instanceof can.Observe.List,
                    // Convert the `attr` into parts (if nested).
                        parts = attrParts(attr),
                    // The actual property to remove.
                        prop = parts.shift(),
                    // The current value.
                        current = isList ? this[prop] : this._data[prop];

                    // If we have more parts, call `removeAttr` on that part.
                    if (parts.length) {
                        return current.removeAttr(parts)
                    } else {
                        if (isList) {
                            this.splice(prop, 1)
                        } else if (prop in this._data) {
                            // Otherwise, `delete`.
                            delete this._data[prop];
                            // Create the event.
                            if (!(prop in this.constructor.prototype)) {
                                delete this[prop]
                            }
                            // Let others know the number of keys have changed
                            Observe.triggerBatch(this, "__keys");
                            this._triggerChange(prop, "remove", undefined, current);

                        }
                        return current;
                    }
                },
                // Reads a property from the `object`.
                _get: function(attr) {
                    var value = typeof attr === 'string' && !! ~attr.indexOf('.') && this.__get(attr);
                    if (value) {
                        return value;
                    }

                    // break up the attr (`"foo.bar"`) into `["foo","bar"]`
                    var parts = attrParts(attr),
                    // get the value of the first attr name (`"foo"`)
                        current = this.__get(parts.shift());
                    // if there are other attributes to read
                    return parts.length ?
                        // and current has a value
                        current ?
                            // lookup the remaining attrs on current
                            current._get(parts) :
                            // or if there's no current, return undefined
                            undefined :
                        // if there are no more parts, return current
                        current;
                },
                // Reads a property directly if an `attr` is provided, otherwise
                // returns the "real" data object itself.
                __get: function(attr) {
                    return attr ? this._data[attr] : this._data;
                },
                // Sets `attr` prop as value on this object where.
                // `attr` - Is a string of properties or an array  of property values.
                // `value` - The raw value to set.
                _set: function(attr, value, keepKey) {
                    // Convert `attr` to attr parts (if it isn't already).
                    var parts = attrParts(attr, keepKey),
                    // The immediate prop we are setting.
                        prop = parts.shift(),
                    // The current value.
                        current = this.__get(prop);

                    // If we have an `object` and remaining parts.
                    if (canMakeObserve(current) && parts.length) {
                        // That `object` should set it (this might need to call attr).
                        current._set(parts, value)
                    } else if (!parts.length) {
                        // We're in "real" set territory.
                        if (this.__convert) {
                            value = this.__convert(prop, value)
                        }
                        this.__set(prop, value, current)
                    } else {
                        throw "can.Observe: Object does not exist"
                    }
                },
                __set: function(prop, value, current) {

                    // Otherwise, we are setting it on this `object`.
                    // TODO: Check if value is object and transform
                    // are we changing the value.
                    if (value !== current) {
                        // Check if we are adding this for the first time --
                        // if we are, we need to create an `add` event.
                        var changeType = this.__get().hasOwnProperty(prop) ? "set" : "add";

                        // Set the value on data.
                        this.___set(prop,

                            // If we are getting an object.
                            canMakeObserve(value) ?

                                // Hook it up to send event.
                                hookupBubble(value, prop, this) :
                                // Value is normal.
                                value);

                        if (changeType == "add") {
                            // If there is no current value, let others know that
                            // the the number of keys have changed

                            Observe.triggerBatch(this, "__keys", undefined);

                        }
                        // `batchTrigger` the change event.
                        this._triggerChange(prop, changeType, value, current);

                        //Observe.triggerBatch(this, prop, [value, current]);
                        // If we can stop listening to our old value, do it.
                        current && unhookup([current], this._cid);
                    }

                },
                // Directly sets a property on this `object`.
                ___set: function(prop, val) {
                    this._data[prop] = val;
                    // Add property directly for easy writing.
                    // Check if its on the `prototype` so we don't overwrite methods like `attrs`.
                    if (!(prop in this.constructor.prototype)) {
                        this[prop] = val
                    }
                },


                bind: can.bindAndSetup,

                unbind: can.unbindAndTeardown,

                serialize: function() {
                    return serialize(this, 'serialize', {});
                },

                _attrs: function(props, remove) {

                    if (props === undefined) {
                        return serialize(this, 'attr', {})
                    }

                    props = can.extend({}, props);
                    var prop,
                        self = this,
                        newVal;
                    Observe.startBatch();
                    this.each(function(curVal, prop) {
                        newVal = props[prop];

                        // If we are merging...
                        if (newVal === undefined) {
                            remove && self.removeAttr(prop);
                            return;
                        }

                        if (self.__convert) {
                            newVal = self.__convert(prop, newVal)
                        }

                        // if we're dealing with models, want to call _set to let converter run
                        if (newVal instanceof can.Observe) {
                            self.__set(prop, newVal, curVal)
                            // if its an object, let attr merge
                        } else if (canMakeObserve(curVal) && canMakeObserve(newVal) && curVal.attr) {
                            curVal.attr(newVal, remove)
                            // otherwise just set
                        } else if (curVal != newVal) {
                            self.__set(prop, newVal, curVal)
                        }

                        delete props[prop];
                    })
                    // Add remaining props.
                    for (var prop in props) {
                        newVal = props[prop];
                        this._set(prop, newVal, true)
                    }
                    Observe.stopBatch()
                    return this;
                },


                compute: function(prop) {
                    return can.compute(this, prop);
                }
            });
        // Helpers for `observable` lists.
        var splice = [].splice,

            list = Observe(

                {
                    setup: function(instances, options) {
                        this.length = 0;
                        can.cid(this, ".observe")
                        this._init = 1;
                        if (can.isDeferred(instances)) {
                            this.replace(instances)
                        } else {
                            this.push.apply(this, can.makeArray(instances || []));
                        }
                        // this change needs to be ignored
                        this.bind('change' + this._cid, can.proxy(this._changes, this));
                        can.extend(this, options);
                        delete this._init;
                    },
                    _triggerChange: function(attr, how, newVal, oldVal) {

                        Observe.prototype._triggerChange.apply(this, arguments)
                        // `batchTrigger` direct add and remove events...
                        if (!~attr.indexOf('.')) {

                            if (how === 'add') {
                                Observe.triggerBatch(this, how, [newVal, +attr]);
                                Observe.triggerBatch(this, 'length', [this.length]);
                            } else if (how === 'remove') {
                                Observe.triggerBatch(this, how, [oldVal, +attr]);
                                Observe.triggerBatch(this, 'length', [this.length]);
                            } else {
                                Observe.triggerBatch(this, how, [newVal, +attr])
                            }

                        }

                    },
                    __get: function(attr) {
                        return attr ? this[attr] : this;
                    },
                    ___set: function(attr, val) {
                        this[attr] = val;
                        if (+attr >= this.length) {
                            this.length = (+attr + 1)
                        }
                    },
                    _each: function(callback) {
                        var data = this.__get();
                        for (var i = 0; i < data.length; i++) {
                            callback(data[i], i)
                        }
                    },
                    _bindsetup: makeBindSetup("*"),
                    // Returns the serialized form of this list.

                    serialize: function() {
                        return serialize(this, 'serialize', []);
                    },

                    splice: function(index, howMany) {
                        var args = can.makeArray(arguments),
                            i;

                        for (i = 2; i < args.length; i++) {
                            var val = args[i];
                            if (canMakeObserve(val)) {
                                args[i] = hookupBubble(val, "*", this, this.constructor.Observe, this.constructor)
                            }
                        }
                        if (howMany === undefined) {
                            howMany = args[1] = this.length - index;
                        }
                        var removed = splice.apply(this, args);
                        can.Observe.startBatch();
                        if (howMany > 0) {
                            this._triggerChange("" + index, "remove", undefined, removed);
                            unhookup(removed, this._cid);
                        }
                        if (args.length > 2) {
                            this._triggerChange("" + index, "add", args.slice(2), removed);
                        }
                        can.Observe.stopBatch();
                        return removed;
                    },

                    _attrs: function(items, remove) {
                        if (items === undefined) {
                            return serialize(this, 'attr', []);
                        }

                        // Create a copy.
                        items = can.makeArray(items);

                        Observe.startBatch();
                        this._updateAttrs(items, remove);
                        Observe.stopBatch()
                    },

                    _updateAttrs: function(items, remove) {
                        var len = Math.min(items.length, this.length);

                        for (var prop = 0; prop < len; prop++) {
                            var curVal = this[prop],
                                newVal = items[prop];

                            if (canMakeObserve(curVal) && canMakeObserve(newVal)) {
                                curVal.attr(newVal, remove)
                            } else if (curVal != newVal) {
                                this._set(prop, newVal)
                            } else {

                            }
                        }
                        if (items.length > this.length) {
                            // Add in the remaining props.
                            this.push.apply(this, items.slice(this.length));
                        } else if (items.length < this.length && remove) {
                            this.splice(items.length)
                        }
                    }
                }),

        // Converts to an `array` of arguments.
            getArgs = function(args) {
                return args[0] && can.isArray(args[0]) ?
                    args[0] :
                    can.makeArray(args);
            };
        // Create `push`, `pop`, `shift`, and `unshift`
        can.each({

                push: "length",

                unshift: 0
            },
            // Adds a method
            // `name` - The method name.
            // `where` - Where items in the `array` should be added.

            function(where, name) {
                var orig = [][name]
                list.prototype[name] = function() {
                    // Get the items being added.
                    var args = [],
                    // Where we are going to add items.
                        len = where ? this.length : 0,
                        i = arguments.length,
                        res,
                        val,
                        constructor = this.constructor;

                    // Go through and convert anything to an `observe` that needs to be converted.
                    while (i--) {
                        val = arguments[i];
                        args[i] = canMakeObserve(val) ?
                            hookupBubble(val, "*", this, this.constructor.Observe, this.constructor) :
                            val;
                    }

                    // Call the original method.
                    res = orig.apply(this, args);

                    if (!this.comparator || args.length) {

                        this._triggerChange("" + len, "add", args, undefined);
                    }

                    return res;
                }
            });

        can.each({

                pop: "length",

                shift: 0
            },
            // Creates a `remove` type method

            function(where, name) {
                list.prototype[name] = function() {

                    var args = getArgs(arguments),
                        len = where && this.length ? this.length - 1 : 0;

                    var res = [][name].apply(this, args)

                    // Create a change where the args are
                    // `len` - Where these items were removed.
                    // `remove` - Items removed.
                    // `undefined` - The new values (there are none).
                    // `res` - The old, removed values (should these be unbound).
                    this._triggerChange("" + len, "remove", undefined, [res])

                    if (res && res.unbind) {
                        res.unbind("change" + this._cid)
                    }
                    return res;
                }
            });

        can.extend(list.prototype, {

            indexOf: function(item) {
                this.attr('length')
                return can.inArray(item, this)
            },


            join: [].join,


            reverse: [].reverse,


            slice: function() {
                var temp = Array.prototype.slice.apply(this, arguments);
                return new this.constructor(temp);
            },


            concat: function() {
                var args = [];
                can.each(can.makeArray(arguments), function(arg, i) {
                    args[i] = arg instanceof can.Observe.List ? arg.serialize() : arg;
                });
                return new this.constructor(Array.prototype.concat.apply(this.serialize(), args));
            },


            forEach: function(cb, thisarg) {
                can.each(this, cb, thisarg || this);
            },


            replace: function(newList) {
                if (can.isDeferred(newList)) {
                    newList.then(can.proxy(this.replace, this));
                } else {
                    this.splice.apply(this, [0, this.length].concat(can.makeArray(newList || [])));
                }

                return this;
            }
        });

        can.List = Observe.List = list;
        Observe.setup = function() {
            can.Construct.setup.apply(this, arguments);
            // I would prefer not to do it this way. It should
            // be using the attributes plugin to do this type of conversion.
            this.List = Observe.List({
                Observe: this
            }, {});
        }
        return Observe;
    })(__m3, __m8, __m1);

    // ## can/observe/delegate/delegate.js
    var __m9 = (function(can) {



        // ** - 'this' will be the deepest item changed
        // * - 'this' will be any changes within *, but * will be the
        //     this returned

        // tells if the parts part of a delegate matches the broken up props of the event
        // gives the prop to use as 'this'
        // - parts - the attribute name of the delegate split in parts ['foo','*']
        // - props - the split props of the event that happened ['foo','bar','0']
        // - returns - the attribute to delegate too ('foo.bar'), or null if not a match
        var delegateMatches = function(parts, props) {
                //check props parts are the same or
                var len = parts.length,
                    i = 0,
                // keeps the matched props we will use
                    matchedProps = [],
                    prop;

                // if the event matches
                for (i; i < len; i++) {
                    prop = props[i]
                    // if no more props (but we should be matching them)
                    // return null
                    if (typeof prop !== 'string') {
                        return null;
                    } else
                    // if we have a "**", match everything
                    if (parts[i] == "**") {
                        return props.join(".");
                    } else
                    // a match, but we want to delegate to "*"
                    if (parts[i] == "*") {
                        // only do this if there is nothing after ...
                        matchedProps.push(prop);
                    } else if (prop === parts[i]) {
                        matchedProps.push(prop);
                    } else {
                        return null;
                    }
                }
                return matchedProps.join(".");
            },
        // gets a change event and tries to figure out which
        // delegates to call
            delegateHandler = function(event, prop, how, newVal, oldVal) {
                // pre-split properties to save some regexp time
                var props = prop.split("."),
                    delegates = (this._observe_delegates || []).slice(0),
                    delegate,
                    attr,
                    matchedAttr,
                    hasMatch,
                    valuesEqual;
                event.attr = prop;
                event.lastAttr = props[props.length - 1];

                // for each delegate
                for (var i = 0; delegate = delegates[i++];) {

                    // if there is a batchNum, this means that this
                    // event is part of a series of events caused by a single
                    // attrs call.  We don't want to issue the same event
                    // multiple times
                    // setting the batchNum happens later
                    if ((event.batchNum && delegate.batchNum === event.batchNum) || delegate.undelegated) {
                        continue;
                    }

                    // reset match and values tests
                    hasMatch = undefined;
                    valuesEqual = true;

                    // yeah, all this under here has to be redone v

                    // for each attr in a delegate
                    for (var a = 0; a < delegate.attrs.length; a++) {

                        attr = delegate.attrs[a];

                        // check if it is a match
                        if (matchedAttr = delegateMatches(attr.parts, props)) {
                            hasMatch = matchedAttr;
                        }
                        // if it has a value, make sure it's the right value
                        // if it's set, we should probably check that it has a
                        // value no matter what
                        if (attr.value && valuesEqual) {
                            valuesEqual = attr.value === "" + this.attr(attr.attr)
                        } else if (valuesEqual && delegate.attrs.length > 1) {
                            // if there are multiple attributes, each has to at
                            // least have some value
                            valuesEqual = this.attr(attr.attr) !== undefined
                        }
                    }


                    // if there is a match and valuesEqual ... call back
                    if (hasMatch && valuesEqual) {
                        // how to get to the changed property from the delegate
                        var from = prop.replace(hasMatch + ".", "");

                        // if this event is part of a batch, set it on the delegate
                        // to only send one event
                        if (event.batchNum) {
                            delegate.batchNum = event.batchNum
                        }

                        // if we listen to change, fire those with the same attrs
                        // TODO: the attrs should probably be using from
                        if (delegate.event === 'change') {
                            arguments[1] = from;
                            event.curAttr = hasMatch;
                            delegate.callback.apply(this.attr(hasMatch), can.makeArray(arguments));
                        } else if (delegate.event === how) {

                            // if it's a match, callback with the location of the match
                            delegate.callback.apply(this.attr(hasMatch), [event, newVal, oldVal, from]);
                        } else if (delegate.event === 'set' &&
                            how == 'add') {
                            // if we are listening to set, we should also listen to add
                            delegate.callback.apply(this.attr(hasMatch), [event, newVal, oldVal, from]);
                        }
                    }

                }
            };

        can.extend(can.Observe.prototype, {

            delegate: function(selector, event, handler) {
                selector = can.trim(selector);
                var delegates = this._observe_delegates || (this._observe_delegates = []),
                    attrs = [],
                    selectorRegex = /([^\s=,]+)(?:=("[^",]*"|'[^',]*'|[^\s"',]*))?(,?)\s*/g,
                    matches;

                // parse each property in the selector
                while (matches = selectorRegex.exec(selector)) {
                    // we need to do a little doctoring to make up for the quotes.
                    if (matches[2] && can.inArray(matches[2].substr(0, 1), ['"', "'"]) >= 0) {
                        matches[2] = matches[2].substr(1, -1);
                    }

                    attrs.push({
                        // the attribute name
                        attr: matches[1],
                        // the attribute name, pre-split for speed
                        parts: matches[1].split('.'),
                        // the value associated with this property (if there was one given)
                        value: matches[2],
                        // whether this selector combines with the one after it with AND or OR
                        or: matches[3] === ','
                    });
                }

                // delegates has pre-processed info about the event
                delegates.push({
                    // the attrs name for unbinding
                    selector: selector,
                    // an object of attribute names and values {type: 'recipe',id: undefined}
                    // undefined means a value was not defined
                    attrs: attrs,
                    callback: handler,
                    event: event
                });
                if (delegates.length === 1) {
                    this.bind("change", delegateHandler)
                }
                return this;
            },

            undelegate: function(selector, event, handler) {
                selector = selector && can.trim(selector);

                var i = 0,
                    delegates = this._observe_delegates || [],
                    delegateOb;
                if (selector) {
                    while (i < delegates.length) {
                        delegateOb = delegates[i];
                        if (delegateOb.callback === handler ||
                            (!handler && delegateOb.selector === selector)) {
                            delegateOb.undelegated = true;
                            delegates.splice(i, 1)
                        } else {
                            i++;
                        }
                    }
                } else {
                    // remove all delegates
                    delegates = [];
                }
                if (!delegates.length) {
                    //can.removeData(this, "_observe_delegates");
                    this.unbind("change", delegateHandler)
                }
                return this;
            }
        });
        // add helpers for testing ..
        can.Observe.prototype.delegate.matches = delegateMatches;
        return can.Observe;
    })(__m3, __m7);

    // ## can/observe/attributes/attributes.js
    var __m11 = (function(can, Observe) {

        can.each([can.Observe, can.Model], function(clss) {
            // in some cases model might not be defined quite yet.
            if (clss === undefined) {
                return;
            }
            var isObject = function(obj) {
                return typeof obj === 'object' && obj !== null && obj;
            };

            can.extend(clss, {

                attributes: {},


                convert: {
                    "date": function(str) {
                        var type = typeof str;
                        if (type === "string") {
                            return isNaN(Date.parse(str)) ? null : Date.parse(str)
                        } else if (type === 'number') {
                            return new Date(str)
                        } else {
                            return str
                        }
                    },
                    "number": function(val) {
                        return parseFloat(val);
                    },
                    "boolean": function(val) {
                        if (val === 'false' || val === '0' || !val) {
                            return false;
                        }
                        return true;
                    },
                    "default": function(val, oldVal, error, type) {
                        var construct = can.getObject(type),
                            context = window,
                            realType;
                        // if type has a . we need to look it up
                        if (type.indexOf(".") >= 0) {
                            // get everything before the last .
                            realType = type.substring(0, type.lastIndexOf("."));
                            // get the object before the last .
                            context = can.getObject(realType);
                        }
                        return typeof construct == "function" ? construct.call(context, val, oldVal) : val;
                    }
                },

                serialize: {
                    "default": function(val, type) {
                        return isObject(val) && val.serialize ? val.serialize() : val;
                    },
                    "date": function(val) {
                        return val && val.getTime()
                    }
                }
            });

            // overwrite setup to do this stuff
            var oldSetup = clss.setup;


            clss.setup = function(superClass, stat, proto) {
                var self = this;
                oldSetup.call(self, superClass, stat, proto);

                can.each(["attributes"], function(name) {
                    if (!self[name] || superClass[name] === self[name]) {
                        self[name] = {};
                    }
                });

                can.each(["convert", "serialize"], function(name) {
                    if (superClass[name] != self[name]) {
                        self[name] = can.extend({}, superClass[name], self[name]);
                    }
                });
            };
        });

        var oldSetup = can.Observe.prototype.setup;

        can.Observe.prototype.setup = function(obj) {

            var diff = {};

            oldSetup.call(this, obj);

            can.each(this.constructor.defaults, function(value, key) {
                if (!this.hasOwnProperty(key)) {
                    diff[key] = value;
                }
            }, this);

            this._init = 1;
            this.attr(diff);
            delete this._init;
        };

        can.Observe.prototype.__convert = function(prop, value) {
            // check if there is a

            var Class = this.constructor,
                oldVal = this.attr(prop),
                type, converter;

            if (Class.attributes) {
                // the type of the attribute
                type = Class.attributes[prop];
                converter = Class.convert[type] || Class.convert['default'];
            }

            return value === null || !type ?
                // just use the value
                value :
                // otherwise, pass to the converter
                converter.call(Class, value, oldVal, function() {}, type);
        };

        can.Observe.prototype.serialize = function(attrName, stack) {
            var where = {},
                Class = this.constructor,
                attrs = {};

            stack = can.isArray(stack) ? stack : [];
            stack.push(this._cid);

            if (attrName !== undefined) {
                attrs[attrName] = this[attrName];
            } else {
                attrs = this.__get();
            }

            can.each(attrs, function(val, name) {
                var type, converter;

                // If this is an observe, check that it wasn't serialized earlier in the stack.
                if (val instanceof can.Observe && can.inArray(val._cid, stack) > -1) {
                    // Since this object has already been serialized once,
                    // just reference the id (or undefined if it doesn't exist).
                    where[name] = val.attr('id');
                } else {
                    type = Class.attributes ? Class.attributes[name] : 0;
                    converter = Class.serialize ? Class.serialize[type] : 0;

                    // if the value is an object, and has a attrs or serialize function
                    where[name] = val && typeof val.serialize == 'function' ?
                        // call attrs or serialize to get the original data back
                        val.serialize(undefined, stack) :
                        // otherwise if we have  a converter
                        converter ?
                            // use the converter
                            converter(val, type) :
                            // or return the val
                            val;
                }
            });

            return attrName != undefined ? where[attrName] : where;
        };
        return can.Observe;
    })(__m3, __m7);

    // ## can/observe/setter/setter.js
    var __m10 = (function(can) {

        can.classize = function(s, join) {
            // this can be moved out ..
            // used for getter setter
            var parts = s.split(can.undHash),
                i = 0;
            for (; i < parts.length; i++) {
                parts[i] = can.capitalize(parts[i]);
            }

            return parts.join(join || '');
        }

        var classize = can.classize,
            proto = can.Observe.prototype,
            old = proto.__set;

        proto.__set = function(prop, value, current, success, error) {
            // check if there's a setter
            var cap = classize(prop),
                setName = "set" + cap,
                errorCallback = function(errors) {
                    var stub = error && error.call(self, errors);

                    // if 'setter' is on the page it will trigger
                    // the error itself and we dont want to trigger
                    // the event twice. :)
                    if (stub !== false) {
                        can.trigger(self, "error", [prop, errors], true);
                    }

                    return false;
                },
                self = this;

            // if we have a setter
            if (this[setName] &&
                // call the setter, if returned value is undefined,
                // this means the setter is async so we
                // do not call update property and return right away
                (value = this[setName](value, function(value) {
                        old.call(self, prop, value, current, success, errorCallback)
                    },
                    errorCallback)) === undefined) {
                return;
            }

            old.call(self, prop, value, current, success, errorCallback);

            return this;
        };
        return can.Observe;
    })(__m3, __m11);

    // ## can/observe/validations/validations.js
    var __m12 = (function(can) {
        //validations object is by property.  You can have validations that
        //span properties, but this way we know which ones to run.
        //  proc should return true if there's an error or the error message
        var validate = function(attrNames, options, proc) {
            // normalize argumetns
            if (!proc) {
                proc = options;
                options = {};
            }

            options = options || {};
            attrNames = typeof attrNames == 'string' ? [attrNames] : can.makeArray(attrNames);

            // run testIf if it exists
            if (options.testIf && !options.testIf.call(this)) {
                return;
            }

            var self = this;
            can.each(attrNames, function(attrName) {
                // Add a test function for each attribute
                if (!self.validations[attrName]) {
                    self.validations[attrName] = [];
                }

                self.validations[attrName].push(function(newVal) {
                    // if options has a message return that, otherwise, return the error
                    var res = proc.call(this, newVal, attrName);
                    return res === undefined ? undefined : (options.message || res);
                })
            });
        };

        var old = can.Observe.prototype.__set;
        can.Observe.prototype.__set = function(prop, value, current, success, error) {
            var self = this,
                validations = self.constructor.validations,
                errorCallback = function(errors) {
                    var stub = error && error.call(self, errors);

                    // if 'setter' is on the page it will trigger
                    // the error itself and we dont want to trigger
                    // the event twice. :)
                    if (stub !== false) {
                        can.trigger(self, "error", [prop, errors], true);
                    }

                    return false;
                };

            old.call(self, prop, value, current, success, errorCallback);

            if (validations && validations[prop]) {
                var errors = self.errors(prop);
                errors && errorCallback(errors)
            }

            return this;
        }

        can.each([can.Observe, can.Model], function(clss) {
            // in some cases model might not be defined quite yet.
            if (clss === undefined) {
                return;
            }
            var oldSetup = clss.setup;


            can.extend(clss, {
                setup: function(superClass) {
                    oldSetup.apply(this, arguments);
                    if (!this.validations || superClass.validations === this.validations) {
                        this.validations = {};
                    }
                },

                validate: validate,


                validationMessages: {
                    format: "is invalid",
                    inclusion: "is not a valid option (perhaps out of range)",
                    lengthShort: "is too short",
                    lengthLong: "is too long",
                    presence: "can't be empty",
                    range: "is out of range",
                    numericality: "must be a number"
                },


                validateFormatOf: function(attrNames, regexp, options) {
                    validate.call(this, attrNames, options, function(value) {
                        if ((typeof value !== 'undefined' && value !== null && value !== '') && String(value).match(regexp) == null) {
                            return this.constructor.validationMessages.format;
                        }
                    });
                },


                validateInclusionOf: function(attrNames, inArray, options) {
                    validate.call(this, attrNames, options, function(value) {
                        if (typeof value == 'undefined') {
                            return;
                        }

                        for (var i = 0; i < inArray.length; i++) {
                            if (inArray[i] == value) {
                                return;
                            }
                        }

                        return this.constructor.validationMessages.inclusion;
                    });
                },


                validateLengthOf: function(attrNames, min, max, options) {
                    validate.call(this, attrNames, options, function(value) {
                        if (((typeof value === 'undefined' || value === null) && min > 0) ||
                            (typeof value !== 'undefined' && value !== null && value.length < min)) {
                            return this.constructor.validationMessages.lengthShort + " (min=" + min + ")";
                        } else if (typeof value != 'undefined' && value !== null && value.length > max) {
                            return this.constructor.validationMessages.lengthLong + " (max=" + max + ")";
                        }
                    });
                },


                validatePresenceOf: function(attrNames, options) {
                    validate.call(this, attrNames, options, function(value) {
                        if (typeof value == 'undefined' || value === "" || value === null) {
                            return this.constructor.validationMessages.presence;
                        }
                    });
                },


                validateRangeOf: function(attrNames, low, hi, options) {
                    validate.call(this, attrNames, options, function(value) {
                        if (((typeof value == 'undefined' || value === null) && low > 0) ||
                            (typeof value !== 'undefined' && value !== null && (value < low || value > hi))) {
                            return this.constructor.validationMessages.range + " [" + low + "," + hi + "]";
                        }
                    });
                },


                validatesNumericalityOf: function(attrNames) {
                    validate.call(this, attrNames, function(value) {
                        var res = !isNaN(parseFloat(value)) && isFinite(value);
                        if (!res) {
                            return this.constructor.validationMessages.numericality;
                        }
                    });
                }
            });
        });

        can.extend(can.Observe.prototype, {


            errors: function(attrs, newVal) {
                // convert attrs to an array
                if (attrs) {
                    attrs = can.isArray(attrs) ? attrs : [attrs];
                }

                var errors = {},
                    self = this,
                    attr,
                // helper function that adds error messages to errors object
                // attr - the name of the attribute
                // funcs - the validation functions
                    addErrors = function(attr, funcs) {
                        can.each(funcs, function(func) {
                            var res = func.call(self, isTest ? (self.__convert ?
                                self.__convert(attr, newVal) :
                                newVal) : self[attr]);
                            if (res) {
                                if (!errors[attr]) {
                                    errors[attr] = [];
                                }
                                errors[attr].push(res);
                            }

                        });
                    },
                    validations = this.constructor.validations,
                    isTest = attrs && attrs.length === 1 && arguments.length === 2;

                // go through each attribute or validation and
                // add any errors
                can.each(attrs || validations || {}, function(funcs, attr) {
                    // if we are iterating through an array, use funcs
                    // as the attr name
                    if (typeof attr == 'number') {
                        attr = funcs;
                        funcs = validations[attr];
                    }
                    // add errors to the
                    addErrors(attr, funcs || []);
                });

                // return errors as long as we have one
                return can.isEmptyObject(errors) ? null : isTest ? errors[attrs[0]] : errors;
            }
        });
        return can.Observe;
    })(__m3, __m11);

    window['can'] = __m5;
})();