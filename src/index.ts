import type { Readable, StartStopNotifier } from 'svelte/store';
import type { Equal, Stores } from './equal';
import type { CustomWritable } from './equal';
import {
	DerivedArrayReaction,
	derived_array as derived_custom,
	readable as readable_custom,
	writable as writable_custom,
} from './equal/index.js';

export interface WritableFactory {
	<T>(value?: T, start?: StartStopNotifier<T>): CustomWritable<T>;

	use(equal: Equal): WritableFactory;
}

export function writable_use(equal: Equal): WritableFactory {
	const writable = <T>(value?: T, start?: StartStopNotifier<T>) =>
		writable_custom(equal, value, start);

	writable.use = writable_use;

	return writable;
}

export const writable = writable_use(undefined);

export interface ReadableFactory {
	<T>(value?: T, start?: StartStopNotifier<T>): Readable<T>;

	use(equal: Equal): ReadableFactory;
}

export function readable_use(equal: Equal): ReadableFactory {
	const readable = <T>(value?: T, start?: StartStopNotifier<T>) =>
		readable_custom(equal, value, start);

	readable.use = readable_use;

	return readable;
}

export const readable = readable_use(undefined);

export interface DerivedFactory {
	<S extends Stores, T>(stores: S, fn: DerivedArrayReaction<S, T>, initial_value?: T): Readable<T>;

	use(equal: Equal): DerivedFactory;
}

export function derived_use(equal: Equal): DerivedFactory {
	const derived = <S extends Stores, T>(
		stores: S,
		fn: DerivedArrayReaction<S, T>,
		initial_value?: T,
	) => derived_custom(equal, stores, fn, initial_value);

	derived.use = derived_use;

	return derived;
}

export const derived = derived_use(undefined);
