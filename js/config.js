'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
// tslint:disable:custom-no-magic-numbers
var _0x_js_1 = require('0x.js');
var assert_1 = require('@0x/assert');
var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var constants_1 = require('./constants');
var metadataPath = path.join(__dirname, '../../metadata.json');
var EnvVarType;
(function(EnvVarType) {
    EnvVarType[(EnvVarType['Port'] = 0)] = 'Port';
    EnvVarType[(EnvVarType['NetworkId'] = 1)] = 'NetworkId';
    EnvVarType[(EnvVarType['FeeRecipient'] = 2)] = 'FeeRecipient';
    EnvVarType[(EnvVarType['UnitAmount'] = 3)] = 'UnitAmount';
    EnvVarType[(EnvVarType['Url'] = 4)] = 'Url';
    EnvVarType[(EnvVarType['WhitelistAllTokens'] = 5)] = 'WhitelistAllTokens';
    EnvVarType[(EnvVarType['Boolean'] = 6)] = 'Boolean';
    EnvVarType[(EnvVarType['FeeAssetData'] = 7)] = 'FeeAssetData';
})(EnvVarType || (EnvVarType = {}));
// Whitelisted token addresses. Set to a '*' instead of an array to allow all tokens.
exports.WHITELISTED_TOKENS = _.isEmpty(process.env.WHITELIST_ALL_TOKENS)
    ? ['0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa', '0xd0a1e359811322d97991e03f863a0c30c2cf029c']
    : assertEnvVarType('WHITELIST_ALL_TOKENS', process.env.WHITELIST_ALL_TOKENS, EnvVarType.WhitelistAllTokens);
// Network port to listen on
exports.HTTP_PORT = _.isEmpty(process.env.HTTP_PORT)
    ? 3000
    : assertEnvVarType('HTTP_PORT', process.env.HTTP_PORT, EnvVarType.Port);
// Default network id to use when not specified
exports.NETWORK_ID = _.isEmpty(process.env.NETWORK_ID)
    ? 42
    : assertEnvVarType('NETWORK_ID', process.env.NETWORK_ID, EnvVarType.NetworkId);
// Mesh Endpoint
exports.MESH_ENDPOINT = _.isEmpty(process.env.MESH_ENDPOINT)
    ? 'ws://localhost:60557'
    : assertEnvVarType('MESH_ENDPOINT', process.env.MESH_ENDPOINT, EnvVarType.Url);
// The fee recipient for orders
exports.FEE_RECIPIENT = _.isEmpty(process.env.FEE_RECIPIENT)
    ? getDefaultFeeRecipient()
    : assertEnvVarType('FEE_RECIPIENT', process.env.FEE_RECIPIENT, EnvVarType.FeeRecipient);
// A flat fee that should be charged to the order maker
exports.MAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.MAKER_FEE_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(0)
    : assertEnvVarType('MAKER_FEE_UNIT_AMOUNT', process.env.MAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// A flat fee that should be charged to the order taker
exports.TAKER_FEE_UNIT_AMOUNT = _.isEmpty(process.env.TAKER_FEE_UNIT_AMOUNT)
    ? new _0x_js_1.BigNumber(0)
    : assertEnvVarType('TAKER_FEE_UNIT_AMOUNT', process.env.TAKER_FEE_UNIT_AMOUNT, EnvVarType.UnitAmount);
// The maker fee token encoded as asset data
exports.MAKER_FEE_ASSET_DATA = _.isEmpty(process.env.MAKER_FEE_ASSET_DATA)
    ? constants_1.NULL_BYTES
    : assertEnvVarType('MAKER_FEE_ASSET_DATA', process.env.MAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);
// The taker fee token encoded as asset data
exports.TAKER_FEE_ASSET_DATA = _.isEmpty(process.env.TAKER_FEE_ASSET_DATA)
    ? constants_1.NULL_BYTES
    : assertEnvVarType('TAKER_FEE_ASSET_DATA', process.env.TAKER_FEE_ASSET_DATA, EnvVarType.FeeAssetData);
// Max number of entities per page
exports.MAX_PER_PAGE = 1000;
// Default ERC20 token precision
exports.DEFAULT_ERC20_TOKEN_PRECISION = 18;
// Address used when simulating transfers from the maker as part of 0x order validation
exports.DEFAULT_TAKER_SIMULATION_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
function assertEnvVarType(name, value, expectedType) {
    var returnValue;
    switch (expectedType) {
        case EnvVarType.Port:
            try {
                returnValue = parseInt(value, 10);
                var isWithinRange = returnValue >= 0 && returnValue <= 65535;
                if (!isWithinRange) {
                    throw new Error();
                }
            } catch (err) {
                throw new Error(name + ' must be between 0 to 65535, found ' + value + '.');
            }
            return returnValue;
        case EnvVarType.NetworkId:
            try {
                returnValue = parseInt(value, 10);
            } catch (err) {
                throw new Error(name + ' must be a valid integer, found ' + value + '.');
            }
            return returnValue;
        case EnvVarType.FeeRecipient:
            assert_1.assert.isETHAddressHex(name, value);
            return value;
        case EnvVarType.Url:
            assert_1.assert.isUri(name, value);
            return value;
        case EnvVarType.Boolean:
            return value === 'true';
        case EnvVarType.UnitAmount:
            try {
                returnValue = new _0x_js_1.BigNumber(parseFloat(value));
                if (returnValue.isNegative()) {
                    throw new Error();
                }
            } catch (err) {
                throw new Error(name + ' must be valid number greater than 0.');
            }
            return returnValue;
        case EnvVarType.WhitelistAllTokens:
            return '*';
        case EnvVarType.FeeAssetData:
            assert_1.assert.isString(name, value);
            return value;
        default:
            throw new Error('Unrecognised EnvVarType: ' + expectedType + ' encountered for variable ' + name + '.');
    }
}
function getDefaultFeeRecipient() {
    var metadata = JSON.parse(fs.readFileSync(metadataPath).toString());
    var existingDefault = metadata.DEFAULT_FEE_RECIPIENT;
    var newDefault = existingDefault || '0xabcabc' + crypto.randomBytes(17).toString('hex');
    if (_.isEmpty(existingDefault)) {
        var metadataCopy = JSON.parse(JSON.stringify(metadata));
        metadataCopy.DEFAULT_FEE_RECIPIENT = newDefault;
        fs.writeFileSync(metadataPath, JSON.stringify(metadataCopy));
    }
    return newDefault;
}
