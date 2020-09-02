// tslint:disable

import * as apm from 'elastic-apm-node';
apm.start({ active: process.env.ELASTIC_APM_ACTIVE === 'true' });

const wrapper = function(orig, name) {
    return function wrapped(...args) {
        var span = apm.startSpan(name);
        const result = orig.apply(this, args);
        if (result && result.then) {
            return new Promise((resolve, reject) => {
                result
                    .then(re => {
                        span && span.end();
                        resolve(re);
                    })
                    .catch(err => {
                        span && span.end();
                        reject(err);
                    });
            });
        }
        span && span.end();
        return result;
    };
};

var shimmer = require('elastic-apm-node/lib/instrumentation/shimmer');
var DexOrderSampler = require('@0x/asset-swapper/lib/src/utils/market_operation_utils/sampler').DexOrderSampler;
var SamplerOperations = require('@0x/asset-swapper/lib/src/utils/market_operation_utils/sampler_operations')
    .SamplerOperations;
var QuoteRequestor = require('@0x/asset-swapper/lib/src/utils/quote_requestor').QuoteRequestor;
var MarketOperationUtils = require('@0x/asset-swapper/lib/src/utils/market_operation_utils/index').MarketOperationUtils;
var quoteReporter = require('@0x/asset-swapper/lib/src/utils/quote_report_generator');
var pathOptimizer = require('@0x/asset-swapper/lib/src/utils/market_operation_utils/path_optimizer');

shimmer.wrap(QuoteRequestor.prototype, 'requestRfqtFirmQuotesAsync', wrapper);
shimmer.wrap(QuoteRequestor.prototype, 'requestRfqtIndicativeQuotesAsync', wrapper);
shimmer.wrap(SamplerOperations.prototype, 'getSellQuotes', wrapper);
shimmer.wrap(MarketOperationUtils.prototype, '_generateOptimizedOrdersAsync', wrapper);
shimmer.wrap(MarketOperationUtils.prototype, 'getMarketSellLiquidityAsync', wrapper);
shimmer.wrap(DexOrderSampler.prototype, 'executeBatchAsync', wrapper);
shimmer.wrap(quoteReporter, 'generateQuoteReport', wrapper);
shimmer.wrap(pathOptimizer, 'findOptimalPathAsync', wrapper);

// tslint:enable
