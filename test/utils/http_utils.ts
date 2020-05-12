import * as httpRequest from 'supertest';

const API_HTTP_ADDRESS = 'http://localhost:3000';

export interface ProtoRoute {
    baseRoute: string;
    queryParams?: {
        [param: string]: string;
    };
}

/**
 * Constructs a 0x-api route based on a proto route.
 * @param protoRoute The data that specifies a 0x-api route.
 */
export function constructRoute(protoRoute: ProtoRoute): string {
    const queryArray = protoRoute.queryParams ? Object.entries(protoRoute.queryParams) : [];
    if (!queryArray.length) {
        return protoRoute.baseRoute;
    }
    const stringifiedQueryParams = queryArray.map(([param, value]) => `${param}=${value}`).join('&');
    return `${protoRoute.baseRoute}?${stringifiedQueryParams}`;
}

/**
 * Makes a HTTP GET request.
 * @param input Specifies the route and the base URL that should be used to make
 *        the HTTP GET request.
 */
export async function httpGetAsync(input: { route: string; baseURL?: string }): Promise<httpRequest.Response> {
    return httpRequest(input.baseURL || API_HTTP_ADDRESS).get(input.route);
}

/**
 * Makes a HTTP POST request.
 * @param input Specifies the route and the base URL that should be used to make
 *        the HTTP POST request.
 */
export async function httpPostAsync(input: {
    route: string;
    baseURL?: string;
    body?: any;
    headers?: { [field: string]: string };
}): Promise<httpRequest.Response> {
    const request = httpRequest(input.baseURL || API_HTTP_ADDRESS)
        .post(input.route)
        .send(input.body);
    if (input.headers) {
        for (const [field, value] of Object.entries(input.headers)) {
            request.set(field, value);
        }
    }
    return request;
}
