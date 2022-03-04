import * as apiKeySchema from './api_key_schema.json';
import * as integratorsAclSchema from './integrators_acl_schema.json';
import * as integratorAclSchema from './integrator_acl_schema.json';
import * as metaTransactionFillRequestSchema from './meta_transaction_fill_request_schema.json';
import * as metaTransactionQuoteRequestSchema from './meta_transaction_quote_request_schema.json';
import * as rfqMakerConfigSchema from './rfq_maker_config.json';
import * as rfqMakerConfigListSchema from './rfq_maker_config_list.json';
import * as slippageModelFileSchema from './slippage_model_file_schema.json';
import * as slippageModelSchema from './slippage_model_schema.json';
import * as sraOrderbookQuerySchema from './sra_orderbook_query_schema.json';
import * as sraOrdersQuerySchema from './sra_orders_query_schema.json';
import * as sraOrderConfigPayloadSchema from './sra_order_config_payload_schema.json';
import * as sraPostOrdersPayloadSchema from './sra_post_orders_payload_schema.json';
import * as sraPostOrderPayloadSchema from './sra_post_order_payload_schema.json';
import * as sraOrdersChannelSubscribeSchema from './sra_ws_orders_channel_subscribe_schema.json';
import * as swapQuoteRequestSchema from './swap_quote_request_schema.json';

export const schemas = {
    apiKeySchema,
    integratorAclSchema,
    integratorsAclSchema,
    metaTransactionFillRequestSchema,
    metaTransactionQuoteRequestSchema,
    rfqMakerConfigListSchema,
    rfqMakerConfigSchema,
    slippageModelFileSchema,
    slippageModelSchema,
    sraOrderbookQuerySchema,
    sraOrderConfigPayloadSchema,
    sraOrdersChannelSubscribeSchema,
    sraOrdersQuerySchema,
    sraPostOrderPayloadSchema,
    sraPostOrdersPayloadSchema,
    swapQuoteRequestSchema,
};
