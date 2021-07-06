// SPDX-License-Identifier: MIT
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

// https://github.com/nomiclabs/hardhat/blob/d4d9e5e28bcf6c65f2b03bcd765fc7a0da04366c/packages/hardhat-core/console.sol 

library console {
    address constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);

    function _sendLogPayload(bytes memory payload) private view {
        uint256 payloadLength = payload.length;
        address consoleAddress = CONSOLE_ADDRESS;
        assembly {
            let payloadStart := add(payload, 32)
            let r := staticcall(gas(), consoleAddress, payloadStart, payloadLength, 0, 0)
        }
    }

	function log() internal view {
		_sendLogPayload(abi.encodeWithSignature("log()"));
	}

    function log(int256 p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(int256)", p0));
    }

    function log(uint256 p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0));
    }

    function logString(string memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
    }

    function log(string memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
    }

    function log(bool p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool)", p0));
    }

    function log(address p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address)", p0));
    }

    function log(bytes memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes)", p0));
    }

    function log(bytes32 p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes32)", p0));
    }

    function log(int256[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(int256[])", p0));
    }

    function log(uint256[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256[])", p0));
    }

    function log(string[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string[])", p0));
    }

    function log(bool[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool[])", p0));
    }

    function log(address[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address[])", p0));
    }

    function log(bytes[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes[])", p0));
    }

    function log(bytes32[] memory p0) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes32[])", p0));
    }

}