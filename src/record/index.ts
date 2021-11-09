import type { Readable } from 'svelte/store';
import type { CustomWritable, Equal, DerivedMapReaction } from '../equal';
import { writable as writable_custom, derived_map } from '../equal';

type notUndefined = string | number | boolean | symbol | object;

type Type<T extends notUndefined> = T;

type PropsStore<T extends Record<string, any>> = {
	[K in keyof T]: T[K] extends Type<infer R> ? CustomWritable<R> : never;
};

type PropsMapStore<T> = PropsStore<T> & Readable<T>;

function record<T extends Record<string, any>>(
	equal: Equal,
	props: T,
	fn: DerivedMapReaction<PropsStore<T>, T>,
	init_value?: T,
): PropsMapStore<T> {
	const props_store = {} as PropsStore<T>;

	for (const propsKey in props) {
		props_store[propsKey] = writable_custom(equal, props[propsKey]);
	}

	const store = derived_map(undefined, props_store, fn, init_value);

	return Object.assign(props_store, store);
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
