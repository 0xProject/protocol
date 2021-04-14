import * as apiKeySchema from './api_key_schema.json';
import * as metaTransactionFillRequestSchema from './meta_transaction_fill_request_schema.json';
import * as metaTransactionQuoteRequestSchema from './meta_transaction_quote_request_schema.json';
import * as sraOrderbookQuerySchema from './sra_orderbook_query_schema.json';
import * as sraOrdersQuerySchema from './sra_orders_query_schema.json';
import * as sraOrderConfigPayloadSchema from './sra_order_config_payload_schema.json';
import * as sraPostOrdersPayloadSchema from './sra_post_orders_payload_schema.json';
import * as sraPostOrderPayloadSchema from './sra_post_order_payload_schema.json';
import * as sraOrdersChannelSubscribeSchema from './sra_ws_orders_channel_subscribe_schema.json';
import * as swapQuoteRequestSchema from './swap_quote_request_schema.json';

export const schemas = {
    sraOrderConfigPayloadSchema,
    sraOrderbookQuerySchema,
    sraOrdersQuerySchema,
    sraOrdersChannelSubscribeSchema,
    sraPostOrderPayloadSchema,
    sraPostOrdersPayloadSchema,
    swapQuoteRequestSchema,
    metaTransactionFillRequestSchema,
    metaTransactionQuoteRequestSchema,
    apiKeySchema,
};
