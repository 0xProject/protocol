"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryVote = void 0;
const utils_1 = require("@0x/utils");
const ethUtil = require("ethereumjs-util");
const constants_1 = require("./constants");
const eip712_utils_1 = require("./eip712_utils");
const signature_utils_1 = require("./signature_utils");
const VOTE_DEFAULT_VALUES = {
    proposalId: constants_1.ZERO,
    support: false,
    operatedPoolIds: [],
    chainId: 1,
    version: '1.0.0',
    verifyingContract: utils_1.NULL_ADDRESS,
};
class TreasuryVote {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, VOTE_DEFAULT_VALUES), fields);
        this.proposalId = _fields.proposalId;
        this.support = _fields.support;
        this.operatedPoolIds = _fields.operatedPoolIds;
        this.chainId = _fields.chainId;
        this.version = _fields.version;
        this.verifyingContract = _fields.verifyingContract;
    }
    getDomainHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(TreasuryVote.DOMAIN_TYPE_HASH), utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from(TreasuryVote.CONTRACT_NAME))), utils_1.hexUtils.leftPad(this.chainId), utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from(this.version))), utils_1.hexUtils.leftPad(this.verifyingContract)));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(TreasuryVote.MESSAGE_TYPE_HASH), utils_1.hexUtils.leftPad(this.proposalId), utils_1.hexUtils.leftPad(this.support ? 1 : 0), utils_1.hexUtils.hash(ethUtil.toBuffer(utils_1.hexUtils.concat(...this.operatedPoolIds.map(id => utils_1.hexUtils.leftPad(id)))))));
    }
    getEIP712Hash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.toHex(utils_1.hexUtils.concat('0x1901', this.getDomainHash(), this.getStructHash())));
    }
    getSignatureWithKey(privateKey) {
        return (0, signature_utils_1.eip712SignHashWithKey)(this.getEIP712Hash(), privateKey);
    }
}
exports.TreasuryVote = TreasuryVote;
TreasuryVote.CONTRACT_NAME = 'Zrx Treasury';
TreasuryVote.MESSAGE_STRUCT_NAME = 'TreasuryVote';
TreasuryVote.MESSAGE_STRUCT_ABI = [
    { type: 'uint256', name: 'proposalId' },
    { type: 'bool', name: 'support' },
    { type: 'bytes32[]', name: 'operatedPoolIds' },
];
TreasuryVote.MESSAGE_TYPE_HASH = (0, eip712_utils_1.getTypeHash)(TreasuryVote.MESSAGE_STRUCT_NAME, TreasuryVote.MESSAGE_STRUCT_ABI);
TreasuryVote.DOMAIN_STRUCT_NAME = 'EIP712Domain';
TreasuryVote.DOMAIN_TYPE_HASH = (0, eip712_utils_1.getTypeHash)(TreasuryVote.DOMAIN_STRUCT_NAME, eip712_utils_1.EIP712_DOMAIN_PARAMETERS);
//# sourceMappingURL=treasury_votes.js.map