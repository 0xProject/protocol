import * as permitAndCall from './PermitAndCall.json';
// PermitERC20.json is extracted from https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2ERC20.sol
import * as permitERC20 from './PermitERC20.json';
// PolygonBridgedERC20.json is from https://github.com/maticnetwork/pos-portal/blob/master/artifacts/ChildERC20.json
import * as polygonBridgedERC20 from './PolygonBridgedERC20.json';

export const abis = {
    permitAndCall: permitAndCall.abi,
    permitERC20: permitERC20.abi,
    polygonBridgedERC20: polygonBridgedERC20.abi,
};
