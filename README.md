## Installation

```shell
npm i @dishuostec/svelte-store
```

## Usage

```javascript
// Just drop in place of package name.
// import { writable, readable, derived } from 'svelte/store';
import { writable, readable, derived } from '@dishuostec/svelte-store';

const a = readable(0);
const b = writable(1);
const c = derived([a, b], ([$a, $b]) => $a + $b);
```

### `touch` method

You can call `touch()` on a store to force it reactive without change it's value.

```javascript
const store = readable(0);
let called = 0;

const unsubscribe = store.subscribe(() => {
	called += 1;
});

// called === 1

store.touch(); // called === 2

store.touch(); // called === 3

unsubscribe();

store.touch(); // called === 3
```

## Use deep equal logic

Use [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal) instead of `safe_not_equal` to compare value.

```javascript
import { writable, readable, derived } from '@dishuostec/svelte-store/deep';
```

```javascript
import { writable } from '@dishuostec/svelte-store/deep';

const store = writable({ a: 0 });
let called = 0;

const unsubscribe = store.subscribe(() => {
	called += 1;
});

// called === 1

store.set({ a: 0 }); // nothing happened, called === 1

unsubscribe();
```

```javascript
import { writable } from 'svelte/store';
import { derived } from '@dishuostec/svelte-store/deep';

const n = writable(1);
const list = derived(n, ($n) => [Math.ceil($n / 2)]);
let called = 0;

const unsubscribe = list.subscribe(() => {
	called += 1;
});

// called === 1
// $list === 0

n.set(2); // nothing happened

n.set(3);
// called === 2
// $list === 1

n.set(4); // nothing happened

n.set(6);
// called === 3
// $list === 2

unsubscribe();
```

# Builtin stores

## stopwatch

### API

```typescript
declare function stopwatch(interval?: number, get_now?: () => number): Readable<number>;
```

- **interval**, default is 1000 (1s);
- **get_now**, get current time. default is `() => Date.now()`

### Usage

```javascript
import { stopwatch } from '@dishuostec/svelte-store/extends/timer';

const timer = stopwatch();
const values = [];

const unsubscribe = timer.subscribe((value) => {
	values.push(value);
});

setTimeout(() => {
	/*
	values = [
		1644980853287,
		1644980854002,
		1644980855001,
		1644980856001,
		1644980857001,
		1644980858001
	];
	*/
	unsubscribe();
}, 5000);
```

## countdown

### API

```typescript
declare function countdown(
	end_time: Date | number,
	interval?: number,
	get_now?: GetNow,
): Readable<number> & { set(end_time: Date | number): void };
```

### Usage

```javascript
import { countdown } from '@dishuostec/svelte-store/extends/timer';

const remain = countdown(Math.ceil(Date.now() / 1000) * 1000 + 5000);
const values = [];

const unsubscribe = remain.subscribe((value) => {
	values.push(value);
});

setTimeout(() => {
	unsubscribe();

	// values = [ 4904, 3999, 3000, 2000, 999, 0 ]
}, 5000);
```

## Derived record

Like original derived function, but it accepts a record. And the store has writable store properties that which names
are same of received record.

### API

```typescript
declare function record(obj: Record<string, any>): RecordStore<any, any>;

declare function record(
	obj: Record<string, any>,
	fn: (data: any) => any,
	initial_value?: any,
): RecordStore<any, any>;

declare function record(
	obj: Record<string, any>,
	fn: (data: any, set: (value: any) => void, changed_key?: Record<string, boolean> | undefined) => void,
	initial_value?: any,
): RecordStore<any, any>;
```

### Usage

```javascript
import { record } from '@dishuostec/svelte-store/extends/record';

const store = record({ foo: 0, bar: 'a' });

// store.foo is writable
// store.bar is writable

const unsubscribe = store.subscribe((value) => {
	console.log(value);
});

// output: { foo: 0, bar: 'a' }

store.foo.set(1); // output: { foo: 1, bar: 'a' }
store.foo.set(2); // output: { foo: 2, bar: 'a' }
store.bar.set('b'); // output: { foo: 2, bar: 'b' }

unsubscribe();

store.foo.set(3); // nothing happened
```

Callback receives changed key map as a third argument.

```javascript
const store = record({ foo: 0, bar: 'a' }, (data, set, changed_key) => {
	set({ data, changed_key });
});

const unsubscribe = store.subscribe((value) => {
	console.log(value);
});

// output: { data: { foo: 0, bar: 'a' }, changed_key: undefined }

store.foo.set(1); // output: { data: { foo: 1, bar: 'a' }, changed_key: { foo: true } }
store.foo.set(2); // output: { data: { foo: 2, bar: 'a' }, changed_key: { foo: true } }
store.bar.set('b'); // output: { data: { foo: 2, bar: 'b' }, changed_key: { bar: true } }

unsubscribe();

store.foo.set(3); // nothing happened
```
