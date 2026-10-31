import { holds, isInteger, isRecord, isString } from '@orkestrel/contract'
import type {
	JSONRPCError,
	JSONRPCErrorResponse,
	JSONRPCId,
	JSONRPCInvocation,
	JSONRPCMessage,
	JSONRPCNotification,
	JSONRPCRequest,
	JSONRPCResponse,
	JSONRPCResultResponse,
} from './types.js'

/**
 * Checks whether a value is a JSON-RPC 2.0 id, a string or a finite integer.
 *
 * @example
 * ```ts
 * isJSONRPCId('request-1') // true
 * isJSONRPCId(1.5) // false
 * isJSONRPCId(null) // false
 * ```
 */
export function isJSONRPCId(value: unknown): value is JSONRPCId {
	return isString(value) || isInteger(value)
}

/**
 * Checks whether a value is a JSON-RPC 2.0 error object.
 *
 * @remarks
 * The `code` member is an integer and the `message` member is a string. Any `data` member and any
 * extra member passes.
 *
 * @example
 * ```ts
 * isJSONRPCError({ code: -32601, message: 'Method not found' }) // true
 * isJSONRPCError({ code: -32601.5, message: 'Method not found' }) // false
 * ```
 */
export function isJSONRPCError(value: unknown): value is JSONRPCError {
	return isRecord(value) && holds(() => isInteger(value.code) && isString(value.message))
}

/**
 * Checks whether a value is a JSON-RPC 2.0 request.
 *
 * @remarks
 * A present `params` member is a record, because the package carries parameters by name and
 * refuses a by-position array. A `result` or `error` member refuses the value.
 *
 * @example
 * ```ts
 * isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' }) // true
 * isJSONRPCRequest({ jsonrpc: '2.0', method: 'initialized' }) // false
 * ```
 */
export function isJSONRPCRequest(value: unknown): value is JSONRPCRequest {
	return (
		isRecord(value) &&
		holds(
			() =>
				value.jsonrpc === '2.0' &&
				isJSONRPCId(value.id) &&
				isString(value.method) &&
				(!('params' in value) || isRecord(value.params)) &&
				!('result' in value) &&
				!('error' in value),
		)
	)
}

/**
 * Checks whether a value is a JSON-RPC 2.0 notification.
 *
 * @remarks
 * An `id` member refuses the value whatever it holds, as does a `result` or `error` member. A
 * present `params` member is a record.
 *
 * @example
 * ```ts
 * isJSONRPCNotification({ jsonrpc: '2.0', method: 'initialized' }) // true
 * isJSONRPCNotification({ jsonrpc: '2.0', id: 1, method: 'initialize' }) // false
 * ```
 */
export function isJSONRPCNotification(value: unknown): value is JSONRPCNotification {
	return (
		isRecord(value) &&
		holds(
			() =>
				value.jsonrpc === '2.0' &&
				!('id' in value) &&
				isString(value.method) &&
				(!('params' in value) || isRecord(value.params)) &&
				!('result' in value) &&
				!('error' in value),
		)
	)
}

/**
 * Checks whether a value is a JSON-RPC 2.0 request or notification.
 *
 * @example
 * ```ts
 * isJSONRPCInvocation({ jsonrpc: '2.0', method: 'initialized' }) // true
 * isJSONRPCInvocation({ jsonrpc: '2.0', id: 1, result: null }) // false
 * ```
 */
export function isJSONRPCInvocation(value: unknown): value is JSONRPCInvocation {
	return isJSONRPCRequest(value) || isJSONRPCNotification(value)
}

/**
 * Checks whether a value is a successful JSON-RPC 2.0 response.
 *
 * @remarks
 * The `result` member holds any value but `undefined`, which JSON cannot carry. An `error` or
 * `method` member refuses the value.
 *
 * @example
 * ```ts
 * isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1, result: null }) // true
 * isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1 }) // false
 * ```
 */
export function isJSONRPCResultResponse(value: unknown): value is JSONRPCResultResponse {
	return (
		isRecord(value) &&
		holds(
			() =>
				value.jsonrpc === '2.0' &&
				isJSONRPCId(value.id) &&
				value.result !== undefined &&
				!('error' in value) &&
				!('method' in value),
		)
	)
}

/**
 * Checks whether a value is a failed JSON-RPC 2.0 response.
 *
 * @remarks
 * The `id` member is present and holds an id or `null`. A `result` or `method` member refuses the
 * value.
 *
 * @example
 * ```ts
 * isJSONRPCErrorResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) // true
 * isJSONRPCErrorResponse({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }) // false
 * ```
 */
export function isJSONRPCErrorResponse(value: unknown): value is JSONRPCErrorResponse {
	return (
		isRecord(value) &&
		holds(
			() =>
				value.jsonrpc === '2.0' &&
				(value.id === null || isJSONRPCId(value.id)) &&
				isJSONRPCError(value.error) &&
				!('result' in value) &&
				!('method' in value),
		)
	)
}

/**
 * Checks whether a value is a JSON-RPC 2.0 response.
 *
 * @example
 * ```ts
 * isJSONRPCResponse({ jsonrpc: '2.0', id: 'request-1', result: [] }) // true
 * isJSONRPCResponse({ jsonrpc: '2.0', id: 1, method: 'initialize' }) // false
 * ```
 */
export function isJSONRPCResponse(value: unknown): value is JSONRPCResponse {
	return isJSONRPCResultResponse(value) || isJSONRPCErrorResponse(value)
}

/**
 * Checks whether a value is a JSON-RPC 2.0 message.
 *
 * @example Classify a message
 * ```ts
 * import { isJSONRPCInvocation, isJSONRPCMessage, isJSONRPCResponse } from '@orkestrel/jsonrpc'
 *
 * const hybrid: unknown = JSON.parse('{"jsonrpc":"2.0","id":1,"method":"ping","result":null}')
 *
 * isJSONRPCMessage(hybrid) // false
 * isJSONRPCInvocation({ jsonrpc: '2.0', method: 'initialized' }) // true
 * isJSONRPCResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) // true
 * ```
 */
export function isJSONRPCMessage(value: unknown): value is JSONRPCMessage {
	return isJSONRPCInvocation(value) || isJSONRPCResponse(value)
}
