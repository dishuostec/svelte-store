import type { Readable } from 'svelte/store';
import type { CustomWritable, Equal, DerivedMapReaction } from '../equal';
import { writable as writable_custom, derived_map } from '../equal/index.js';

interface NoSubscribe {
	subscribe?: never;

	[k: string | number]: any;
}

type Props = Record<
	string,
	Readable<any> | null | undefined | number | boolean | string | NoSubscribe
> &
	NoSubscribe;

type StoreMap<P extends Props> = Omit<
	{
		[K in keyof P]: P[K] extends Readable<infer R> ? Readable<R> : Readable<P[K]>;
	},
	'subscribe'
>;

type PropsStore<P extends Props> = Omit<
	{
		readonly [K in keyof P]: P[K] extends Readable<any> ? P[K] : CustomWritable<P[K]>;
	},
	'subscribe'
>;

function is_readable(value: any): value is Readable<any> {
	if (value == null) {
		return false;
	}

	return typeof value === 'object' && 'subscribe' in value && typeof value.subscribe === 'function';
}

function record<P extends Props, T>(
	equal: Equal,
	props: P,
	fn: DerivedMapReaction<StoreMap<P>, T>,
	initial_value?: T,
): PropsStore<P> & Readable<T> {
	const stores = {} as Record<keyof P, any>;

	for (const key in props) {
		const value = props[key];
		stores[key] = is_readable(value) ? value : writable_custom({ equal, value });
	}

	const store = derived_map<StoreMap<P>, T>(stores as StoreMap<P>, { equal, fn, initial_value });

	return Object.assign(stores, store);
}

export interface RecordFactory {
	<P extends Props, T>(
		props: P,
		fn: DerivedMapReaction<StoreMap<P>, T>,
		init_value?: T,
	): PropsStore<P> & Readable<T>;

	use(equal: Equal): RecordFactory;
}

export function record_use(equal: Equal): RecordFactory {
	const writable = <P extends Props, T>(
		props: P,
		fn: DerivedMapReaction<StoreMap<P>, T>,
		init_value?: T,
	) => record(equal, props, fn, init_value);

	writable.use = record_use;

	return writable;
}

export const readable = record_use(undefined);
