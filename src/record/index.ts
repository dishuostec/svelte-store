import type { Readable } from 'svelte/store';
import type { CustomWritable, Equal, DerivedMapReaction } from '../equal';
import { writable as writable_custom, derived_map } from '../equal';

interface NotReadable {
	subscribe: never;
}

type Props = Record<string, Readable<any> | (any & NotReadable)>

type PropsStore<T extends Props> = {
	[K in keyof T]: T[K] extends Readable<infer R>
		? Readable<R>
		: CustomWritable<T[K]>;
};

type PropsMapStore<T extends Props> = PropsStore<T> & Readable<T>;

function record<T extends Props>(
	equal: Equal,
	props: T,
	fn: DerivedMapReaction<PropsStore<T>, T>,
	init_value?: T,
): PropsMapStore<T> {
	const stores = {} as PropsStore<T>;

	Object.entries(props).forEach(([key, value]: [keyof T, any]) => {
		if (typeof value === 'object' && value != null && 'subscribe' in value) {
			stores[key] = value;
		} else {
			stores[key] = writable_custom(equal, value);
		}
	});

	const store = derived_map(equal, stores, fn, init_value);

	return Object.assign(stores, store);
}

export interface RecordFactory {
	<T extends Record<string, any>>(
		props: T,
		fn: DerivedMapReaction<PropsStore<T>, T>,
		init_value?: T,
	): PropsMapStore<T>;

	use(equal: Equal): RecordFactory;
}

export function record_use(equal: Equal): RecordFactory {
	const writable = <T extends Record<string, any>>(
		props: T,
		fn: DerivedMapReaction<PropsStore<T>, T>,
		init_value?: T,
	) => record(equal, props, fn, init_value);

	writable.use = record_use;

	return writable;
}

export const readable = record_use(undefined);
