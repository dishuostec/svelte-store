import { is_function, noop, run_all, subscribe } from 'svelte/internal';
import type { Readable, Subscriber, Unsubscriber } from 'svelte/store';
import { create_readable, TouchableReadable } from './readable';
import type { Equal } from './writable';

type ArrayStores = Array<Readable<any>>;
type ArrayStoresValues<T> = { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

export interface DerivedConfig<S extends ArrayStores, T> {
	equal?: Equal;
	stores: S;
	process: (
		values: ArrayStoresValues<S>,
		set: Subscriber<T>,
		changed?: number,
	) => void | Unsubscriber;
	initial_value?: T;
	start?: () => Unsubscriber | void;
	changed_only?: boolean;
}

export function create_derived<S extends ArrayStores, T>({
	equal,
	stores,
	process,
	initial_value,
	start,
	changed_only,
}: DerivedConfig<S, T>): TouchableReadable<T> {
	return create_readable({
		equal,
		value: initial_value,
		start: (set) => {
			let inited = false;
			const values = [] as ArrayStoresValues<S>;
			const destroy = start?.() || noop;

			let pending = 0;
			let cleanup = noop;

			const sync = (i?: number) => {
				if (pending) {
					return;
				}
				cleanup();
				const result = process(values, set, i);
				cleanup = is_function(result) ? (result as Unsubscriber) : noop;
			};

			const unsubscribers = stores.map((store, i) => {
				return subscribe(
					store,
					(value) => {
						values[i] = value;
						pending &= ~(1 << i);
						if (inited) {
							sync(i);
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
				destroy();
			};
		},
		changed_only,
	});
}

/** One or more `Readable`s. */
export type Stores =
	| Readable<any>
	| [Readable<any>, ...Array<Readable<any>>]
	| Array<Readable<any>>;

/** One or more values from `Readable` stores. */
export type StoresValues<T> = T extends Readable<infer U> ? U : ArrayStoresValues<T>;

export function array_derived<T>({
	stores,
	fn,
	initial_value,
	start,
}: {
	stores: Stores;
	fn: Function;
	initial_value?: T;
	start?: () => Unsubscriber | void;
}) {
	const single = !Array.isArray(stores);
	const stores_array: ArrayStores = single
		? [stores as Readable<any>]
		: (stores as Array<Readable<any>>);

	const auto = fn.length < 2;

	return {
		stores: stores_array,
		process(values: StoresValues<ArrayStores>, set: Subscriber<T>) {
			const args = single ? values[0] : values;

			if (auto) {
				set(fn(args));
			} else {
				return fn(args, set);
			}
		},
		initial_value,
		start,
	};
}
