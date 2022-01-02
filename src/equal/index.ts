import { noop, safe_not_equal } from 'svelte/internal';
import type {
	Readable,
	StartStopNotifier,
	Subscriber,
	Unsubscriber,
	Updater,
	Writable,
} from 'svelte/store';
import { inner_derived } from './inner_derived.js';

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
 */
export function readable<T>(config: WritableConfig<T> = {}): Readable<T> {
	return {
		subscribe: writable(config).subscribe,
	};
}

interface WritableConfig<T> {
	value?: T;
	start?: StartStopNotifier<T>;
	equal?: Equal;
	init?: () => Unsubscriber | void;
	changed?: Subscriber<T>;
}

export function writable<T>(): CustomWritable<T>;
export function writable<T>(config: WritableConfig<T>): CustomWritable<T>;

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 */
export function writable<T>({
	equal = default_equal,
	start = noop,
	value,
	init,
	changed,
}: WritableConfig<T> = {}): CustomWritable<T> {
	let stop: Unsubscriber;
	let destroy: Unsubscriber;
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

				changed?.(value);
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
			destroy = init?.() || noop;
			stop = start(set) || noop;
		}
		run(value);

		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0) {
				stop();
				stop = null;
				destroy();
				destroy = null;
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

export type DerivedArrayReaction<S, T> = {
	(values: StoresValues<S>): T;
	(values: StoresValues<S>, set: (value: T) => void, changed?: number): Unsubscriber | void;
};

const key = (i: number) => i;

interface DerivedArrayConfig<S, T> {
	fn: DerivedArrayReaction<S, T>;
	equal?: Equal;
	initial_value?: T;
	init?: () => Unsubscriber | void;
	changed?: Subscriber<T>;
}

export function derived_array<S extends Stores, T>(
	stores: S,
	{ changed, equal, fn, init, initial_value }: DerivedArrayConfig<S, T>,
): Readable<T> {
	const single = !Array.isArray(stores);
	const stores_array: Array<Readable<any>> = single
		? [stores as Readable<any>]
		: (stores as Array<Readable<any>>);

	const auto = fn.length < 2;

	const process = auto
		? (values: StoresValues<S>, set: Subscriber<T>) => set(fn(single ? values[0] : values))
		: (values: StoresValues<S>, set: Subscriber<T>, changed: any) =>
				fn(single ? values[0] : values, set, changed);

	return inner_derived<Array<Readable<any>>, T, any[]>({
		equal,
		stores: stores_array,
		process,
		values: [],
		key,
		initial_value,
		init,
		changed,
	});
}

export { derived_array as derived };

export type StoreMap = Record<string, Readable<any>>;

export type StoreMapValues<T> = { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

export type DerivedMapReaction<S, T> = {
	(values: StoreMapValues<S>): T;
	(
		values: StoreMapValues<S>,
		set: (value: T) => void,
		changed?: keyof S | undefined,
	): Unsubscriber | void;
};

interface DerivedMapConfig<S, T> {
	fn: DerivedMapReaction<S, T>;
	equal?: Equal;
	initial_value?: T;
	init?: () => Unsubscriber | void;
	changed?: Subscriber<T>;
}

export function derived_map<S extends StoreMap, T>(
	stores: S,
	{ changed, equal, fn, init, initial_value }: DerivedMapConfig<S, T>,
): Readable<T> {
	const props = Object.keys(stores);
	const stores_array = props.map((key) => stores[key]);

	const auto = fn.length < 2;

	const process = auto ? (values: StoreMapValues<S>, set: Subscriber<T>) => set(fn(values)) : fn;

	const key = (i) => props[i];

	return inner_derived<Array<Readable<any>>, T, Record<string, any>>({
		equal,
		stores: stores_array,
		process,
		values: {},
		key,
		initial_value,
		init,
		changed,
	});
}
