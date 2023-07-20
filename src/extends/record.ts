import type { Readable, Subscriber, Updater } from 'svelte/store';
import type { TouchableReadable } from '../core/readable';
import {
	create_derived,
	DerivedProcessor,
	DerivedStartStopNotifier,
	is_simple,
} from '../core/derived';
import { create_writable, TouchableWritable } from '../core/writable';
import { is_function } from '../core/utils';

type Props<T extends Record<string, unknown> = any> = {
	[K in keyof T]: K extends 'subscribe' ? never : T[K];
};

type PropsValue<P extends Props> = {
	[K in keyof P]: P[K] extends Readable<infer R> ? R : P[K];
};

type PropsStore<P extends Props> = {
	readonly [K in keyof P]: P[K] extends Readable<unknown> ? P[K] : TouchableWritable<P[K]>;
};

export type RecordStore<P extends Props, T = PropsValue<P>> = PropsStore<P> & TouchableReadable<T>;

function is_readable(value: any): value is Readable<unknown> {
	if (value == null) {
		return false;
	}

	return typeof value === 'object' && is_function(value.subscribe);
}

export function record<P extends Props, T>(
	props: P,
	fn?: DerivedProcessor<PropsValue<P>, T, Record<keyof P, true>>,
	initial_value?: T | undefined,
	start?: DerivedStartStopNotifier,
	onChange?: (value: T, trust: boolean) => void,
): RecordStore<P, T> {
	const keys: Array<keyof P> = [];
	const stores = [];
	const props_store = {} as PropsStore<P>;

	for (const key in props) {
		if (Object.prototype.hasOwnProperty.call(props, key)) {
			const value = props[key];
			const store = is_readable(value) ? value : create_writable({ value });
			stores.push(store);
			keys.push(key);
			(props_store as any)[key] = store;
		}
	}

	const val = (values) =>
		keys.reduce((value, key, i) => {
			value[key] = values[i];
			return value;
		}, {} as PropsValue<P>);

	const process = !fn
		? (v: PropsValue<P>, set: Subscriber<any>) => {
				set(v);
		  }
		: is_simple(fn)
		? (v: PropsValue<P>, set: Subscriber<T>) => {
				set(fn(v));
		  }
		: fn.length < 4
		? (v: PropsValue<P>, set: Subscriber<T>, update: (fn: Updater<T>) => void) => {
				return fn(v, set, update);
		  }
		: (
				v: PropsValue<P>,
				set: Subscriber<T>,
				update: (fn: Updater<T>) => void,
				changed_bitmap: number,
		  ) => {
				//  Record<keyof P,true>
				let changed_key: Record<keyof P, true>;
				if (changed_bitmap) {
					changed_key = {} as any;
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

				return fn(v, set, update, changed_key);
		  };

	const store = create_derived<any[], T>({
		stores,
		process(values, set, update, changed) {
			const value = val(values);
			return process(value, set, update, changed);
		},
		initial_value,
		start,
		onChange,
	});

	return { ...props_store, ...store };
}
