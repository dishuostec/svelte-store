import * as assert from 'node:assert';
import { get } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { create_readable } from '../core/readable';
import { derived, writable } from '../';
import { record } from './record';

describe('store', () => {
	const fake_observable = {
		subscribe(fn) {
			fn(42);
			return {
				unsubscribe: () => {},
			};
		},
	} as unknown as Readable<42>;

	describe('record', () => {
		it('has same name of properties with value is store', () => {
			function is_readable(value: any): value is Readable<any> {
				if (value == null) {
					return false;
				}

				return (
					typeof value === 'object' && 'subscribe' in value && typeof value.subscribe === 'function'
				);
			}

			const store = record({
				number: 0,
				string: 'a',
				object: {},
				readable: create_readable(),
				null: null,
				undefined: undefined,
			});

			assert.ok(is_readable(store));
			assert.ok(is_readable(store.number));
			assert.ok(is_readable(store.string));
			assert.ok(is_readable(store.object));
			assert.ok(is_readable(store.readable));
			assert.ok(is_readable(store.null));
			assert.ok(is_readable(store.undefined));
		});

		it('use score properties', () => {
			const store = record({ foo: 0, bar: 'a' });

			const values = [];

			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			assert.deepEqual(values, [{ foo: 0, bar: 'a' }]);

			store.foo.set(1);
			assert.deepEqual(values, [
				{ foo: 0, bar: 'a' },
				{ foo: 1, bar: 'a' },
			]);

			store.bar.set('b');
			assert.deepEqual(values, [
				{ foo: 0, bar: 'a' },
				{ foo: 1, bar: 'a' },
				{ foo: 1, bar: 'b' },
			]);

			unsubscribe();

			store.foo.set(2);
			store.bar.set('c');
			assert.deepEqual(values, [
				{ foo: 0, bar: 'a' },
				{ foo: 1, bar: 'a' },
				{ foo: 1, bar: 'b' },
			]);
		});

		it('maps a single store', () => {
			const b = record({ n: 1 }, ({ n }) => n * 2);

			const values = [];

			const unsubscribe = b.subscribe((value) => {
				values.push(value);
			});

			b.n.set(2);
			assert.deepEqual(values, [2, 4]);

			unsubscribe();

			b.n.set(3);
			assert.deepEqual(values, [2, 4]);
		});

		it('maps multiple stores', () => {
			const b = writable(3);
			const c = record({ a: 2, b }, ({ a, b }) => a * b);

			const values = [];

			const unsubscribe = c.subscribe((value) => {
				values.push(value);
			});

			c.a.set(4);
			b.set(5);
			assert.deepEqual(values, [6, 12, 20]);

			unsubscribe();

			c.a.set(6);
			assert.deepEqual(values, [6, 12, 20]);
		});

		it('passes optional set function', () => {
			const evens = record(
				{ n: 1 },
				({ n }, set) => {
					if (n % 2 === 0) set(n);
				},
				0,
			);

			const values = [];

			const unsubscribe = evens.subscribe((value) => {
				values.push(value);
			});

			evens.n.set(2);
			evens.n.set(3);
			evens.n.set(4);
			evens.n.set(5);
			assert.deepEqual(values, [0, 2, 4]);

			unsubscribe();

			evens.n.set(6);
			evens.n.set(7);
			evens.n.set(8);
			assert.deepEqual(values, [0, 2, 4]);
		});

		it('prevents glitches', () => {
			const lastname = writable('Jekyll');
			const firstname = derived(lastname, (n) => (n === 'Jekyll' ? 'Henry' : 'Edward'));

			const fullname = record(
				{ firstname, lastname },
				({ firstname, lastname }) => `${firstname} ${lastname}`,
			);

			const values = [];

			const unsubscribe = fullname.subscribe((value) => {
				values.push(value);
			});

			lastname.set('Hyde');

			assert.deepEqual(values, ['Henry Jekyll', 'Edward Hyde']);

			unsubscribe();
		});

		it('prevents diamond dependency problem stec', () => {
			const count = writable(0);
			const values = [];
			const changed = [];

			const a = record({ a: count }, (value, set) => {
				// return value;
				set(value);
			});

			const b = record({ b: count }, (value, set) => {
				// return value;
				set(value);
			});

			const combined = record({ foo: a, bar: b }, ({ foo, bar }, set, _update, changed_key) => {
				changed.push(changed_key);
				set({ foo, bar });
			});

			const unsubscribe = combined.subscribe((v) => {
				values.push(v);
			});

			assert.deepEqual(values, [{ foo: { a: 0 }, bar: { b: 0 } }]);
			assert.deepEqual(changed, [undefined]);

			count.set(1);
			assert.deepEqual(values, [
				{ foo: { a: 0 }, bar: { b: 0 } },
				{ foo: { a: 1 }, bar: { b: 1 } },
			]);
			assert.deepEqual(changed, [undefined, { foo: true, bar: true }]);

			unsubscribe();
		});

		it('derived dependency does not update and shared ancestor updates', () => {
			const root = writable({ a: 0, b: 0 });
			const values = [];

			const a = derived(root, ($root) => {
				return 'a' + $root.a;
			});

			const b = record({ a, root }, ({ a, root }) => {
				return 'b' + root.b + a;
			});

			const unsubscribe = b.subscribe((v) => {
				values.push(v);
			});

			assert.deepEqual(values, ['b0a0']);

			root.set({ a: 0, b: 1 });
			assert.deepEqual(values, ['b0a0', 'b1a0']);

			unsubscribe();
		});

		it('is NOT updated with deep equal logic', () => {
			const arr = [0];

			const numbers = record({ number: 1 }, (v) => {
				arr[0] = v.number;
				return arr;
			});

			const concatenated = [];

			const unsubscribe = numbers.subscribe((value) => {
				concatenated.push(...value);
			});

			numbers.number.set(2);
			numbers.number.set(3);

			assert.deepEqual(concatenated, [1]);

			unsubscribe();
		});

		it('is updated with deep equal logic', () => {
			const arr = [0];

			const numbers = record({ number: 1 }, (v) => {
				arr[0] = v.number;
				return arr.slice(); // important
			});

			const concatenated = [];

			const unsubscribe = numbers.subscribe((value) => {
				concatenated.push(...value);
			});

			numbers.number.set(2);
			numbers.number.set(3);

			assert.deepEqual(concatenated, [1, 2, 3]);

			unsubscribe();
		});

		it('calls a cleanup function', () => {
			const values = [];
			const cleaned_up = [];

			const d = record({ num: 1 }, ({ num }, set) => {
				set(num * 2);

				return function cleanup() {
					cleaned_up.push(num);
				};
			});

			d.num.set(2);

			const unsubscribe = d.subscribe((value) => {
				values.push(value);
			});

			d.num.set(3);
			d.num.set(4);

			assert.deepEqual(values, [4, 6, 8]);
			assert.deepEqual(cleaned_up, [2, 3]);

			unsubscribe();

			assert.deepEqual(cleaned_up, [2, 3, 4]);
		});

		it('discards non-function return values', () => {
			const num = writable(1);

			const values = [];

			const d = record({ num }, (v, set) => {
				set(v.num * 2);
				return {} as any;
			});

			num.set(2);

			const unsubscribe = d.subscribe((value) => {
				values.push(value);
			});

			num.set(3);
			num.set(4);

			assert.deepEqual(values, [4, 6, 8]);

			unsubscribe();
		});

		it('allows derived with different types', () => {
			const a = writable('one');
			const b = writable(1);
			const c = record({ a, b }, ({ a, b }) => `${a} ${b}`);

			assert.deepEqual(get(c), 'one 1');

			a.set('two');
			b.set(2);
			assert.deepEqual(get(c), 'two 2');
		});

		it('works with RxJS-style observables', () => {
			const d = record({ fake_observable }, (_) => _);
			assert.deepEqual(get(d), { fake_observable: 42 });
		});
	});
});
