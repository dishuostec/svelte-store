import { Invalidator, Readable, Subscriber, Unsubscriber } from 'svelte/store';

export type Fn = (...args: unknown[]) => unknown;

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export function run(fn: Fn) {
	return fn();
}

export function run_all(fns: Fn[]) {
	fns.forEach(run);
}

export function is_function(thing: unknown): thing is Fn {
	return typeof thing === 'function';
}

export function subscribe<T extends Readable<unknown>>(
	store: T,
	...callbacks: [Subscriber<T>, Invalidator<T>]
) {
	if (store == null) {
		for (const callback of callbacks) {
			callback(undefined);
		}
		return noop;
	}
	const unsub = store.subscribe(...callbacks) as Unsubscriber & { unsubscribe?(): void };
	return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
