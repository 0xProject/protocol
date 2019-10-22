'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var OrderWatcherLifeCycleEvents;
(function(OrderWatcherLifeCycleEvents) {
    OrderWatcherLifeCycleEvents[(OrderWatcherLifeCycleEvents['Added'] = 0)] = 'Added';
    OrderWatcherLifeCycleEvents[(OrderWatcherLifeCycleEvents['Removed'] = 1)] = 'Removed';
    OrderWatcherLifeCycleEvents[(OrderWatcherLifeCycleEvents['Updated'] = 2)] = 'Updated';
})((OrderWatcherLifeCycleEvents = exports.OrderWatcherLifeCycleEvents || (exports.OrderWatcherLifeCycleEvents = {})));
var MessageTypes;
(function(MessageTypes) {
    MessageTypes['Subscribe'] = 'subscribe';
})((MessageTypes = exports.MessageTypes || (exports.MessageTypes = {})));
var MessageChannels;
(function(MessageChannels) {
    MessageChannels['Orders'] = 'orders';
})((MessageChannels = exports.MessageChannels || (exports.MessageChannels = {})));
