import { at, assign, type Config } from "./config.js";
export const scenarios = [
  "normal",
  "empty",
  "slow",
  "http-500",
  "long-values",
] as const;
export type Scenario = (typeof scenarios)[number];
export function mutate(
  payload: unknown,
  scenario: Scenario,
  data: Config["data"],
) {
  let body = structuredClone(payload);
  const items = at(body, data.arrayPath);
  if (!Array.isArray(items))
    throw new Error("Configured arrayPath does not identify an array.");
  if (items.length > 10000) throw new Error("Array exceeds 10,000 items.");
  let changed = 0;
  if (scenario === "empty") {
    body = assign(body, data.arrayPath, []);
    for (const path of data.countPaths ?? []) {
      if (typeof at(body, path) !== "number")
        throw new Error("countPaths must identify numbers.");
      assign(body, path, 0);
    }
    changed = items.length;
  }
  if (scenario === "long-values") {
    for (const item of items)
      for (const field of data.longStringFields) {
        if (typeof at(item, field) !== "string") continue;
        assign(item, field, "ExtremelyLongSyntheticSupplierName".repeat(24));
        changed++;
      }
    if (!changed)
      throw new Error("No explicit display string fields could be changed.");
  }
  return { body, changed };
}
export function shape(value: unknown): unknown {
  if (Array.isArray(value))
    return { array: value.length ? shape(value[0]) : null };
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, shape(item)]),
    );
  return value === null ? "null" : typeof value;
}
