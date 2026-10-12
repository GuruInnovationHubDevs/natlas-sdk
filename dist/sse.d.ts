/** Incremental parser for text/event-stream data. Feed it text, get back the JSON payloads of complete events. */
export declare class SSEParser {
    private buffer;
    /** Set once the stream sends `data: [DONE]`. */
    done: boolean;
    push(text: string): unknown[];
    flush(): unknown[];
    private handle;
}
/** Parse a fetch response body (ReadableStream) into event payloads. */
export declare function parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown>;
