type TypeType = string | number;

type BaseNode = { type: TypeType };

type NodeOf<T extends TypeType, X> = X extends { type: T } ? X : never;

type SpecialisedVisitors<T extends BaseNode, U> = {
	[K in T['type']]?: Visitor<NodeOf<K, T>, U, T>;
};

export type Visitor<T, U, V> = (node: T, context: Context<V, U>) => V | void;

export type Visitors<T extends BaseNode, U> = T['type'] extends '_'
	? never
	: SpecialisedVisitors<T, U> & { _?: Visitor<T, U, T> };

export interface Context<T, U> {
	next: (state?: U) => T | void;
	path: T[];
	state: U;
	stop: () => void;
	visit: (node: T, state?: U) => T;
}

/**
 * Walk an AST tree and allow visitors to inspect/replace nodes.
 */
export function walk<T extends BaseNode, U = Record<string, any> | null>(
	node: T,
	state: U,
	visitors: Visitors<T, U>
): T {
	const universal = (visitors as any)._ as Visitor<T, U, T | void> | undefined;

	let stopped = false;

	function default_visitor(_: T, { next }: { next: (next_state?: U) => void }) {
		next();
	}

	function visit(node: T, path: T[], state: U): T | undefined {
		if (stopped) return;
		if (!node || !('type' in node)) return;

		let result: T | void;

		const mutations: Record<string, any> = {};

		const context = {
			path,
			state,
			next: (next_state: U = state) => {
				path.push(node);
				for (const key in node) {
					if (key === 'type') continue;

					const child_node = (node as any)[key];
					if (child_node && typeof child_node === 'object') {
						if (Array.isArray(child_node)) {
							const array_mutations: Record<number, T> = {};
							const len = child_node.length;

							let mutated = false;

							for (let i = 0; i < len; i++) {
								const n = child_node[i];
								if (n && typeof n === 'object') {
									const res = visit(n, path, next_state);
									if (res) {
										array_mutations[i] = res;
										mutated = true;
									}
								}
							}

							if (mutated) {
								mutations[key] = child_node.map((n: any, i: number) => array_mutations[i] ?? n);
							}
						} else {
							const res = visit(child_node as T, path, next_state);
							if (res) {
								mutations[key] = res;
							}
						}
					}
				}
				path.pop();

				if (Object.keys(mutations).length > 0) {
					return apply_mutations(node, mutations);
				}
			},
			stop: () => {
				stopped = true;
			},
			visit: (next_node: T, next_state: U = state): T => {
				path.push(node);
				const res = visit(next_node, path, next_state) ?? next_node;
				path.pop();
				return res;
			}
		} as unknown as Context<T, U>;

		let visitor = (visitors[node.type as T["type"]] ?? default_visitor) as Visitor<T, U, T>;

		if (universal) {
			let inner_result: T | void;

			result = universal(node, {
				...context,
				next: (next_state: U = state) => {
					state = next_state;

					inner_result = visitor(node, {
						...context,
						state: next_state
					});

					return inner_result;
				}
			} as any);

            // @ts-expect-error TypeScript doesn't understand that `context.next(...)` is called immediately
			if (!result && inner_result) {
				result = inner_result;
			}
		} else {
			result = (visitor as Visitor<T, U, T | void>)(node, context as any);
		}

		if (!result) {
			if (Object.keys(mutations).length > 0) {
				result = apply_mutations(node, mutations);
			}
		}

		if (result) return result;
	}

	return (visit(node, [], state) ?? node) as T;
}

function apply_mutations<T extends Record<string, any>>(node: T, mutations: Record<string, any>): T {
	const obj: Record<string, any> = {};

	const descriptors = Object.getOwnPropertyDescriptors(node);

	for (const key in descriptors) {
		Object.defineProperty(obj, key, descriptors[key]!);
	}

	for (const key in mutations) {
		obj[key] = mutations[key];
	}

	return obj as T;
}