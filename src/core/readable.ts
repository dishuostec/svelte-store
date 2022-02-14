import { create_writable } from './writable';
import type { Readable } from 'svelte/store';
import type { WritableConfig } from './writable';

export interface TouchableReadable<T> extends Readable<T> {
	touch(): void;
}

export function create_readable<T>(config: WritableConfig<T> = {}): TouchableReadable<T> {
	const { subscribe, touch } = create_writable(config);
	return {
		subscribe,
		touch,
	};
}
