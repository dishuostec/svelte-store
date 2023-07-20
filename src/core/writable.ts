import { noop } from './utils';
import equal from 'fast-deep-equal';
import type {
	Writable,
	Unsubscriber,
	Subscriber,
	Updater,
	StartStopNotifier as OriginStartStopNotifier,
} from 'svelte/store';

export type Invalidator<T> = (value?: T) => void;
type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

export type StartStopNotifier<T> = (
	...args: [...Parameters<OriginStartStopNotifier<T>>, () => void]
) => ReturnType<OriginStartStopNotifier<T>>;

export interface TouchableWritable<T> extends Writable<T> {
	touch(): void;
}

export interface WritableConfig<T> {
	value?: T;
	start?: StartStopNotifier<T>;
	onChange?: (value: T, trust: boolean) => void;
}

const subscriber_queue = [];

export function create_writable<T>({
	start = noop,
	value,
	onChange,
}: WritableConfig<T>): TouchableWritable<T> {
	const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();

	let stop: Unsubscriber;

	function process(value: T, trust = true): void {
		if (onChange) onChange(value, trust);

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

	function touch() {
		process(value, false);
	}

	function update(fn: Updater<T>): void {
		set(fn(value));
	}

	function subscribe(run: Subscriber<T>, invalidate: Invalidator<T> = noop): Unsubscriber {
		const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set, update, touch) || noop;
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
