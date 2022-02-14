import * as assert from 'node:assert';
import { readable, writable, derived } from './index';

describe('store', () => {
	describe('writable', () => {
		it('is touchable', () => {
			const count = writable(0);
			const values = [];
			let n = 0;

			const unsubscribe = count.subscribe((value) => {
				values.push([n++, value]);
			});

			count.touch();
			count.set(1);
			count.touch();
			count.update((n) => n + 1);
			count.touch();

			unsubscribe();

			count.touch();
			count.set(3);
			count.touch();
			count.update((n) => n + 1);
			count.touch();

			assert.deepEqual(values, [
				[0, 0],
				[1, 0],
				[2, 1],
				[3, 1],
				[4, 2],
				[5, 2],
			]);
		});
	});

	describe('readable', () => {
		it('is touchable', () => {
			const store = readable(0);
			let called = 0;

			const unsubscribe = store.subscribe(() => {
				called += 1;
			});

			assert.equal(called, 1);

			store.touch();
			assert.equal(called, 2);

			store.touch();
			assert.equal(called, 3);

			unsubscribe();

			store.touch();
			assert.equal(called, 3);
		});
	});

	describe('derived', () => {
		it('is touchable', () => {
			const a = readable(1);
			let called = 0;

			const b = derived(a, (n: number) => {
				called += 1;
				return n * 2;
			});

			const values = [];

			const unsubscribe = b.subscribe((value) => {
				values.push(value);
			});

			assert.equal(called, 1);
			assert.deepEqual(values, [2]);

			a.touch();
			assert.equal(called, 2);
			assert.deepEqual(values, [2]);

			a.touch();
			assert.equal(called, 3);
			assert.deepEqual(values, [2]);

			unsubscribe();

			a.touch();
			assert.equal(called, 3);
			assert.deepEqual(values, [2]);
		});

		it('maps multiple stores', () => {
			const a = readable(2);
			const b = readable(3);
			let called = 0;

			const c = derived([a, b], ([a, b]) => {
				called += 1;
				return [a, b];
			});

			const values = [];

			const unsubscribe = c.subscribe((value) => {
				values.push(value);
			});

			assert.equal(called, 1);
			assert.deepEqual(values, [[2, 3]]);

			a.touch();
			assert.equal(called, 2);
			assert.deepEqual(values, [
				[2, 3],
				[2, 3],
			]);

			b.touch();
			assert.equal(called, 3);
			assert.deepEqual(values, [
				[2, 3],
				[2, 3],
				[2, 3],
			]);

			unsubscribe();

			a.touch();
			b.touch();
			assert.equal(called, 3);
			assert.deepEqual(values, [
				[2, 3],
				[2, 3],
				[2, 3],
			]);
		});

		it('prevents diamond dependency problem', () => {
			const count = writable(0);
			const values = [];

			const a = derived(count, ($count) => {
				return { a: $count };
			});

			const b = derived(count, ($count) => {
				return { b: $count };
			});

			const combined = derived([a, b], ([a, b]) => {
				return { ...a, ...b };
			});

			const unsubscribe = combined.subscribe((v) => {
				values.push(v);
			});

			assert.deepEqual(values, [{ a: 0, b: 0 }]);

			count.touch();
			assert.deepEqual(values, [
				{ a: 0, b: 0 },
				{ a: 0, b: 0 },
			]);

			count.set(1);
			assert.deepEqual(values, [
				{ a: 0, b: 0 },
				{ a: 0, b: 0 },
				{ a: 1, b: 1 },
			]);

			count.touch();
			assert.deepEqual(values, [
				{ a: 0, b: 0 },
				{ a: 0, b: 0 },
				{ a: 1, b: 1 },
				{ a: 1, b: 1 },
			]);

			unsubscribe();

			count.touch();
			assert.deepEqual(values, [
				{ a: 0, b: 0 },
				{ a: 0, b: 0 },
				{ a: 1, b: 1 },
				{ a: 1, b: 1 },
			]);
		});
	});
});
