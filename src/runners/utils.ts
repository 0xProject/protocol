import { AppDependencies } from '../app';

/**
 * Pass this callback into the default server to ensure all dependencies shut down correctly
 * @param dependencies A set of app dependencies
 */
export function destroyCallback(dependencies: AppDependencies): () => Promise<void> {
    return async () => {
        if (dependencies.connection) {
            await dependencies.connection.close();
        }
    };
}
