'use strict';
var __extends =
    (this && this.__extends) ||
    (function() {
        var extendStatics = function(d, b) {
            extendStatics =
                Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array &&
                    function(d, b) {
                        d.__proto__ = b;
                    }) ||
                function(d, b) {
                    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
                };
            return extendStatics(d, b);
        };
        return function(d, b) {
            extendStatics(d, b);
            function __() {
                this.constructor = d;
            }
            d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
        };
    })();
Object.defineProperty(exports, '__esModule', { value: true });
var _a;
// tslint:disable:max-classes-per-file
var RelayerBaseError = /** @class */ (function(_super) {
    __extends(RelayerBaseError, _super);
    function RelayerBaseError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.isRelayerError = true;
        return _this;
    }
    return RelayerBaseError;
})(Error);
exports.RelayerBaseError = RelayerBaseError;
var BadRequestError = /** @class */ (function(_super) {
    __extends(BadRequestError, _super);
    function BadRequestError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.statusCode = 400;
        return _this;
    }
    return BadRequestError;
})(RelayerBaseError);
exports.BadRequestError = BadRequestError;
var ValidationError = /** @class */ (function(_super) {
    __extends(ValidationError, _super);
    function ValidationError(validationErrors) {
        var _this = _super.call(this) || this;
        _this.generalErrorCode = GeneralErrorCodes.ValidationError;
        _this.validationErrors = validationErrors;
        return _this;
    }
    return ValidationError;
})(BadRequestError);
exports.ValidationError = ValidationError;
var MalformedJSONError = /** @class */ (function(_super) {
    __extends(MalformedJSONError, _super);
    function MalformedJSONError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.generalErrorCode = GeneralErrorCodes.MalformedJson;
        return _this;
    }
    return MalformedJSONError;
})(BadRequestError);
exports.MalformedJSONError = MalformedJSONError;
var TooManyRequestsError = /** @class */ (function(_super) {
    __extends(TooManyRequestsError, _super);
    function TooManyRequestsError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.statusCode = 429;
        _this.generalErrorCode = GeneralErrorCodes.Throttled;
        return _this;
    }
    return TooManyRequestsError;
})(BadRequestError);
exports.TooManyRequestsError = TooManyRequestsError;
var NotImplementedError = /** @class */ (function(_super) {
    __extends(NotImplementedError, _super);
    function NotImplementedError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.statusCode = 501;
        _this.generalErrorCode = GeneralErrorCodes.NotImplemented;
        return _this;
    }
    return NotImplementedError;
})(BadRequestError);
exports.NotImplementedError = NotImplementedError;
var NotFoundError = /** @class */ (function(_super) {
    __extends(NotFoundError, _super);
    function NotFoundError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.statusCode = 404;
        return _this;
    }
    return NotFoundError;
})(RelayerBaseError);
exports.NotFoundError = NotFoundError;
var InternalServerError = /** @class */ (function(_super) {
    __extends(InternalServerError, _super);
    function InternalServerError() {
        var _this = (_super !== null && _super.apply(this, arguments)) || this;
        _this.statusCode = 500;
        return _this;
    }
    return InternalServerError;
})(RelayerBaseError);
exports.InternalServerError = InternalServerError;
var GeneralErrorCodes;
(function(GeneralErrorCodes) {
    GeneralErrorCodes[(GeneralErrorCodes['ValidationError'] = 100)] = 'ValidationError';
    GeneralErrorCodes[(GeneralErrorCodes['MalformedJson'] = 101)] = 'MalformedJson';
    GeneralErrorCodes[(GeneralErrorCodes['OrderSubmissionDisabled'] = 102)] = 'OrderSubmissionDisabled';
    GeneralErrorCodes[(GeneralErrorCodes['Throttled'] = 103)] = 'Throttled';
    GeneralErrorCodes[(GeneralErrorCodes['NotImplemented'] = 104)] = 'NotImplemented';
})((GeneralErrorCodes = exports.GeneralErrorCodes || (exports.GeneralErrorCodes = {})));
exports.generalErrorCodeToReason =
    ((_a = {}),
    (_a[GeneralErrorCodes.ValidationError] = 'Validation Failed'),
    (_a[GeneralErrorCodes.MalformedJson] = 'Malformed JSON'),
    (_a[GeneralErrorCodes.OrderSubmissionDisabled] = 'Order submission disabled'),
    (_a[GeneralErrorCodes.Throttled] = 'Throttled'),
    (_a[GeneralErrorCodes.NotImplemented] = 'Not Implemented'),
    _a);
var ValidationErrorCodes;
(function(ValidationErrorCodes) {
    ValidationErrorCodes[(ValidationErrorCodes['RequiredField'] = 1000)] = 'RequiredField';
    ValidationErrorCodes[(ValidationErrorCodes['IncorrectFormat'] = 1001)] = 'IncorrectFormat';
    ValidationErrorCodes[(ValidationErrorCodes['InvalidAddress'] = 1002)] = 'InvalidAddress';
    ValidationErrorCodes[(ValidationErrorCodes['AddressNotSupported'] = 1003)] = 'AddressNotSupported';
    ValidationErrorCodes[(ValidationErrorCodes['ValueOutOfRange'] = 1004)] = 'ValueOutOfRange';
    ValidationErrorCodes[(ValidationErrorCodes['InvalidSignatureOrHash'] = 1005)] = 'InvalidSignatureOrHash';
    ValidationErrorCodes[(ValidationErrorCodes['UnsupportedOption'] = 1006)] = 'UnsupportedOption';
    ValidationErrorCodes[(ValidationErrorCodes['InvalidOrder'] = 1007)] = 'InvalidOrder';
    ValidationErrorCodes[(ValidationErrorCodes['InternalError'] = 1008)] = 'InternalError';
})((ValidationErrorCodes = exports.ValidationErrorCodes || (exports.ValidationErrorCodes = {})));
