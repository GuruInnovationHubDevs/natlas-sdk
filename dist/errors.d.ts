export declare class NAtlasError extends Error {
    /** HTTP status from the endpoint, if the error came from a response. */
    readonly status?: number;
    /** Short machine-readable code, e.g. "timeout", "rate_limited", "bad_response". */
    readonly code: string;
    /** Raw response body, when available. */
    readonly body?: string;
    constructor(message: string, options: {
        code: string;
        status?: number;
        body?: string;
        cause?: unknown;
    });
    /** Whether retrying the same request may succeed. */
    get retryable(): boolean;
}
export declare function codeForStatus(status: number): string;
