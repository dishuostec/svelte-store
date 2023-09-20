import type { Subscriber, Updater } from 'svelte/store';
import {
	ArrayStores,
	DerivedProcessor,
	DerivedStartStopNotifier,
	Stores,
	StoresValues,
	create_derived,
	is_simple,
} from './core/derived';
import { create_readable, TouchableReadable } from './core/readable';
import { create_writable, StartStopNotifier, TouchableWritable } from './core/writable';

export function readable<T>(
	value?: T,
	start?: StartStopNotifier<T>,
	onChange?: (value: T, trust: boolean) => void,
): TouchableReadable<T> {
	return create_readable({ value, start, onChange });
}

export function writable<T>(
	value?: T,
	start?: StartStopNotifier<T>,
	onChange?: (value: T, trust: boolean) => void,
): TouchableWritable<T> {
	return create_writable({ value, start, onChange });
}

export function derived<S extends Stores, T>(
	stores: S,
	fn: DerivedProcessor<StoresValues<S>, T>,
	initial_value?: T,
	start?: DerivedStartStopNotifier,
	onChange?: (value: T, trust: boolean) => void,
): TouchableReadable<T> {
	const val: (d: any) => StoresValues<S> = Array.isArray(stores)
		? (d: StoresValues<S>) => d
		: (d: StoresValues<S>) => d[0];

	const process = is_simple(fn)
		? (v: StoresValues<S>, set: Subscriber<T>) => {
				set(fn(v));
		  }
		: (
				v: StoresValues<S>,
				set: Subscriber<T>,
				update: (fn: Updater<T>) => void,
				changed: number,
		  ) => {
				return fn(v, set, update, changed);
		  };

	return create_derived({
		stores: Array.isArray(stores) ? stores : [stores],
		process(values: StoresValues<ArrayStores>, set, update, changed) {
			const value = val(values);
			return process(value, set, update, changed);
		},
		initial_value,
		start,
		onChange,
	});
}
