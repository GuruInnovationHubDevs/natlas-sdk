export class NAtlasError extends Error {
    /** HTTP status from the endpoint, if the error came from a response. */
    status;
    /** Short machine-readable code, e.g. "timeout", "rate_limited", "bad_response". */
    code;
    /** Raw response body, when available. */
    body;
    constructor(message, options) {
        super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
        this.name = "NAtlasError";
        this.code = options.code;
        this.status = options.status;
        this.body = options.body;
    }
    /** Whether retrying the same request may succeed. */
    get retryable() {
        return this.code === "timeout" || this.code === "network" || this.status === 429 || (this.status ?? 0) >= 500;
    }
}
export function codeForStatus(status) {
    if (status === 401 || status === 403)
        return "unauthorized";
    if (status === 404)
        return "not_found";
    if (status === 429)
        return "rate_limited";
    if (status === 503)
        return "model_loading";
    if (status >= 500)
        return "server_error";
    return "bad_request";
}
//# sourceMappingURL=errors.js.map