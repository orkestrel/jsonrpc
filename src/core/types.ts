/** Identifies a JSON-RPC 2.0 request and the response that answers it. */
export type JSONRPCId = string | number

/** Describes a JSON-RPC 2.0 method call that requires a response. */
export interface JSONRPCRequest {
	readonly jsonrpc: '2.0'
	readonly id: JSONRPCId
	readonly method: string
	readonly params?: Readonly<Record<string, unknown>>
}

/** Describes a JSON-RPC 2.0 method call that permits no response. */
export interface JSONRPCNotification {
	readonly jsonrpc: '2.0'
	readonly method: string
	readonly id?: never
	readonly params?: Readonly<Record<string, unknown>>
}

/** Describes one inbound JSON-RPC 2.0 call, a request or a notification. */
export type JSONRPCInvocation = JSONRPCRequest | JSONRPCNotification

/** Describes the error object a JSON-RPC 2.0 error response carries. */
export interface JSONRPCError {
	readonly code: number
	readonly message: string
	readonly data?: unknown
}

/** Describes a successful JSON-RPC 2.0 response. */
export interface JSONRPCResultResponse {
	readonly jsonrpc: '2.0'
	readonly id: JSONRPCId
	readonly result: unknown
	readonly error?: never
}

/**
 * Describes a failed JSON-RPC 2.0 response, with `id` set to `null` when the request's id could
 * not be read.
 */
export interface JSONRPCErrorResponse {
	readonly jsonrpc: '2.0'
	readonly id: JSONRPCId | null
	readonly error: JSONRPCError
	readonly result?: never
}

/** Describes either outcome of a JSON-RPC 2.0 request. */
export type JSONRPCResponse = JSONRPCResultResponse | JSONRPCErrorResponse

/** Describes one complete JSON-RPC 2.0 wire message. */
export type JSONRPCMessage = JSONRPCInvocation | JSONRPCResponse
