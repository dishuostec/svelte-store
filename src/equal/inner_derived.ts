import { is_function, noop, run_all, subscribe } from 'svelte/internal';
import type { Readable, Subscriber, Unsubscriber } from 'svelte/store';
import type { Equal } from './index';
import { readable } from './index';

export function inner_derived<T>(
	equal: Equal,
	stores: Array<Readable<any>>,
	process: (values: T, changed: any, set: Subscriber<T>) => void | Unsubscriber | T,
	auto: boolean,
	values: T,
	key: (i: number) => keyof T,
	initial_value?: T,
): Readable<T> {
	return readable(equal, initial_value, (set) => {
		let inited = false;

		let pending = 0;
		let cleanup = noop;

		const sync = (k?: any) => {
			if (pending) {
				return;
			}
			cleanup();
			const result = process(values, k, set);
			if (auto) {
				set(result as T);
			} else {
				cleanup = is_function(result) ? (result as Unsubscriber) : noop;
			}
		};

		const unsubscribers = stores.map((store, i) => {
			const k = key(i);
			return subscribe(
				store,
				(value) => {
					values[k] = value;
					pending &= ~(1 << i);
					if (inited) {
						sync(k);
					}
				},
				() => {
					pending |= 1 << i;
				},
			);
		});

		inited = true;
		sync();

		return function stop() {
			run_all(unsubscribers);
			cleanup();
		};
	});
}
