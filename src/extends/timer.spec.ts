import * as assert from 'node:assert';
import { stopwatch, countdown } from './timer';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms, undefined));

describe('store', () => {
	describe('stopwatch', () => {
		it('works', async () => {
			const interval = 100;
			const duration = 500;
			const now = Date.now();

			const timer = stopwatch(interval);
			const values = [];

			const unsubscribe = timer.subscribe((value) => {
				values.push(value);
			});

			await delay(duration);

			assert.equal(values.filter((d) => d >= now).length, values.length);
			assert.ok(values.length >= 6 && values.length <= 7);

			unsubscribe();
		});
	});

	describe('countdown', () => {
		it('works', async () => {
			const interval = 100;
			const duration = 500;
			const end_time = Date.now() + duration;

			const remain = countdown(end_time, interval);
			const values = [];

			const unsubscribe = remain.subscribe((value) => {
				values.push(value);
			});

			await delay(duration);

			assert.equal(values.filter((d) => d <= duration).length, values.length);
			assert.ok(values.length >= 6 && values.length <= 7);

			unsubscribe();
		});
	});
});
