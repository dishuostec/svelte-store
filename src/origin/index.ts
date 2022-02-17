import type { Unsubscriber } from 'svelte/store';
import { noop } from 'svelte/internal';
import { array_derived, Stores, StoresValues } from '../core/derived';
import { create_readable, TouchableReadable } from '../core/readable';
import { create_writable, StartStopNotifier, TouchableWritable } from '../core/writable';

/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
export function readable<T>(value?: T, start?: StartStopNotifier<T>): TouchableReadable<T> {
	return create_readable({ value, start });
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
export function writable<T>(value?: T, start: StartStopNotifier<T> = noop): TouchableWritable<T> {
	return create_writable({ start, value });
}

export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
	initial_value?: T,
	start?: () => Unsubscriber | void,
): TouchableReadable<T>;

export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
	start: () => Unsubscriber | void,
): TouchableReadable<T>;

export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
	initial_value?: T,
	start?: () => Unsubscriber | void,
): TouchableReadable<T>;

export function derived<S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
	start: () => Unsubscriber | void,
): TouchableReadable<T>;

export function derived<T>(...args: [Stores, Function, ...any]): TouchableReadable<T> {
	return array_derived<T>(undefined, ...args);
}
