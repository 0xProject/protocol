import * as _ from 'lodash';

import { Address } from '../types';

export class TokenAdjacencyGraph {
    private readonly _graph: Map<Address, Address[]>;
    private readonly _defaultTokens: readonly Address[];

    public static getEmptyGraph(): TokenAdjacencyGraph {
        return new TokenAdjacencyGraphBuilder().build();
    }

    /** Prefer using {@link TokenAdjacencyGraphBuilder}. */
    constructor(graph: Map<Address, Address[]>, defaultTokens: readonly Address[]) {
        this._graph = graph;
        this._defaultTokens = defaultTokens;
    }

    public getAdjacentTokens(fromToken: Address): readonly Address[] {
        return this._graph.get(fromToken.toLowerCase()) || this._defaultTokens;
    }

    /** Given a token pair, returns the intermediate tokens to consider for two-hop routes. */
    public getIntermediateTokens(takerToken: Address, makerToken: Address): Address[] {
        // NOTE: it seems it should be a union of `to` tokens of `takerToken` and `from` tokens of `makerToken`,
        // leaving it as same as the initial implementation for now.
        return _.union(this.getAdjacentTokens(takerToken), this.getAdjacentTokens(makerToken)).filter(
            (token) => token !== takerToken.toLowerCase() && token !== makerToken.toLowerCase(),
        );
    }
}

export class TokenAdjacencyGraphBuilder {
    private readonly _graph: Map<Address, Address[]>;
    private readonly _defaultTokens: readonly Address[];

    constructor(defaultTokens: readonly string[] = []) {
        this._graph = new Map();
        this._defaultTokens = defaultTokens.map((addr) => addr.toLowerCase());
    }

    public add(fromToken: Address, toToken: Address): TokenAdjacencyGraphBuilder {
        const fromLower = fromToken.toLowerCase();
        const toLower = toToken.toLowerCase();

        if (fromLower === toLower) {
            throw new Error(`from token (${fromToken}) must be different from to token (${toToken})`);
        }

        if (!this._graph.has(fromLower)) {
            this._graph.set(fromLower, [...this._defaultTokens]);
        }

        // `fromLower` must present
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const toTokens = this._graph.get(fromLower)!;
        if (!toTokens.includes(toLower)) {
            toTokens.push(toLower);
        }

        return this;
    }

    public addBidirectional(tokenA: Address, tokenB: Address): TokenAdjacencyGraphBuilder {
        return this.add(tokenA, tokenB).add(tokenB, tokenA);
    }

    public addCompleteSubgraph(tokens: Address[]): TokenAdjacencyGraphBuilder {
        for (let i = 0; i < tokens.length; i++) {
            for (let j = i + 1; j < tokens.length; j++) {
                this.addBidirectional(tokens[i], tokens[j]);
            }
        }
        return this;
    }

    public tap(cb: (graph: TokenAdjacencyGraphBuilder) => void): TokenAdjacencyGraphBuilder {
        cb(this);
        return this;
    }

    public build(): TokenAdjacencyGraph {
        return new TokenAdjacencyGraph(this._graph, this._defaultTokens);
    }
}
