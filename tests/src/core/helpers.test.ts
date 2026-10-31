import {
	buildJSONRPCError,
	buildJSONRPCResult,
	isJSONRPCErrorResponse,
	isJSONRPCMessage,
	isJSONRPCResultResponse,
	JSONRPC_INVALID_REQUEST,
	JSONRPC_METHOD_NOT_FOUND,
	JSONRPC_PARSE_ERROR,
} from '@src/core'
import { describe, expect, it } from 'vitest'

describe('buildJSONRPCResult', () => {
	it('builds a success envelope echoing the id', () => {
		expect(buildJSONRPCResult(1, { ok: true })).toEqual({
			jsonrpc: '2.0',
			id: 1,
			result: { ok: true },
		})
	})

	it('carries a result with no resultType', () => {
		expect(buildJSONRPCResult(1, { tools: [] })).toEqual({
			jsonrpc: '2.0',
			id: 1,
			result: { tools: [] },
		})
	})

	it('carries any result value, null and a primitive included', () => {
		expect(JSON.stringify(buildJSONRPCResult('request-1', null))).toBe(
			'{"jsonrpc":"2.0","id":"request-1","result":null}',
		)
		expect(buildJSONRPCResult(0, 5)).toStrictEqual({ jsonrpc: '2.0', id: 0, result: 5 })
	})

	it('builds an envelope the result guard refuses from an undefined result or a fractional id', () => {
		expect(isJSONRPCResultResponse(buildJSONRPCResult(1, undefined))).toBe(false)
		expect(isJSONRPCResultResponse(buildJSONRPCResult(1.5, null))).toBe(false)
	})

	it('builds an envelope the result guard accepts', () => {
		for (const result of [null, 5, 'done', [], { capabilities: {} }]) {
			expect(isJSONRPCResultResponse(buildJSONRPCResult(1, result))).toBe(true)
		}
	})
})

describe('buildJSONRPCError', () => {
	it('builds an error envelope without data when none is given', () => {
		expect(buildJSONRPCError(1, -32601, 'Method not found')).toEqual({
			jsonrpc: '2.0',
			id: 1,
			error: { code: -32601, message: 'Method not found' },
		})
	})

	it('includes data when supplied', () => {
		expect(buildJSONRPCError(1, -32000, 'Server error', { detail: 'x' })).toEqual({
			jsonrpc: '2.0',
			id: 1,
			error: { code: -32000, message: 'Server error', data: { detail: 'x' } },
		})
	})

	it('omits an undefined data member and keeps a null one', () => {
		expect(
			Object.hasOwn(buildJSONRPCError(1, -32603, 'Internal error', undefined).error, 'data'),
		).toBe(false)
		expect(buildJSONRPCError(1, -32603, 'Internal error', null).error).toStrictEqual({
			code: -32603,
			message: 'Internal error',
			data: null,
		})
	})

	it('writes a null id member when none could be read', () => {
		const envelope = buildJSONRPCError(null, JSONRPC_PARSE_ERROR, 'Parse error')

		expect(envelope).toStrictEqual({
			jsonrpc: '2.0',
			id: null,
			error: { code: -32700, message: 'Parse error' },
		})
		expect(Object.hasOwn(envelope, 'id')).toBe(true)
		expect(envelope.id).toBeNull()
	})

	it('keeps an empty-string id, which is a legal id rather than an absent one', () => {
		const envelope = buildJSONRPCError('', JSONRPC_INVALID_REQUEST, 'Invalid Request')

		expect(Object.hasOwn(envelope, 'id')).toBe(true)
		expect(envelope.id).toBe('')
	})

	it('serializes an unreadable id as null', () => {
		const anonymous = buildJSONRPCError(null, -32_700, 'Parse error')
		const correlated = buildJSONRPCError('abc', -32_600, 'Invalid Request')

		expect(JSON.stringify(anonymous)).toBe(
			'{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}',
		)
		expect(correlated.id).toBe('abc')
	})

	it('builds an envelope the error guard accepts', () => {
		for (const id of [null, 0, 'request-1']) {
			expect(
				isJSONRPCErrorResponse(buildJSONRPCError(id, JSONRPC_METHOD_NOT_FOUND, 'Method not found')),
			).toBe(true)
		}
	})
})

describe('builder envelopes', () => {
	it('stays a message after a JSON round trip whenever a guard accepts it', () => {
		const ids = [0, -0, 7, Number.MAX_SAFE_INTEGER, '', 'request-1', 1.5, Number.NaN]
		const values: readonly unknown[] = [
			undefined,
			null,
			0,
			-0,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			'',
			'pong',
			false,
			[],
			[undefined, null],
			{},
			{ omitted: undefined },
			{ capabilities: { nested: [1, 'two'] } },
		]
		const envelopes = [
			...ids.flatMap((id) => values.map((result) => buildJSONRPCResult(id, result))),
			...[null, ...ids].flatMap((id) =>
				values.map((data) => buildJSONRPCError(id, JSONRPC_PARSE_ERROR, 'Parse error', data)),
			),
		]
		const accepted = envelopes.filter(
			(envelope) => isJSONRPCResultResponse(envelope) || isJSONRPCErrorResponse(envelope),
		)
		const lost = accepted.filter(
			(envelope) => !isJSONRPCMessage(JSON.parse(JSON.stringify(envelope))),
		)

		expect(accepted.length).toBeGreaterThan(0)
		expect(accepted.length).toBeLessThan(envelopes.length)
		expect(lost).toStrictEqual([])
	})
})
