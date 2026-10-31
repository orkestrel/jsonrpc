import * as entry from '@src/core'
import { describe, expect, it } from 'vitest'

describe('src core entry', () => {
	it('exports the JSON-RPC 2.0 codes, guards, and builders', () => {
		expect(Object.keys(entry).toSorted()).toStrictEqual([
			'JSONRPC_INTERNAL_ERROR',
			'JSONRPC_INVALID_PARAMS',
			'JSONRPC_INVALID_REQUEST',
			'JSONRPC_METHOD_NOT_FOUND',
			'JSONRPC_PARSE_ERROR',
			'buildJSONRPCError',
			'buildJSONRPCResult',
			'isJSONRPCError',
			'isJSONRPCErrorResponse',
			'isJSONRPCId',
			'isJSONRPCInvocation',
			'isJSONRPCMessage',
			'isJSONRPCNotification',
			'isJSONRPCRequest',
			'isJSONRPCResponse',
			'isJSONRPCResultResponse',
		])
	})

	it('pins the reserved JSON-RPC 2.0 codes', () => {
		expect([
			entry.JSONRPC_PARSE_ERROR,
			entry.JSONRPC_INVALID_REQUEST,
			entry.JSONRPC_METHOD_NOT_FOUND,
			entry.JSONRPC_INVALID_PARAMS,
			entry.JSONRPC_INTERNAL_ERROR,
		]).toStrictEqual([-32700, -32600, -32601, -32602, -32603])
	})
})
