import _ = require('lodash');

import { TokenAdjacencyGraph } from './types';

export class TokenAdjacencyGraphBuilder {
    constructor(private readonly tokenAdjacency: TokenAdjacencyGraph) {}

    public add(from: string, to: string | string[]): TokenAdjacencyGraphBuilder {
        if (!this.tokenAdjacency[from]) {
            this.tokenAdjacency[from] = [...this.tokenAdjacency.default];
        }
        this.tokenAdjacency[from] = [...(Array.isArray(to) ? to : [to]), ...this.tokenAdjacency[from]];
        this.tokenAdjacency[from] = _.uniqBy(this.tokenAdjacency[from], a => a.toLowerCase());
        return this;
    }

    public tap(cb: (builder: TokenAdjacencyGraphBuilder) => void): TokenAdjacencyGraphBuilder {
        cb(this);
        return this;
    }

    public build(): TokenAdjacencyGraph {
        return this.tokenAdjacency;
    }
}
