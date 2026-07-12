import {
  resolveId,
} from "./resolve.js";
import {
  readCurrentSnapshot,
} from "./snapshot.js";
import type {
  IdResolver,
  IdResolverDocument,
  IdResolverOptions,
} from "./types.js";

export function createIdResolver<T>(
  doc: IdResolverDocument<T>,
  options: IdResolverOptions,
): IdResolver {
  return {
    current: () => readCurrentSnapshot(doc, options.scopes),
    resolve(scope, id) {
      return resolveId(options.scopes, readCurrentSnapshot(doc, options.scopes), scope, id);
    },
  };
}
