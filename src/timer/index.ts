import { readable } from '../index.js';
import type { Readable } from 'svelte/store';

type GetNow = () => number;

const default_now: GetNow = () => Date.now();

function readable_timer(
	interval?: number,
	to?: number,
	now: GetNow = default_now,
): Readable<number> {
	if (to != null && (isNaN(to) || to < 0 || !isFinite(to))) {
		throw new Error('Invalid "to" value.');
	}

	const is_countdown = to != null;

	if (interval == null) {
		interval = 1000;
	}

	return readable(null, (set) => {
		let timer;

		function loop() {
			const current = now();
			const delay = interval - (current % interval);

			let offset = is_countdown ? Math.ceil((to - current) / interval) : current;

			set(offset);
			if (delay >= 0) {
				timer = setTimeout(loop, delay);
			}
		}

		loop();

		return () => {
			clearTimeout(timer);
		};
	});
}

export { readable_timer as readable };
