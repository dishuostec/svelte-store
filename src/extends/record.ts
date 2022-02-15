import type { Readable, Unsubscriber } from 'svelte/store';
import type { TouchableReadable } from '../core/readable';
import { create_derived, DerivedConfig } from '../core/derived';
import { create_writable, TouchableWritable } from '../core/writable';
import equal from 'fast-deep-equal';

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

type RecordStore<P extends Props, T> = PropsStore<P> & TouchableReadable<T>;

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
		changed_key: string | undefined,
	) => Unsubscriber | void,
	initial_value?: T,
): RecordStore<S, T>;

export function record<S extends Props, T>(
	props: S,
	fn: (value: PropsValue<S>) => T,
	initial_value?: T,
): RecordStore<S, T>;

export function record<S extends Props, T>(props: S, initial_value?: T): RecordStore<S, T>;

export function record<T>(props: Props, fn: Function, initial_value?: T): RecordStore<Props, T> {
	const keys: string[] = [];
	const stores = [];
	const props_store = {};

	const simple = !fn;
	const auto = fn && fn.length < 2;

	for (const [key, value] of Object.entries(props)) {
		const store = is_readable(value) ? value : create_writable({ value });
		stores.push(store);
		keys.push(key);
		props_store[key] = store;
	}

	const config: DerivedConfig<any, T> = {
		equal,
		stores,
		process(values, set, changed) {
			const value = keys.reduce((value, key, i) => {
				value[key] = values[i];
				return value;
			}, {}) as T;

			if (simple) {
				set(value);
			} else if (auto) {
				set(fn(value));
			} else {
				const changed_key: string | undefined = keys[changed];
				return fn(value, set, changed_key);
			}
		},
		initial_value,
	};

	const store = create_derived(config);

	return { ...props_store, ...store };
}
