import type { JSONValue } from "@interactive-os/json-document";

const defaultParameter = "state";

export function readJSONState(search: string, parameter = defaultParameter): JSONValue | null {
  const encoded = new URLSearchParams(search).get(parameter);
  if (encoded === null) return null;

  try {
    return JSON.parse(encoded) as JSONValue;
  } catch {
    return null;
  }
}

export function urlWithJSONState(url: string, value: JSONValue, parameter = defaultParameter): string {
  const next = new URL(url);
  next.searchParams.set(parameter, JSON.stringify(value));
  return next.toString();
}

export function urlWithoutJSONState(url: string, parameter = defaultParameter): string {
  const next = new URL(url);
  next.searchParams.delete(parameter);
  return next.toString();
}
