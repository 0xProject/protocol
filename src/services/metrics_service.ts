import { collectDefaultMetrics, register, Registry } from 'prom-client';

export class MetricsService {
    private readonly _registry: Registry;
    constructor() {
        // we use the default register provided by prom-client.
        this._registry = register;
        collectDefaultMetrics({ register: this._registry });
    }

    public getMetrics(): string {
        return this._registry.metrics();
    }
}
