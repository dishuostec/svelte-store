import type { StartStopNotifier, Unsubscriber } from 'svelte/store';
import { noop } from 'svelte/internal';
import { array_derived, create_derived, Stores, StoresValues } from '../core/derived';
import { create_readable, TouchableReadable } from '../core/readable';
import { create_writable, TouchableWritable } from '../core/writable';
import equal from 'fast-deep-equal';

/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
export function readable<T>(value?: T, start?: StartStopNotifier<T>): TouchableReadable<T> {
	return create_readable({ equal, value, start });
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
export function writable<T>(value?: T, start: StartStopNotifier<T> = noop): TouchableWritable<T> {
	return create_writable({ equal, start, value });
}

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - when used asynchronously
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
	initial_value?: T,
): TouchableReadable<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - initial value
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
	initial_value?: T,
): TouchableReadable<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 */
export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
): TouchableReadable<T>;

export function derived<T>(stores: Stores, fn: Function, initial_value?: T): TouchableReadable<T> {
	const config = array_derived<T>({ stores, fn, initial_value });
	return create_derived({ ...config, equal });
}
