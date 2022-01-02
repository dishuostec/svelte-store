import { is_function, noop, run_all, subscribe } from 'svelte/internal';
import type { Readable, Subscriber, Unsubscriber } from 'svelte/store';
import type { Equal } from './index';
import { readable } from './index.js';

interface InnerDerivedParams<S extends Array<Readable<any>>, T, V> {
	equal: Equal;
	stores: S;
	process: (values: V, set: Subscriber<T>, changed?: keyof V) => void | Unsubscriber;
	values: V;
	key: (i: number) => keyof V;
	initial_value?: T;
	init?: () => Unsubscriber | void,
	changed?: Subscriber<T>
}

export function inner_derived<S extends Array<Readable<any>>, T, V>({
	equal,
	stores,
	process,
	values,
	key,
	initial_value,
	init,
	changed,
}: InnerDerivedParams<S, T, V>): Readable<T> {
	return readable({
		equal,
		value: initial_value,
		start: (set) => {
			let inited = false;

			let pending = 0;
			let cleanup = noop;

			const sync = (k?: any) => {
				if (pending) {
					return;
				}
				cleanup();
				const result = process(values, set, k);
				cleanup = is_function(result) ? (result as Unsubscriber) : noop;
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
		},
		init,
		changed,
	});
}
