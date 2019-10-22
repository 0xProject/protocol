'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var _ = require('lodash');
var config_1 = require('../config');
var errors_1 = require('../errors');
/**
 * Parses URL params and stores them on the request object
 */
function urlParamsParsing(req, _res, next) {
    var networkId = parseNetworkId(req.query.networkId);
    // HACK: This is the recommended way to pass data from middlewares on. It's not beautiful nor fully type-safe.
    req.networkId = networkId;
    next();
}
exports.urlParamsParsing = urlParamsParsing;
function parseNetworkId(networkIdStrIfExists) {
    if (networkIdStrIfExists === undefined) {
        return config_1.NETWORK_ID;
    } else {
        var networkId = _.parseInt(networkIdStrIfExists);
        if (networkId !== config_1.NETWORK_ID) {
            var validationErrorItem = {
                field: 'networkId',
                code: 1004,
                reason: 'Incorrect Network ID: ' + networkIdStrIfExists,
            };
            throw new errors_1.ValidationError([validationErrorItem]);
        }
        return networkId;
    }
}
