import * as _ from 'lodash';

import {
    TokenAdjacencyGraph,
} from './types';

/**
 * Given a token pair, returns the intermediate tokens to consider for two-hop routes.
 */
export function getIntermediateTokens(
    makerToken: string,
    takerToken: string,
    tokenAdjacencyGraph: TokenAdjacencyGraph,
): string[] {
    const intermediateTokens = _.union(
        _.get(tokenAdjacencyGraph, takerToken, tokenAdjacencyGraph.default),
        _.get(tokenAdjacencyGraph, makerToken, tokenAdjacencyGraph.default),
    );
    return _.uniqBy(intermediateTokens, a => a.toLowerCase()).filter(
        token => token.toLowerCase() !== makerToken.toLowerCase() && token.toLowerCase() !== takerToken.toLowerCase(),
    );
}
