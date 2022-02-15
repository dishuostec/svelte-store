import { create_derived } from '../core/derived';
import { create_readable, TouchableReadable } from '../core/readable';
import { create_writable } from '../core/writable';

type GetNow = () => number;

const default_now: GetNow = () => Date.now();

export function stopwatch(
	interval: number = 1000,
	get_now: GetNow = default_now,
): TouchableReadable<number> {
	return create_readable<number>({
		start(set) {
			let timer;

			function loop() {
				const current = get_now();
				const delay = interval - (current % interval);

				set(current);
				if (delay >= 0) {
					timer = setTimeout(loop, delay);
				}
			}

			loop();

			return () => {
				clearTimeout(timer);
			};
		},
	});
}

export interface CountdownStore extends TouchableReadable<number> {
	set(end_time: Date | number): void;
}

export function countdown(
	end_time: Date | number,
	interval: number = 1000,
	get_now: GetNow = default_now,
): CountdownStore {
	const end = create_writable<number>({});

	const now = stopwatch(interval, get_now);

	const change_end_time = (end_time: Date | number) => {
		const time = end_time?.valueOf?.();

		if (time == null || isNaN(time) || time < 0 || !isFinite(time)) {
			throw new Error(`Invalid "end time", type: "${typeof end_time}" value: "${end_time}"`);
		}

		end.set(time);
	};

	change_end_time(end_time);

	const store: TouchableReadable<number> = create_derived({
		stores: [now, end],
		process([$now, $end], set) {
			const remain = Math.max(0, $end - $now);
			set(Math.ceil(remain));
		},
	});

	return {
		...store,
		set: change_end_time,
	};
}
