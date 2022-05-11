import Axios, { AxiosRequestConfig } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

import { ChainConfigurations, RFQ_PROXY_ADDRESS, RFQ_PROXY_PORT } from '../config';
import { KEEP_ALIVE_TTL } from '../constants';
import { RefreshingQuoteRequestor } from '../quoteRequestor/RefreshingQuoteRequestor';
import { RfqtService } from '../services/RfqtService';

import { ConfigManager } from './config_manager';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';
import { RfqMakerManager } from './rfq_maker_manager';

export type RfqtServices = Map<number, RfqtService>;

const DEFAULT_AXIOS_TIMEOUT = 600; // ms

/**
 * Creates an RFQT Service for each chain present in `ChainConfigurations`.
 *
 * Intended for use by the top-level runners.
 */
export async function buildRfqtServicesAsync(
    chainConfigurations: ChainConfigurations,
    rfqMakerDbUtils: RfqMakerDbUtils,
): Promise<RfqtServices> {
    const axiosInstance = Axios.create(getAxiosRequestConfig());
    const configManager = new ConfigManager();
    const services = await Promise.all(
        chainConfigurations.map(async (chain) => {
            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, chain.chainId);
            const quoteRequestor = new RefreshingQuoteRequestor(rfqMakerManager, axiosInstance);
            return new RfqtService(quoteRequestor);
        }),
    );
    return new Map(services.map((s, i) => [chainConfigurations[i].chainId, s]));
}

/**
 * Creates the Axios Request Config
 */
function getAxiosRequestConfig(): AxiosRequestConfig {
    const axiosRequestConfig: AxiosRequestConfig = {
        httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
        timeout: DEFAULT_AXIOS_TIMEOUT,
    };
    if (RFQ_PROXY_ADDRESS !== undefined && RFQ_PROXY_PORT !== undefined) {
        axiosRequestConfig.proxy = {
            host: RFQ_PROXY_ADDRESS,
            port: RFQ_PROXY_PORT,
        };
    }

    return axiosRequestConfig;
}
