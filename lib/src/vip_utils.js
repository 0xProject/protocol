"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCurveLiquidityProviderData = exports.curveLiquidityProviderDataEncoder = void 0;
const utils_1 = require("@0x/utils");
exports.curveLiquidityProviderDataEncoder = utils_1.AbiEncoder.create([
    { name: 'curveAddress', type: 'address' },
    { name: 'exchangeFunctionSelector', type: 'bytes4' },
    { name: 'fromCoinIdx', type: 'int128' },
    { name: 'toCoinIdx', type: 'int128' },
]);
/**
 * Encode data for the curve liquidity provider contract.
 */
function encodeCurveLiquidityProviderData(data) {
    return exports.curveLiquidityProviderDataEncoder.encode([
        data.curveAddress,
        data.exchangeFunctionSelector,
        data.fromCoinIdx,
        data.toCoinIdx,
    ]);
}
exports.encodeCurveLiquidityProviderData = encodeCurveLiquidityProviderData;
//# sourceMappingURL=vip_utils.js.map