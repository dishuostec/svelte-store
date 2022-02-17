import { noop, safe_not_equal } from 'svelte/internal';
import type { Writable, Unsubscriber, Subscriber, Updater } from 'svelte/store';
export type Equal = (a: any, b: any) => boolean;

export type Invalidator<T> = (value?: T) => void;
type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

/** Start and stop notification callbacks. */
export type StartStopNotifier<T> = (set: Subscriber<T>, touch: () => void) => Unsubscriber | void;

export interface TouchableWritable<T> extends Writable<T> {
	touch(): void;
}

export interface WritableConfig<T> {
	value?: T;
	start?: StartStopNotifier<T>;
	equal?: Equal;
	changed_only?: boolean;
}

const subscriber_queue = [];
const default_equal: Equal = (a, b) => !safe_not_equal(a, b);

export function create_writable<T>({
	equal = default_equal,
	start = noop,
	value,
	changed_only = false,
}: WritableConfig<T>): TouchableWritable<T> {
	const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();

	let stop: Unsubscriber;
	let has_changed = false;

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
			if (!changed_only || has_changed) {
				process(value);
			}
			has_changed = true;
		}
	}

	function touch() {
		process(value);
	}

	function update(fn: Updater<T>): void {
		set(fn(value));
	}

	function subscribe(run: Subscriber<T>, invalidate: Invalidator<T> = noop): Unsubscriber {
		const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			has_changed = false;
			stop = start(set, touch) || noop;
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

	return { set, update, subscribe, touch };
}
