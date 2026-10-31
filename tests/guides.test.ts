// The consumer-side guides-parity drop-in: runs `@orkestrel/guide`'s checks against
// this repo's own `guides/README.md` manifest. The constants that follow are this
// package's own, as is the executed section that closes the file.

import { GuideCommand } from '@orkestrel/guide/server'
import { readInventory } from '@orkestrel/test/server'
import { createVitest } from 'vitest/node'

/** Every fence language this package's guides are allowed to use. */
const FENCE_LANGUAGES = Object.freeze(['ts'])
/** The fence language whose blocks count as worked examples. */
const EXAMPLE_LANGUAGE = 'ts'
/** The package identity that binds its manifest, module map, and README pitch. */
const PACKAGE_NAME = '@orkestrel/jsonrpc'
/** The one guide this package sources, whose tagline the README pitch equals. */
const GUIDE_SPEC = 'guides/jsonrpc.md'
/** Each import specifier this package's own guides may resolve against. */
const MODULES = Object.freeze({
	[PACKAGE_NAME]: 'src/core',
	'@src/core': 'src/core',
})

await new GuideCommand({
	root: new URL('../', import.meta.url),
	patterns: ['src/**/*.ts', 'tests/**/*.ts', 'guides/*.md', '*.md', 'package.json'],
	modules: MODULES,
	languages: FENCE_LANGUAGES,
	language: EXAMPLE_LANGUAGE,
	reader: readInventory,
	runner: createVitest,
}).execute(async ({ files, report, rows }) => {
	const { isRecord, parseJSON } = await import('@orkestrel/contract')
	const { findMissingSymbols } = await import('@orkestrel/guide')
	const { requireValue } = await import('@orkestrel/test')
	const {
		buildJSONRPCError,
		buildJSONRPCResult,
		isJSONRPCError,
		isJSONRPCErrorResponse,
		isJSONRPCId,
		isJSONRPCInvocation,
		isJSONRPCMessage,
		isJSONRPCNotification,
		isJSONRPCRequest,
		isJSONRPCResponse,
		isJSONRPCResultResponse,
		JSONRPC_PARSE_ERROR,
	} = await import('@src/core')
	const { describe, expect, it } = await import('vitest')
	const own = requireValue(
		rows.find((row) => row.entry.spec === GUIDE_SPEC),
		`Missing manifest row: ${GUIDE_SPEC}`,
	)
	const manifest = parseJSON(requireValue(files['package.json'], 'Missing inventory: package.json'))
	if (!isRecord(manifest)) throw new Error('Invalid package manifest: package.json')
	const text = requireValue(files[GUIDE_SPEC], `Missing file: ${GUIDE_SPEC}`).replace(/\s+/g, ' ')

	it('manifest lists at least one guide', () => {
		expect(report.input).toEqual([])
		expect(rows.length).toBeGreaterThan(0)
		expect(own.entry.spec).toBe(GUIDE_SPEC)
	})

	// `findDrift` compares no example pair when neither side carries a title, so this pins the
	// population the package's own guide contributes.
	it('pairs at least one example title across the guide and the source', () => {
		expect(report.examples.titles.filter((finding) => finding.spec === GUIDE_SPEC)).toEqual([])
	})

	it('opens the README with the guide tagline', () => {
		expect(manifest.name).toBe(PACKAGE_NAME)
		expect(report.pitch).toEqual([])
	})

	for (const { entry, guide, source } of rows) {
		describe(`${entry.concept}`, () => {
			it('uses only listed fence languages', () => {
				expect(report.fences.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('extracts a non-empty documented surface', () => {
				expect(guide.surface().length).toBeGreaterThan(0)
			})
			it('re-exports every direct declaration', () => {
				expect(findMissingSymbols(source.exports(), source.surface())).toEqual([])
			})
			it('re-exports only direct declarations', () => {
				expect(findMissingSymbols(source.surface(), source.exports())).toEqual([])
			})
			it('documents every barrel export', () => {
				expect(findMissingSymbols(source.surface(), guide.surface())).toEqual([])
			})
			it('documents only real exports', () => {
				expect(findMissingSymbols(guide.surface(), source.surface())).toEqual([])
			})
			it('keeps behavioral interfaces and implementing classes in parity', () => {
				expect(report.methods.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('keeps every compared summary and example equal to its source', () => {
				expect(report.drift.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('documents an example for every Surface function', () => {
				expect(report.examples.functions.filter((finding) => finding.spec === entry.spec)).toEqual(
					[],
				)
			})
			it('documents an example for every method', () => {
				expect(report.examples.methods.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('imports only real exports in every ```ts fence', () => {
				expect(report.imports.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('resolves every relative link', () => {
				expect(report.links.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
			it('links only to test files that exist', () => {
				expect(report.tests.filter((finding) => finding.spec === entry.spec)).toEqual([])
			})
		})
	}

	// The executed half: each case runs a claim the guide states and asserts the value it names.
	describe('unreadable request id', () => {
		it('writes id null into the error envelope and the error guard accepts it', () => {
			const envelope = buildJSONRPCError(null, JSONRPC_PARSE_ERROR, 'Parse error')

			expect(JSON.stringify(envelope)).toBe(
				'{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}',
			)
			expect(isJSONRPCErrorResponse(envelope)).toBe(true)
			expect(
				isJSONRPCErrorResponse({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }),
			).toBe(false)
		})

		it('states that rule in the guide', () => {
			expect(text).toContain(
				"An error response always carries an `id` member, and the member holds `null` when the request's id could not be read.",
			)
		})
	})

	describe('flagship fences', () => {
		it('classifies the values the Classify a message fence names', () => {
			const hybrid: unknown = JSON.parse('{"jsonrpc":"2.0","id":1,"method":"ping","result":null}')

			expect(isJSONRPCMessage(hybrid)).toBe(false)
			expect(isJSONRPCInvocation({ jsonrpc: '2.0', method: 'initialized' })).toBe(true)
			expect(
				isJSONRPCResponse({
					jsonrpc: '2.0',
					id: null,
					error: { code: -32700, message: 'Parse error' },
				}),
			).toBe(true)
		})

		it('builds the envelopes the Answer a request fence names', () => {
			const value: unknown = JSON.parse('{"jsonrpc":"2.0","id":7,"method":"ping"}')

			expect(() => JSON.parse('{')).toThrow(SyntaxError)
			expect(buildJSONRPCError(null, JSONRPC_PARSE_ERROR, 'Parse error')).toStrictEqual({
				jsonrpc: '2.0',
				id: null,
				error: { code: -32700, message: 'Parse error' },
			})
			expect(isJSONRPCRequest(value) ? buildJSONRPCResult(value.id, 'pong') : value).toStrictEqual({
				jsonrpc: '2.0',
				id: 7,
				result: 'pong',
			})
		})

		it('answers each boundary the Validation fence names', () => {
			expect(isJSONRPCId(1.5)).toBe(false)
			expect(
				isJSONRPCError({ code: -32601, message: 'Method not found', data: { method: 'ping' } }),
			).toBe(true)
			expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'log', id: undefined })).toBe(false)
			expect(isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1, result: null })).toBe(true)
			expect(
				isJSONRPCErrorResponse({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }),
			).toBe(false)
		})

		it('admits a transparent proxy as the Validation section states', () => {
			expect(isJSONRPCRequest(new Proxy({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}))).toBe(true)
			expect(text).toContain(
				'an accessor or a `Proxy` with no traps passes when the members it yields pass',
			)
		})
	})

	describe('message partition', () => {
		it('refuses each member the partition sentence names', () => {
			const error = { code: -32700, message: 'Parse error' }

			expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'ping', result: null })).toBe(false)
			expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'log', error })).toBe(false)
			expect(isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1, result: null, method: 'ping' })).toBe(
				false,
			)
			expect(isJSONRPCErrorResponse({ jsonrpc: '2.0', id: 1, error, method: 'ping' })).toBe(false)
			expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'log', id: 1 })).toBe(false)
			expect(isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1, result: null, error })).toBe(false)
			expect(isJSONRPCErrorResponse({ jsonrpc: '2.0', id: 1, error, result: null })).toBe(false)
			expect(text).toContain(
				'the result-response guard refuses an `error` member, and the error-response guard refuses a `result` member.',
			)
		})

		it('places a value whose has and get traps disagree in two arms', () => {
			const target = {
				jsonrpc: '2.0',
				method: 'log',
				id: null,
				error: { code: -32700, message: 'Parse error' },
			}
			const proxy = new Proxy(target, { has: () => false })

			expect([isJSONRPCNotification(target), isJSONRPCErrorResponse(target)]).toStrictEqual([
				false,
				false,
			])
			expect([isJSONRPCNotification(proxy), isJSONRPCErrorResponse(proxy)]).toStrictEqual([
				true,
				true,
			])
			expect(text).toContain(
				'The guards partition every value whose presence checks and member reads agree.',
			)
			expect(text).toContain(
				'A `Proxy` whose `has` and `get` traps disagree can satisfy several arms: a `has` trap that denies every member lets one value pass as a notification and as an error response.',
			)
		})
	})

	describe('validation sentences', () => {
		it('accepts an id that is no record and refuses it on every other guard', () => {
			const others = [
				isJSONRPCError,
				isJSONRPCRequest,
				isJSONRPCNotification,
				isJSONRPCInvocation,
				isJSONRPCResultResponse,
				isJSONRPCErrorResponse,
				isJSONRPCResponse,
				isJSONRPCMessage,
			]

			expect([isJSONRPCId('request-1'), isJSONRPCId(7)]).toStrictEqual([true, true])
			for (const value of ['request-1', 7, null, []]) {
				expect(others.map((guard) => guard(value))).toStrictEqual(others.map(() => false))
			}
			expect(text).toContain(
				'`isJSONRPCId` accepts a string or a finite integer, and every other guard returns `false` for a value that is not a plain record.',
			)
		})

		it('fails a value on a throwing member it reads and passes one on data or an extra member', () => {
			expect(
				isJSONRPCResultResponse(
					Object.defineProperty({ jsonrpc: '2.0', id: 1 }, 'result', {
						enumerable: true,
						get() {
							throw new Error('unreadable')
						},
					}),
				),
			).toBe(false)
			expect(
				isJSONRPCRequest(
					Object.defineProperty({ id: 1, method: 'ping' }, 'jsonrpc', {
						enumerable: true,
						get() {
							throw new Error('unreadable')
						},
					}),
				),
			).toBe(false)
			expect(
				isJSONRPCErrorResponse({
					jsonrpc: '2.0',
					id: 1,
					error: Object.defineProperty({ code: -32603, message: 'Internal error' }, 'data', {
						enumerable: true,
						get() {
							throw new Error('unreadable')
						},
					}),
				}),
			).toBe(true)
			expect(
				isJSONRPCRequest(
					Object.defineProperty({ jsonrpc: '2.0', id: 1, method: 'ping' }, 'trace', {
						enumerable: true,
						get() {
							throw new Error('unreadable')
						},
					}),
				),
			).toBe(true)
			expect(text).toContain(
				'A member that throws on read fails the value, except a `data` member and a member the contract does not name: no guard reads either, so a throwing accessor there passes.',
			)
		})

		it('refuses an undefined result, which JSON cannot carry', () => {
			expect(isJSONRPCResultResponse({ jsonrpc: '2.0', id: 1, result: undefined })).toBe(false)
			expect(text).toContain('a `result` member holding any value but `undefined`')
		})

		it('builds a result envelope without checking its id or its result', () => {
			const envelope = buildJSONRPCResult(1.5, undefined)

			expect(envelope).toStrictEqual({ jsonrpc: '2.0', id: 1.5, result: undefined })
			expect(isJSONRPCResultResponse(envelope)).toBe(false)
			expect(text).toContain(
				'The id must be an integer or a string and the result a JSON value, and the builder checks neither.',
			)
		})
	})

	describe('by-name params', () => {
		it('refuses by-position params on a request and a notification', () => {
			expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'sum', params: [1, 2] })).toBe(false)
			expect(isJSONRPCNotification({ jsonrpc: '2.0', method: 'log', params: ['ready'] })).toBe(
				false,
			)
			expect(isJSONRPCRequest({ jsonrpc: '2.0', id: 1, method: 'sum', params: { a: 1 } })).toBe(
				true,
			)
		})

		it('states that limit in the guide', () => {
			expect(text).toContain(
				'The package carries parameters by name only: a present `params` member is a record, and the guards refuse a by-position array.',
			)
		})
	})
})
