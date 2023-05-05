import { is_function } from 'svelte/internal';
import type { Readable, Unsubscriber } from 'svelte/store';
import type { TouchableReadable } from '../core/readable';
import { create_derived, DerivedConfig } from '../core/derived';
import { create_writable, TouchableWritable } from '../core/writable';
import equal from 'fast-deep-equal';
import { DerivedStartStopNotifier } from '../deep';

interface NoSubscribe {
	subscribe?: never;

	[k: string | number]: any;
}

type Props = Record<
	string,
	Readable<any> | null | undefined | number | boolean | string | NoSubscribe
> &
	NoSubscribe;

type PropsValue<P extends Props> = {
	[K in keyof P]: P[K] extends Readable<infer R> ? R : P[K];
};

type PropsStore<P extends Props> = Omit<
	{
		readonly [K in keyof P]: P[K] extends Readable<any> ? P[K] : TouchableWritable<P[K]>;
	},
	'subscribe'
>;

export type RecordStore<P extends Props, T = PropsValue<P>> = PropsStore<P> & TouchableReadable<T>;

function is_readable(value: any): value is Readable<any> {
	if (value == null) {
		return false;
	}

	return typeof value === 'object' && 'subscribe' in value && typeof value.subscribe === 'function';
}

export function record<S extends Props, T>(
	props: S,
	fn: (
		value: PropsValue<S>,
		set: (value: T) => void,
		changed_key?: Record<keyof PropsValue<S>, boolean> | undefined,
	) => Unsubscriber | void,
	initial_value?: T,
	start?: DerivedStartStopNotifier<T>,
): RecordStore<S, T>;

export function record<S extends Props, T>(
	props: S,
	fn: (
		value: PropsValue<S>,
		set: (value: T) => void,
		changed_key?: Record<keyof PropsValue<S>, boolean> | undefined,
	) => Unsubscriber | void,
	start: DerivedStartStopNotifier<T>,
): RecordStore<S, T>;

export function record<S extends Props, T>(
	props: S,
	fn: (value: PropsValue<S>) => T,
	initial_value?: T,
	start?: DerivedStartStopNotifier<T>,
): RecordStore<S, T>;

export function record<S extends Props, T>(
	props: S,
	fn: (value: PropsValue<S>) => T,
	start: DerivedStartStopNotifier<T>,
): RecordStore<S, T>;

export function record<S extends Props, T>(props: S): RecordStore<S, T>;

export function record<T>(props: Props, fn?: Function, ...rest: any[]): RecordStore<Props, T> {
	const keys: string[] = [];
	const stores = [];
	const props_store = {};

	const length = fn?.length;
	const simple = length === undefined;

	for (const [key, value] of Object.entries(props)) {
		const store = is_readable(value) ? value : create_writable({ value });
		stores.push(store);
		keys.push(key);
		props_store[key] = store;
	}

	const config: DerivedConfig<any, T> = {
		equal,
		stores,
		process(values, set, changed_bitmap) {
			const value = keys.reduce((value, key, i) => {
				value[key] = values[i];
				return value;
			}, {}) as T;

			if (simple) {
				set(value);
			} else if (length < 2) {
				return set(fn(value));
			} else if (length < 3) {
				return fn(value, set);
			} else {
				let changed_key;
				if (changed_bitmap) {
					changed_key = {};
					let i = 0;
					let n = changed_bitmap;
					while (n) {
						if (n & 1) {
							changed_key[keys[i]] = true;
						}
						n = n >> 1;
						i++;
					}
				}

				return fn(value, set, changed_key);
			}
		},
	};

	if (rest.length) {
		if (is_function(rest[0])) {
			config.start = rest[0];
		} else {
			config.initial_value = rest[0];
			config.start = rest[1];
		}
	}

	const store = create_derived(config);

	return { ...props_store, ...store };
}
