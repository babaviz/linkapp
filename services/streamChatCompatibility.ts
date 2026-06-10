/**
 * StreamChat Compatibility Bridge
 *
 * Minimizes "property is not configurable" crashes by:
 * - Soft-handling redefinitions that originate from stream-chat packages in development
 * - Providing a proxy helper for problematic objects
 *
 * Import this file before any Stream Chat components.
 */

// Env flags
declare const global: any;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// Track objects that are proxied to avoid double wrapping
const patchedObjects = new WeakSet<object>();

// Patch Object.defineProperty in development to tolerate non-configurable redefinitions from stream-chat
function applyDefinePropertyPatch() {
  if (!isDev) return;
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj: any, prop: PropertyKey, descriptor: PropertyDescriptor) {
    try {
      return originalDefineProperty(obj, prop, descriptor);
    } catch (error: any) {
      if (error?.message?.includes('not configurable')) {
        const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (existingDescriptor && existingDescriptor.configurable === false) {
          const sameValue =
            (!('value' in descriptor) || (descriptor as any).value === (existingDescriptor as any).value) &&
            (!('get' in descriptor) || (descriptor as any).get === (existingDescriptor as any).get) &&
            (!('set' in descriptor) || (descriptor as any).set === (existingDescriptor as any).set);
          if (sameValue) return obj;

          // Only absorb if the call originates from stream-chat related code
          const stack = new Error().stack || '';
          if (stack.includes('stream-chat')) {
            if (isDev) { /* Dev mode */ }
            return obj;
          }
        }
      }
      throw error;
    }
  } as typeof Object.defineProperty;
}

export function createStreamChatProxy<T extends object>(obj: T): T {
  if (!isDev || !obj || typeof obj !== 'object' || patchedObjects.has(obj)) return obj;
  patchedObjects.add(obj);
  return new Proxy(obj, {
    set(target, prop, value) {
      try {
        (target as any)[prop as any] = value;
        return true;
      } catch (error: any) {
        if (isDev) { /* Dev error logging */ }
        return true;
      }
    },
    defineProperty(target, prop, descriptor) {
      try {
        Object.defineProperty(target, prop as any, descriptor as any);
        return true;
      } catch (error: any) {
        // Error handled
        return true;
      }
    },
  }) as T;
}

function patchPromiseFinally() {
  if (!isDev) return;
  const proto: any = Promise.prototype as any;
  if (!proto.finally) return;
  const originalFinally = proto.finally;
  proto.finally = function (onFinally: any) {
    try {
      return originalFinally.call(this, onFinally);
    } catch (error: any) {
      if (isDev) 
      return (this as Promise<any>).then(
        (value) => Promise.resolve(onFinally()).then(() => value),
        (reason) => Promise.resolve(onFinally()).then(() => Promise.reject(reason))
      );
    }
  };
}

// Apply patches at module load in development
applyDefinePropertyPatch();
patchPromiseFinally();

