import { is_function, noop, run_all, subscribe } from './utils';
import type { Readable, Unsubscriber, Updater } from 'svelte/store';
import { create_readable, TouchableReadable } from './readable';

export type StoreValue<T> = T extends Readable<infer U> ? U : never;

export type ArrayStores = Array<Readable<any>>;
export type ArrayStoresValues<T> = { [K in keyof T]: StoreValue<T[K]> };
export type DerivedStartStopNotifier = () => Unsubscriber | void;

type SimpleProcessor<V, T> = (value: V) => T;
type ComplexProcessor<V, T, C = number> = (
	value: V,
	set: (v: T) => void,
	update: (fn: Updater<T>) => void,
	changed?: C,
) => Unsubscriber | void;

export type DerivedProcessor<S, T, C = any> = SimpleProcessor<S, T> | ComplexProcessor<S, T, C>;

export function is_simple<S, T>(fn: DerivedProcessor<S, T>): fn is SimpleProcessor<S, T> {
	return fn.length < 2;
}

export interface DerivedConfig<S extends ArrayStores, T> {
	stores: S;
	process: DerivedProcessor<ArrayStoresValues<S>, T, number>;
	initial_value?: T | undefined;
	start?: DerivedStartStopNotifier;
	onChange?: (value: T, trust: boolean) => void;
}

export function create_derived<S extends ArrayStores, T>({
	stores,
	process,
	initial_value,
	start,
	onChange,
}: DerivedConfig<S, T>): TouchableReadable<T> {
	return create_readable({
		value: initial_value,
		start: (set, update) => {
			let inited = false;
			const values = [] as ArrayStoresValues<S>;
			const destroy = start?.() || noop;

			let pending = 0;
			let cleanup = noop;
			let changed = 0;

			const sync = (i?: number) => {
				if (i !== undefined) {
					changed |= 1 << i;
				}
				if (pending) {
					return;
				}
				cleanup();
				const result = process(values, set, update, changed);
				cleanup = is_function(result) ? (result as Unsubscriber) : noop;
				changed = 0;
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
		onChange,
	});
}
