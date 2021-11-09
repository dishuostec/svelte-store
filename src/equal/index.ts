import { noop, safe_not_equal } from 'svelte/internal';
import type {
	Readable,
	StartStopNotifier,
	Subscriber,
	Unsubscriber,
	Updater,
	Writable,
} from 'svelte/store';
import { inner_derived } from './inner_derived';

export type Equal = (a: any, b: any) => boolean;

/** Cleanup logic callback. */
type Invalidator<T> = (value?: T) => void;

/** Pair of subscriber and invalidator. */
type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

const default_equal: Equal = (a, b) => !safe_not_equal(a, b);

/** Writable interface for both updating and subscribing. */
export interface CustomWritable<T> extends Writable<T> {
	touch(): void;
}

const subscriber_queue = [];

/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param {Equal} equal
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
export function readable<T>(equal?: Equal, value?: T, start?: StartStopNotifier<T>): Readable<T> {
	return {
		subscribe: writable(equal, value, start).subscribe,
	};
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {Equal} equal
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
export function writable<T>(
	equal?: Equal,
	value?: T,
	start: StartStopNotifier<T> = noop,
): CustomWritable<T> {
	let stop: Unsubscriber;
	equal = equal ?? default_equal;
	const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();

	function process(value: T): void {
		if (stop) {
			// store is ready
			const run_queue = !subscriber_queue.length;
			for (const subscriber of subscribers) {
				subscriber[1]();
				subscriber_queue.push(subscriber, value);
			}
			if (run_queue) {
				for (let i = 0; i < subscriber_queue.length; i += 2) {
					subscriber_queue[i][0](subscriber_queue[i + 1]);
				}
				subscriber_queue.length = 0;
			}
		}
	}

	function set(new_value: T): void {
		if (!equal(value, new_value)) {
			value = new_value;
			process(value);
		}
	}

	function update(fn: Updater<T>): void {
		set(fn(value));
	}

	function subscribe(run: Subscriber<T>, invalidate: Invalidator<T> = noop): Unsubscriber {
		const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set) || noop;
		}
		run(value);

		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0) {
				stop();
				stop = null;
			}
		};
	}

	function touch() {
		process(value);
	}

	return { set, update, subscribe, touch };
}

/** One or more `Readable`s. */
export type Stores =
	| Readable<any>
	| [Readable<any>, ...Array<Readable<any>>]
	| Array<Readable<any>>;

/** One or more values from `Readable` stores. */
export type StoresValues<T> = T extends Readable<infer U>
	? U
	: { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

export type DerivedArrayAutoReaction<S, T> = (values: StoresValues<S>) => T;

export type DerivedArrayManualReaction<S, T> = (
	values: StoresValues<S>,
	set: (value: T) => void,
	changed?: number,
) => Unsubscriber | void;

export type DerivedArrayReaction<S, T> =
	| DerivedArrayAutoReaction<S, T>
	| DerivedArrayManualReaction<S, T>;

const key = (i: number) => i;

export function derived_array<T>(
	equal: Equal,
	stores: Stores,
	fn: DerivedArrayReaction<Stores, T>,
	initial_value?: T,
): Readable<T> {
	const single = !Array.isArray(stores);
	const stores_array: Array<Readable<any>> = single
		? [stores as Readable<any>]
		: (stores as Array<Readable<any>>);

	const auto = fn.length < 2;

	const process = (values: T, changed: any, set: Subscriber<T>) =>
		fn(single ? values[0] : values, set, changed);

	const values = [];

	return inner_derived(
		equal,
		stores_array,
		process,
		auto,
		values as any,
		key as any,
		initial_value,
	);
}

export { derived_array as derived };

export type StoreMap = Record<string, Readable<any>>;

export type StoreMapValues<T> = { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

export type DerivedMapAutoReaction<S, T> = (values: StoreMapValues<S>) => T;

export type DerivedMapManualReaction<S, T> = (
	values: StoreMapValues<S>,
	set: (value: T) => void,
	changed?: string,
) => Unsubscriber | void;

export type DerivedMapReaction<S, T> =
	| DerivedMapAutoReaction<S, T>
	| DerivedMapManualReaction<S, T>;

export function derived_map<T>(
	equal: Equal,
	stores: StoreMap,
	fn: DerivedMapReaction<StoreMap, T>,
	initial_value?: T,
): Readable<T> {
	const props = Object.keys(stores);
	const stores_array = props.map((key) => stores[key]);

	const auto = fn.length < 2;

	const process = (values: T, changed: any, set) => fn(values, set, changed);

	const values = {};
	const key = (i) => props[i];

	return inner_derived<T>(
		equal,
		stores_array,
		process,
		auto,
		values as any,
		key as any,
		initial_value,
	);
}
