import type { JSONRPCErrorResponse, JSONRPCId, JSONRPCResultResponse } from './types.js'

/**
 * Builds a successful JSON-RPC 2.0 response that echoes the request's id.
 *
 * @remarks
 * The `id` must be an integer or a string, and the `result` must be a JSON value. The builder
 * copies both unchecked, so `isJSONRPCResultResponse` refuses an envelope built from a fractional
 * id or an `undefined` result.
 *
 * @example
 * ```ts
 * buildJSONRPCResult(1, { capabilities: {} })
 * // { jsonrpc: '2.0', id: 1, result: { capabilities: {} } }
 * ```
 */
export function buildJSONRPCResult(id: JSONRPCId, result: unknown): JSONRPCResultResponse {
	return { jsonrpc: '2.0', id, result }
}

/**
 * Builds a failed JSON-RPC 2.0 response, omitting `data` when it is absent.
 *
 * @remarks
 * Pass `null` as `id` when the request's id could not be read; the envelope carries `id: null`.
 *
 * @example Answer a request
 * ```ts
 * import type { JSONRPCResponse } from '@orkestrel/jsonrpc'
 * import {
 * 	buildJSONRPCError,
 * 	buildJSONRPCResult,
 * 	isJSONRPCRequest,
 * 	JSONRPC_INVALID_REQUEST,
 * 	JSONRPC_METHOD_NOT_FOUND,
 * 	JSONRPC_PARSE_ERROR,
 * } from '@orkestrel/jsonrpc'
 *
 * function answer(text: string): JSONRPCResponse {
 * 	let value: unknown
 * 	try {
 * 		value = JSON.parse(text)
 * 	} catch {
 * 		return buildJSONRPCError(null, JSONRPC_PARSE_ERROR, 'Parse error')
 * 	}
 * 	if (!isJSONRPCRequest(value)) {
 * 		return buildJSONRPCError(null, JSONRPC_INVALID_REQUEST, 'Invalid Request')
 * 	}
 * 	if (value.method !== 'ping') {
 * 		return buildJSONRPCError(value.id, JSONRPC_METHOD_NOT_FOUND, 'Method not found')
 * 	}
 * 	return buildJSONRPCResult(value.id, 'pong')
 * }
 *
 * answer('{') // { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }
 * answer('{"jsonrpc":"2.0","id":7,"method":"ping"}') // { jsonrpc: '2.0', id: 7, result: 'pong' }
 * ```
 */
export function buildJSONRPCError(
	id: JSONRPCId | null,
	code: number,
	message: string,
	data?: unknown,
): JSONRPCErrorResponse {
	return {
		jsonrpc: '2.0',
		id,
		error: data === undefined ? { code, message } : { code, message, data },
	}
}
