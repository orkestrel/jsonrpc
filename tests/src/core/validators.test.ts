import type {
	JSONRPCErrorResponse,
	JSONRPCId,
	JSONRPCInvocation,
	JSONRPCMessage,
	JSONRPCNotification,
	JSONRPCRequest,
	JSONRPCResponse,
	JSONRPCResultResponse,
} from '@src/core'
import {
	isJSONRPCError,
	isJSONRPCErrorResponse,
	isJSONRPCId,
	isJSONRPCInvocation,
	isJSONRPCMessage,
	isJSONRPCNotification,
	isJSONRPCRequest,
	isJSONRPCResponse,
	isJSONRPCResultResponse,
} from '@src/core'
import * as entry from '@src/core'
import { describe, expect, expectTypeOf, it } from 'vitest'

const ERROR = Object.freeze({ code: -32700, message: 'Parse error' })
const REQUEST = Object.freeze({ jsonrpc: '2.0', id: 1, method: 'initialize' })
const NOTIFICATION = Object.freeze({ jsonrpc: '2.0', method: 'initialized' })
const RESULT = Object.freeze({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } })
const FAILURE = Object.freeze({ jsonrpc: '2.0', id: 1, error: ERROR })
const UNREADABLE = Object.freeze({ jsonrpc: '2.0', id: null, error: ERROR })

const revoked = Proxy.revocable({ ...REQUEST }, {})
revoked.revoke()
const cycle: Record<string, unknown> = { ...REQUEST }
cycle['self'] = cycle
const nested = Array.from({ length: 64 }).reduce<Record<string, unknown>>(
	(inner) => ({ nested: inner }),
	{ leaf: true },
)

// Values no guard accepts: each is outside the plain-record population or carries no message.
const MALFORMED: readonly unknown[] = Object.freeze([
	undefined,
	null,
	0,
	-0,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	'',
	'{}',
	true,
	false,
	1n,
	[],
	[{ ...REQUEST }],
	() => undefined,
	Symbol('id'),
	new Date(0),
	new Map([['jsonrpc', '2.0']]),
	new Set(['2.0']),
	revoked.proxy,
	Object.create(null),
	{ __proto__: { ...REQUEST } },
	nested,
	{ ...REQUEST, params: undefined },
	{ hello: 'world' },
])

// Each value a guard accepts, whose every member a totality case redefines as a throwing accessor.
const BASES = Object.freeze([
	{ label: 'a request', base: { ...REQUEST, params: {} } },
	{ label: 'a notification', base: { ...NOTIFICATION, params: {} } },
	{ label: 'a result response', base: RESULT },
	{ label: 'an error response', base: FAILURE },
	{ label: 'an unreadable-id error response', base: UNREADABLE },
	{ label: 'an error object', base: ERROR },
])

const GUARDS = Object.freeze({
	isJSONRPCId,
	isJSONRPCError,
	isJSONRPCRequest,
	isJSONRPCNotification,
	isJSONRPCInvocation,
	isJSONRPCResultResponse,
	isJSONRPCErrorResponse,
	isJSONRPCResponse,
	isJSONRPCMessage,
})

describe('JSON-RPC guards', () => {
	it('accepts each envelope arm and refuses overlapping arms', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })).toBe(true)
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'initialized' })).toBe(true)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 'request', result: null })).toBe(true)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: null,
				error: { code: -32700, message: 'Parse error' },
			}),
		).toBe(true)
		expect(isJSONRPCError({ code: -32603, message: 'Internal error', data: null })).toBe(true)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				result: null,
				error: { code: -32603, message: 'Internal error' },
			}),
		).toBe(false)
	})

	it('returns false for null, primitives, arrays, and wrong-typed members', () => {
		for (const value of [null, undefined, true, 1, 'message', []]) {
			expect(isJSONRPCRequest(value)).toBe(false)
			expect(isJSONRPCNotification(value)).toBe(false)
			expect(isJSONRPCResponse(value)).toBe(false)
		}
		expect(isJSONRPCRequest({ jsonrpc: '2.0', id: null, method: 'initialize' })).toBe(false)
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 1 })).toBe(false)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, error: 'failed' })).toBe(false)
		expect(isJSONRPCError({ code: '-32603', message: 'Internal error' })).toBe(false)
	})
})

describe('isJSONRPCId', () => {
	it('accepts a string id', () => {
		expect(isJSONRPCId('abc')).toBe(true)
	})

	it('accepts an empty string', () => {
		expect(isJSONRPCId('')).toBe(true)
	})

	it('accepts a finite integer id, including zero and a negative one', () => {
		expect(isJSONRPCId(1)).toBe(true)
		expect(isJSONRPCId(0)).toBe(true)
		expect(isJSONRPCId(-0)).toBe(true)
		expect(isJSONRPCId(-7)).toBe(true)
	})

	it('rejects an absent id', () => {
		expect(isJSONRPCId(undefined)).toBe(false)
	})

	it('rejects a null id, which only an error response carries', () => {
		expect(isJSONRPCId(null)).toBe(false)
	})

	it('rejects an object, an array, a boolean, and a non-integer number', () => {
		for (const value of [
			{},
			{ id: 1 },
			[],
			[1],
			true,
			false,
			1.5,
			Number.NaN,
			Number.POSITIVE_INFINITY,
		]) {
			expect(isJSONRPCId(value)).toBe(false)
		}
	})

	it.each([
		{ label: 'a string', value: 'request-1', expected: true },
		{ label: 'an empty string', value: '', expected: true },
		{ label: 'zero', value: 0, expected: true },
		{ label: 'negative zero', value: -0, expected: true },
		{ label: 'a negative integer', value: -7, expected: true },
		{ label: 'the largest safe integer', value: Number.MAX_SAFE_INTEGER, expected: true },
		{ label: 'undefined', value: undefined, expected: false },
		{ label: 'null', value: null, expected: false },
		{ label: 'a fraction', value: 1.5, expected: false },
		{ label: 'NaN', value: Number.NaN, expected: false },
		{ label: 'positive infinity', value: Number.POSITIVE_INFINITY, expected: false },
		{ label: 'negative infinity', value: Number.NEGATIVE_INFINITY, expected: false },
		{ label: 'a bigint', value: 1n, expected: false },
		{ label: 'a boxed string', value: Object('request-1'), expected: false },
		{ label: 'a boxed number', value: Object(1), expected: false },
		{ label: 'a boolean', value: true, expected: false },
		{ label: 'a record', value: { id: 1 }, expected: false },
		{ label: 'an array', value: [1], expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCId(value)).toBe(expected)
	})
})

describe('isJSONRPCError', () => {
	it('accepts an integer code with a string message and any data payload', () => {
		expect(isJSONRPCError({ code: -32602, message: 'Invalid params' })).toBe(true)
		expect(isJSONRPCError({ code: 0, message: '', data: { any: ['shape'] } })).toBe(true)
		expect(isJSONRPCError({ code: 1, message: 'x', data: () => undefined })).toBe(true)
	})

	it('refuses a non-integer code, a non-string message, and every malformed value', () => {
		expect(isJSONRPCError({ code: -32602.5, message: 'x' })).toBe(false)
		expect(isJSONRPCError({ code: Number.NaN, message: 'x' })).toBe(false)
		expect(isJSONRPCError({ code: '-32602', message: 'x' })).toBe(false)
		expect(isJSONRPCError({ code: -32602 })).toBe(false)
		expect(isJSONRPCError({ message: 'x' })).toBe(false)
		for (const value of MALFORMED) expect(isJSONRPCError(value)).toBe(false)
	})

	it('agrees with the envelope guard that routes through it', () => {
		const error = { code: -32700, message: 'Parse error' }

		expect(isJSONRPCErrorResponse({ jsonrpc: '2.0', id: null, error })).toBe(isJSONRPCError(error))
		expect(
			isJSONRPCErrorResponse({ jsonrpc: '2.0', id: null, error: { code: 1.5, message: 'x' } }),
		).toBe(false)
	})

	it.each([
		{ label: 'a code and a message', value: { ...ERROR }, expected: true },
		{ label: 'a data member', value: { ...ERROR, data: { line: 1 } }, expected: true },
		{ label: 'an undefined data member', value: { ...ERROR, data: undefined }, expected: true },
		{ label: 'a NaN data member', value: { ...ERROR, data: Number.NaN }, expected: true },
		{ label: 'an extra member', value: { ...ERROR, detail: 'x' }, expected: true },
		{
			label: 'a null-prototype record',
			value: Object.assign(Object.create(null), ERROR),
			expected: true,
		},
		{ label: 'a missing code', value: { message: 'x' }, expected: false },
		{ label: 'a fractional code', value: { code: 1.5, message: 'x' }, expected: false },
		{
			label: 'an infinite code',
			value: { code: Number.NEGATIVE_INFINITY, message: 'x' },
			expected: false,
		},
		{ label: 'a string code', value: { code: '-32700', message: 'x' }, expected: false },
		{ label: 'a missing message', value: { code: -32700 }, expected: false },
		{ label: 'a numeric message', value: { code: -32700, message: 1 }, expected: false },
		{ label: 'an array', value: [-32700, 'Parse error'], expected: false },
		{ label: 'a string', value: 'Parse error', expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCError(value)).toBe(expected)
	})
})

describe('isJSONRPCRequest', () => {
	it('accepts a request with a numeric id', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id: 1 })).toBe(true)
	})

	it('accepts a request with a string id', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id: 'abc' })).toBe(true)
	})

	it('rejects a notification, which is a distinct arm rather than an id-less request', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(false)
	})

	it('accepts a request with a params record', () => {
		expect(
			isJSONRPCRequest({ jsonrpc: '2.0', method: 'tools/call', id: 1, params: { a: 1 } }),
		).toBe(true)
	})

	it('rejects a wrong jsonrpc version', () => {
		expect(isJSONRPCRequest({ jsonrpc: '1.0', method: 'ping', id: 1 })).toBe(false)
	})

	it('rejects a missing method', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1 })).toBe(false)
	})

	it('rejects a non-string method', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 42, id: 1 })).toBe(false)
	})

	it('rejects a null id (valid only on an error response)', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id: null })).toBe(false)
	})

	it('rejects by-position params', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id: 1, params: [1, 2] })).toBe(false)
	})

	it('is total on malformed input (null, primitives, arrays)', () => {
		for (const value of [null, undefined, 42, 'x', [], [1], true]) {
			expect(isJSONRPCRequest(value)).toBe(false)
		}
		const accessor = Object.defineProperty({}, 'jsonrpc', {
			enumerable: true,
			get() {
				throw new Error('must not escape')
			},
		})
		expect(isJSONRPCRequest(accessor)).toBe(false)
		expect(isJSONRPCRequest(revoked.proxy)).toBe(false)
	})

	it('reads accessor and non-enumerable members structurally', () => {
		const accessor = Object.defineProperty({ jsonrpc: '2.0', id: 1 }, 'method', {
			enumerable: true,
			get: () => 'ping',
		})
		const hidden = Object.defineProperty({ jsonrpc: '2.0', id: 1 }, 'method', {
			enumerable: false,
			value: 'ping',
		})

		expect(isJSONRPCRequest(accessor)).toBe(true)
		expect(isJSONRPCRequest(hidden)).toBe(true)
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', params: undefined })).toBe(false)
		expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'ping', params: undefined })).toBe(
			false,
		)
		expect(
			isJSONRPCRequest({
				jsonrpc: '2.0',
				id: 1,
				method: 'ping',
				params: Object.defineProperty({}, 'hidden', { enumerable: false, value: true }),
			}),
		).toBe(true)
	})

	it('rejects fractional and non-finite numeric ids', () => {
		for (const id of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id })).toBe(false)
		}
	})

	it('rejects a request carrying an undefined params member', () => {
		expect(isJSONRPCRequest({ jsonrpc: '2.0', method: 'ping', id: 1, params: undefined })).toBe(
			false,
		)
	})

	it('types the request id as a JSON-RPC id', () => {
		expectTypeOf<JSONRPCRequest['id']>().toEqualTypeOf<JSONRPCId>()
	})

	it('keeps a request and a notification mutually unassignable', () => {
		expectTypeOf<JSONRPCRequest>().not.toExtend<JSONRPCNotification>()
		expectTypeOf<JSONRPCNotification>().not.toExtend<JSONRPCRequest>()
	})

	it.each([
		{ label: 'a numeric id', value: { ...REQUEST }, expected: true },
		{ label: 'a string id', value: { ...REQUEST, id: 'request-1' }, expected: true },
		{ label: 'an empty string id', value: { ...REQUEST, id: '' }, expected: true },
		{ label: 'a params record', value: { ...REQUEST, params: { rootUri: null } }, expected: true },
		{
			label: 'a null-prototype params record',
			value: { ...REQUEST, params: Object.create(null) },
			expected: true,
		},
		{ label: 'an extra member', value: { ...REQUEST, trace: 'off' }, expected: true },
		{ label: 'a cyclic extra member', value: cycle, expected: true },
		{ label: 'a missing version', value: { id: 1, method: 'initialize' }, expected: false },
		{ label: 'a numeric version', value: { ...REQUEST, jsonrpc: 2 }, expected: false },
		{ label: 'a missing id', value: { jsonrpc: '2.0', method: 'initialize' }, expected: false },
		{ label: 'a null id', value: { ...REQUEST, id: null }, expected: false },
		{ label: 'a fractional id', value: { ...REQUEST, id: 0.5 }, expected: false },
		{ label: 'a missing method', value: { jsonrpc: '2.0', id: 1 }, expected: false },
		{ label: 'a numeric method', value: { ...REQUEST, method: 1 }, expected: false },
		{ label: 'by-position params', value: { ...REQUEST, params: ['file:///'] }, expected: false },
		{ label: 'null params', value: { ...REQUEST, params: null }, expected: false },
		{ label: 'string params', value: { ...REQUEST, params: 'x' }, expected: false },
		{ label: 'undefined params', value: { ...REQUEST, params: undefined }, expected: false },
		{ label: 'a result member', value: { ...REQUEST, result: null }, expected: false },
		{
			label: 'an undefined result member',
			value: { ...REQUEST, result: undefined },
			expected: false,
		},
		{ label: 'an error member', value: { ...REQUEST, error: ERROR }, expected: false },
		{ label: 'an inherited request', value: { __proto__: { ...REQUEST } }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCRequest(value)).toBe(expected)
	})
})

describe('isJSONRPCNotification', () => {
	it('accepts an id-less call, with and without params', () => {
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(
			true,
		)
		expect(
			isJSONRPCNotification({ jsonrpc: '2.0', method: 'notifications/progress', params: { a: 1 } }),
		).toBe(true)
	})

	it('rejects a request, whatever the id is', () => {
		for (const id of ['abc', '', 0, -7, 1]) {
			expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'ping', id })).toBe(false)
		}
	})

	it('rejects an own id member even when its value is not a legal id', () => {
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'ping', id: null })).toBe(false)
	})

	it('rejects a wrong version, a non-string method, and by-position params', () => {
		expect(isJSONRPCNotification({ jsonrpc: '1.0', method: 'ping' })).toBe(false)
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 42 })).toBe(false)
		expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'ping', params: [1] })).toBe(false)
	})

	it('is total over the malformed corpus', () => {
		for (const value of MALFORMED) {
			expect(isJSONRPCNotification(value)).toBe(false)
		}
	})

	it.each([
		{ label: 'a method alone', value: { ...NOTIFICATION }, expected: true },
		{ label: 'a params record', value: { ...NOTIFICATION, params: {} }, expected: true },
		{ label: 'an extra member', value: { ...NOTIFICATION, trace: 'off' }, expected: true },
		{ label: 'a numeric id', value: { ...NOTIFICATION, id: 1 }, expected: false },
		{ label: 'a null id', value: { ...NOTIFICATION, id: null }, expected: false },
		{ label: 'an undefined id', value: { ...NOTIFICATION, id: undefined }, expected: false },
		{ label: 'a wrong version', value: { ...NOTIFICATION, jsonrpc: '1.0' }, expected: false },
		{ label: 'a missing method', value: { jsonrpc: '2.0' }, expected: false },
		{ label: 'by-position params', value: { ...NOTIFICATION, params: [] }, expected: false },
		{ label: 'undefined params', value: { ...NOTIFICATION, params: undefined }, expected: false },
		{ label: 'a result member', value: { ...NOTIFICATION, result: {} }, expected: false },
		{ label: 'an error member', value: { ...NOTIFICATION, error: ERROR }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCNotification(value)).toBe(expected)
	})
})

describe('isJSONRPCInvocation', () => {
	it('classifies every valid invocation as exactly one arm', () => {
		const request = { jsonrpc: '2.0', method: 'ping', id: 1 }
		const notification = { jsonrpc: '2.0', method: 'notifications/initialized' }

		expect(isJSONRPCInvocation(request)).toBe(true)
		expect(isJSONRPCInvocation(notification)).toBe(true)
		expect(isJSONRPCRequest(request)).toBe(true)
		expect(isJSONRPCNotification(request)).toBe(false)
		expect(isJSONRPCNotification(notification)).toBe(true)
		expect(isJSONRPCRequest(notification)).toBe(false)
	})

	it('never answers true for both invocation arms on any input', () => {
		const corpus: readonly unknown[] = [
			...MALFORMED,
			{ jsonrpc: '2.0', method: 'ping', id: 1 },
			{ jsonrpc: '2.0', method: 'ping', id: '' },
			{ jsonrpc: '2.0', method: 'ping' },
			{ jsonrpc: '2.0', method: 'ping', id: null },
			{ jsonrpc: '2.0', method: 'ping', id: 1.5 },
			{ jsonrpc: '2.0', method: 'ping', params: { a: 1 } },
			{ jsonrpc: '2.0', id: 1 },
		]
		const overlaps = corpus.filter(
			(value) => isJSONRPCRequest(value) && isJSONRPCNotification(value),
		).length

		expect(overlaps).toBe(0)
		// The control proves the counter registers an overlap: a request is both an invocation and a message.
		const control = corpus.filter(
			(value) => isJSONRPCInvocation(value) && isJSONRPCMessage(value),
		).length
		expect(control).toBe(4)
	})

	it.each([
		{ label: 'a request', value: { ...REQUEST }, expected: true },
		{ label: 'a notification', value: { ...NOTIFICATION }, expected: true },
		{ label: 'a result response', value: { ...RESULT }, expected: false },
		{ label: 'an error response', value: { ...FAILURE }, expected: false },
		{ label: 'a request with a null id', value: { ...REQUEST, id: null }, expected: false },
		{ label: 'a call with no method', value: { jsonrpc: '2.0', id: 1 }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCInvocation(value)).toBe(expected)
	})
})

describe('isJSONRPCResultResponse / isJSONRPCErrorResponse — mutual exclusivity', () => {
	it('requires an id on the result arm and admits null only on the error arm', () => {
		expectTypeOf<JSONRPCResultResponse['id']>().toEqualTypeOf<JSONRPCId>()
		expectTypeOf<JSONRPCErrorResponse['id']>().toEqualTypeOf<JSONRPCId | null>()
		expectTypeOf<JSONRPCResponse>().toEqualTypeOf<JSONRPCResultResponse | JSONRPCErrorResponse>()
	})

	it('forbids the opposite member on each arm', () => {
		expectTypeOf<JSONRPCResultResponse['error']>().toEqualTypeOf<undefined>()
		expectTypeOf<JSONRPCErrorResponse['result']>().toEqualTypeOf<undefined>()
		expectTypeOf<JSONRPCResultResponse>().not.toExtend<JSONRPCErrorResponse>()
		expectTypeOf<JSONRPCErrorResponse>().not.toExtend<JSONRPCResultResponse>()
	})

	it('types the result member as unknown', () => {
		expectTypeOf<JSONRPCResultResponse['result']>().toEqualTypeOf<unknown>()
	})

	it('composes the message from the invocation and response halves', () => {
		expectTypeOf<JSONRPCInvocation>().toEqualTypeOf<JSONRPCRequest | JSONRPCNotification>()
		expectTypeOf<JSONRPCMessage>().toEqualTypeOf<JSONRPCInvocation | JSONRPCResponse>()
		expectTypeOf<JSONRPCNotification['id']>().toEqualTypeOf<undefined>()
	})

	it('never answers true for both arms on any input', () => {
		const corpus: readonly unknown[] = [
			...MALFORMED,
			{ jsonrpc: '2.0', id: 1, result: { resultType: 'complete' } },
			{ jsonrpc: '2.0', id: 1, result: {} },
			{ jsonrpc: '2.0', id: 1, error: { code: -1, message: 'x' } },
			{ jsonrpc: '2.0', error: { code: -1, message: 'x' } },
			{ jsonrpc: '2.0', id: 1, result: {}, error: { code: -1, message: 'x' } },
			{ jsonrpc: '2.0', id: 1 },
			{ jsonrpc: '2.0', id: null, error: { code: -1, message: 'x' } },
		]
		const overlaps = corpus.filter(
			(value) => isJSONRPCResultResponse(value) && isJSONRPCErrorResponse(value),
		).length

		expect(overlaps).toBe(0)
	})

	it('requires an id on both arms and admits null only on the error arm', () => {
		expect(isJSONRPCResultResponse({ jsonrpc: '2.0', result: {} })).toBe(false)
		expect(isJSONRPCResultResponse({ jsonrpc: '2.0', id: null, result: {} })).toBe(false)
		expect(isJSONRPCErrorResponse({ jsonrpc: '2.0', error: { code: -1, message: 'x' } })).toBe(
			false,
		)
		expect(
			isJSONRPCErrorResponse({ jsonrpc: '2.0', id: null, error: { code: -1, message: 'x' } }),
		).toBe(true)
	})

	it('rejects an invocation as either arm, and is total over the malformed corpus', () => {
		expect(isJSONRPCResultResponse({ jsonrpc: '2.0', method: 'ping', id: 1 })).toBe(false)
		expect(isJSONRPCErrorResponse({ jsonrpc: '2.0', method: 'ping', id: 1 })).toBe(false)
		for (const value of MALFORMED) {
			expect(isJSONRPCResultResponse(value)).toBe(false)
			expect(isJSONRPCErrorResponse(value)).toBe(false)
		}
	})
})

describe('isJSONRPCResultResponse', () => {
	it.each([
		{ label: 'a record result', value: { ...RESULT }, expected: true },
		{ label: 'a null result', value: { ...RESULT, result: null }, expected: true },
		{
			label: 'an undefined result member',
			value: { ...RESULT, result: undefined },
			expected: false,
		},
		{ label: 'a primitive result', value: { ...RESULT, result: 5 }, expected: true },
		{ label: 'an array result', value: { ...RESULT, result: [] }, expected: true },
		{ label: 'a string id', value: { ...RESULT, id: 'request-1' }, expected: true },
		{ label: 'an extra member', value: { ...RESULT, params: {} }, expected: true },
		{ label: 'a missing result', value: { jsonrpc: '2.0', id: 1 }, expected: false },
		{ label: 'a missing id', value: { jsonrpc: '2.0', result: null }, expected: false },
		{ label: 'a null id', value: { ...RESULT, id: null }, expected: false },
		{ label: 'a fractional id', value: { ...RESULT, id: 1.5 }, expected: false },
		{ label: 'a wrong version', value: { ...RESULT, jsonrpc: '1.0' }, expected: false },
		{ label: 'an error member', value: { ...RESULT, error: ERROR }, expected: false },
		{ label: 'an undefined error member', value: { ...RESULT, error: undefined }, expected: false },
		{ label: 'a method member', value: { ...RESULT, method: 'initialize' }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCResultResponse(value)).toBe(expected)
	})
})

describe('isJSONRPCErrorResponse', () => {
	it.each([
		{ label: 'a numeric id', value: { ...FAILURE }, expected: true },
		{ label: 'a string id', value: { ...FAILURE, id: 'request-1' }, expected: true },
		{ label: 'a null id', value: { ...UNREADABLE }, expected: true },
		{
			label: 'an error with data',
			value: { ...UNREADABLE, error: { ...ERROR, data: 1 } },
			expected: true,
		},
		{ label: 'an extra member', value: { ...FAILURE, params: {} }, expected: true },
		{ label: 'a missing id', value: { jsonrpc: '2.0', error: ERROR }, expected: false },
		{ label: 'an undefined id', value: { ...FAILURE, id: undefined }, expected: false },
		{ label: 'a fractional id', value: { ...FAILURE, id: 1.5 }, expected: false },
		{ label: 'a wrong version', value: { ...FAILURE, jsonrpc: '1.0' }, expected: false },
		{ label: 'a missing error', value: { jsonrpc: '2.0', id: null }, expected: false },
		{ label: 'a string error', value: { ...FAILURE, error: 'failed' }, expected: false },
		{
			label: 'a fractional code',
			value: { ...FAILURE, error: { code: 0.5, message: 'x' } },
			expected: false,
		},
		{ label: 'a result member', value: { ...FAILURE, result: null }, expected: false },
		{
			label: 'an undefined result member',
			value: { ...FAILURE, result: undefined },
			expected: false,
		},
		{ label: 'a method member', value: { ...UNREADABLE, method: 'initialize' }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCErrorResponse(value)).toBe(expected)
	})
})

describe('isJSONRPCResponse', () => {
	it('accepts a success response with a result', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, result: { ok: true } })).toBe(true)
	})

	it('accepts any result value and a null id on the error arm alone', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: null, result: null })).toBe(false)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, result: null })).toBe(true)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, result: 5 })).toBe(true)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: null, error: { code: -1, message: 'x' } })).toBe(
			true,
		)
	})

	it('rejects an error response whose id member is absent', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', error: { code: -32_700, message: 'Parse' } })).toBe(
			false,
		)
	})

	it('accepts an error response', () => {
		expect(
			isJSONRPCResponse({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Invalid' } }),
		).toBe(true)
	})

	it('rejects a response carrying BOTH result and error', () => {
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				result: {},
				error: { code: -1, message: 'x' },
			}),
		).toBe(false)
	})

	it('rejects a response carrying NEITHER result nor error', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1 })).toBe(false)
	})

	it('rejects an error object missing a numeric code', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, error: { message: 'x' } })).toBe(false)
	})

	it('rejects a notification as a response', () => {
		expect(isJSONRPCResponse({ jsonrpc: '2.0', method: 'ping' })).toBe(false)
	})

	it('is total on malformed input', () => {
		for (const value of [null, undefined, 0, 'x', [], true]) {
			expect(isJSONRPCResponse(value)).toBe(false)
		}
		const accessor = Object.defineProperty({}, 'jsonrpc', {
			enumerable: true,
			get() {
				throw new Error('must not escape')
			},
		})
		expect(isJSONRPCResponse(accessor)).toBe(false)
		expect(isJSONRPCResponse(revoked.proxy)).toBe(false)
	})

	it('reads accessor and non-enumerable response members structurally', () => {
		const accessor = Object.defineProperty({ jsonrpc: '2.0', id: 1 }, 'result', {
			enumerable: true,
			get: () => ({ ok: true }),
		})
		const hidden = Object.defineProperty({ jsonrpc: '2.0', id: 1 }, 'result', {
			enumerable: false,
			value: { ok: true },
		})

		expect(isJSONRPCResponse(accessor)).toBe(true)
		expect(isJSONRPCResponse(hidden)).toBe(true)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				result: Object.defineProperty({}, 'hidden', { enumerable: false, value: true }),
			}),
		).toBe(true)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				error: {
					code: -32_600,
					message: 'bad',
					data: Object.defineProperty({}, 'value', { enumerable: true, get: () => true }),
				},
			}),
		).toBe(true)
	})

	it('rejects fractional/non-finite ids and malformed error populations', () => {
		for (const id of [1.5, Number.NaN, Number.NEGATIVE_INFINITY]) {
			expect(isJSONRPCResponse({ jsonrpc: '2.0', id, result: {} })).toBe(false)
		}
		for (const code of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(
				isJSONRPCResponse({ jsonrpc: '2.0', id: 1, error: { code, message: 'invalid' } }),
			).toBe(false)
		}
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, error: undefined })).toBe(false)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				error: { code: -32_600, message: 'bad', data: undefined },
			}),
		).toBe(true)
		expect(isJSONRPCResponse({ jsonrpc: '2.0', id: 1, result: {}, error: undefined })).toBe(false)
		expect(
			isJSONRPCResponse({
				jsonrpc: '2.0',
				id: 1,
				error: { code: -32_600, message: 'bad', data: Number.NaN },
			}),
		).toBe(true)
	})

	it.each([
		{ label: 'a result response', value: { ...RESULT }, expected: true },
		{ label: 'an error response', value: { ...FAILURE }, expected: true },
		{ label: 'an unreadable-id error response', value: { ...UNREADABLE }, expected: true },
		{ label: 'a request', value: { ...REQUEST }, expected: false },
		{ label: 'a notification', value: { ...NOTIFICATION }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCResponse(value)).toBe(expected)
	})
})

describe('isJSONRPCMessage', () => {
	it.each([
		{ label: 'a request', value: { ...REQUEST }, expected: true },
		{ label: 'a notification', value: { ...NOTIFICATION }, expected: true },
		{ label: 'a result response', value: { ...RESULT }, expected: true },
		{ label: 'an error response', value: { ...FAILURE }, expected: true },
		{ label: 'an unreadable-id error response', value: { ...UNREADABLE }, expected: true },
		{ label: 'a request carrying a result', value: { ...REQUEST, result: null }, expected: false },
		{
			label: 'a call with no method or outcome',
			value: { jsonrpc: '2.0', id: 1 },
			expected: false,
		},
		{ label: 'a wrong version', value: { ...REQUEST, jsonrpc: '1.0' }, expected: false },
	])('answers $expected for $label', ({ value, expected }) => {
		expect(isJSONRPCMessage(value)).toBe(expected)
	})

	it('refuses every malformed value', () => {
		for (const value of MALFORMED) expect(isJSONRPCMessage(value)).toBe(false)
	})

	it('refuses a record that carries no message member', () => {
		expect(isJSONRPCMessage({ hello: 'world' })).toBe(false)
	})
})

describe('message partition', () => {
	it('answers no arm for a value carrying both an invocation and a response discriminant', () => {
		const hybrids: readonly unknown[] = [
			{ jsonrpc: '2.0', id: 1, method: 'initialize', result: null },
			{ jsonrpc: '2.0', id: 1, method: 'initialize', result: undefined },
			{ jsonrpc: '2.0', id: 1, method: 'initialize', error: ERROR },
			{ jsonrpc: '2.0', id: null, method: 'initialize', error: ERROR },
			{ jsonrpc: '2.0', method: 'initialized', result: {} },
			{ jsonrpc: '2.0', method: 'initialized', error: ERROR },
			{ jsonrpc: '2.0', id: 1, method: 'initialize', result: null, error: ERROR },
			{ jsonrpc: '2.0', id: 1, result: null, error: ERROR },
		]

		for (const value of hybrids) {
			expect([
				isJSONRPCRequest(value),
				isJSONRPCNotification(value),
				isJSONRPCResultResponse(value),
				isJSONRPCErrorResponse(value),
				isJSONRPCMessage(value),
			]).toStrictEqual([false, false, false, false, false])
		}
	})

	it('answers exactly one arm for every valid message', () => {
		const messages: readonly unknown[] = [REQUEST, NOTIFICATION, RESULT, FAILURE, UNREADABLE, cycle]
		const arms = messages.map(
			(value) =>
				[
					isJSONRPCRequest(value),
					isJSONRPCNotification(value),
					isJSONRPCResultResponse(value),
					isJSONRPCErrorResponse(value),
				].filter(Boolean).length,
		)

		expect(arms).toStrictEqual([1, 1, 1, 1, 1, 1])
		expect(messages.every((value) => isJSONRPCMessage(value))).toBe(true)
	})
})

describe('guard totality', () => {
	it('sweeps every guard the barrel exports', () => {
		expect(Object.keys(GUARDS).toSorted()).toStrictEqual(
			Object.keys(entry)
				.filter((name) => name.startsWith('is'))
				.toSorted(),
		)
	})

	it.each(Object.entries(GUARDS))('%s answers a boolean for every malformed value', (_, guard) => {
		for (const value of MALFORMED) expect(typeof guard(value)).toBe('boolean')
	})

	it.each(BASES)('answers without throwing when a member of $label throws', ({ base }) => {
		for (const key of Object.keys(base)) {
			const value = Object.defineProperty({ ...base }, key, {
				enumerable: true,
				get() {
					throw new Error('must not escape')
				},
			})
			const accepted = Object.entries(GUARDS)
				.filter(([, guard]) => guard(value))
				.map(([name]) => name)
			expect({ key, accepted }).toStrictEqual({ key, accepted: [] })
		}
	})

	it('refuses a proxy whose has trap throws', () => {
		const proxy = new Proxy(
			{ ...REQUEST },
			{
				has() {
					throw new Error('must not escape')
				},
			},
		)
		for (const guard of Object.values(GUARDS)) expect(guard(proxy)).toBe(false)
	})

	it('accepts a transparent proxy over a plain record as its target would be accepted', () => {
		const proxies = [REQUEST, NOTIFICATION, RESULT, FAILURE, UNREADABLE].map(
			(target) => new Proxy({ ...target }, {}),
		)

		expect(proxies.map((value) => isJSONRPCMessage(value))).toStrictEqual([
			true,
			true,
			true,
			true,
			true,
		])
		expect(isJSONRPCRequest(proxies[0])).toBe(true)
		expect(isJSONRPCNotification(proxies[1])).toBe(true)
		expect(isJSONRPCResultResponse(proxies[2])).toBe(true)
		expect(isJSONRPCErrorResponse(proxies[4])).toBe(true)
		expect(isJSONRPCError(new Proxy({ ...ERROR }, {}))).toBe(true)
	})
})
