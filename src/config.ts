export type Selector = { role: string; name?: string } | { testId: string };
export interface Config {
  schemaVersion: 1;
  url: string;
  endpoint: { method: "GET"; path: string };
  data: {
    arrayPath: string;
    longStringFields: string[];
    countPaths?: string[];
  };
  viewports: { width: number; height: number }[];
  checks: {
    target?: Selector;
    error?: Selector;
    loading?: Selector;
    empty?: Selector;
  };
  timing: { delayMs: number; timeoutMs: number; runTimeoutMs: number };
}
export function localUrl(input: string): URL {
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Use a loopback HTTP(S) URL without credentials, query or fragment.",
    );
  }
  return url;
}
function integer(value: unknown, min: number, max: number): value is number {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}
const safePath = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 200 &&
  (value === "" ||
    value
      .split(".")
      .every(
        (part) =>
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(part) &&
          !["__proto__", "prototype", "constructor"].includes(part),
      ));
export function validate(input: unknown): Config {
  if (!input || typeof input !== "object")
    throw new Error("Configuration must be an object.");
  const c = input as Config;
  if (c.schemaVersion !== 1) throw new Error("schemaVersion must be 1.");
  const url = localUrl(c.url);
  if (
    c.endpoint?.method !== "GET" ||
    typeof c.endpoint.path !== "string" ||
    !c.endpoint.path.startsWith("/") ||
    c.endpoint.path.startsWith("//") ||
    new URL(c.endpoint.path, url).origin !== url.origin ||
    /[?#\\]/.test(c.endpoint.path) ||
    c.endpoint.path.length > 500
  )
    throw new Error("endpoint must select one same-origin GET pathname.");
  if (
    !c.data ||
    !safePath(c.data.arrayPath) ||
    !Array.isArray(c.data.longStringFields) ||
    c.data.longStringFields.length > 12 ||
    !c.data.longStringFields.every(
      (field) => safePath(field) && field.length > 0,
    ) ||
    (c.data.countPaths !== undefined &&
      (!Array.isArray(c.data.countPaths) ||
        c.data.countPaths.length > 12 ||
        !c.data.countPaths.every((path) => safePath(path) && path.length > 0)))
  )
    throw new Error("Invalid data paths or display fields.");
  const viewports = c.viewports ?? [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ];
  if (
    !Array.isArray(viewports) ||
    viewports.length < 1 ||
    viewports.length > 4 ||
    !viewports.every(
      (v) => integer(v.width, 240, 3840) && integer(v.height, 240, 2160),
    ) ||
    new Set(viewports.map((v) => v.width + "x" + v.height)).size !==
      viewports.length
  )
    throw new Error("Use 1–4 unique viewports from 240 to 3840 × 2160.");
  const checks = c.checks ?? {};
  if (typeof checks !== "object" || Array.isArray(checks))
    throw new Error("Invalid checks.");
  for (const [key, selector] of Object.entries(checks)) {
    if (
      !["target", "error", "loading", "empty"].includes(key) ||
      !selector ||
      typeof selector !== "object"
    )
      throw new Error("Unknown check or invalid selector.");
    if ("testId" in selector) {
      if (
        typeof selector.testId !== "string" ||
        !selector.testId ||
        selector.testId.length > 150
      )
        throw new Error("Invalid testId.");
    } else if (
      !("role" in selector) ||
      ![
        "button",
        "link",
        "alert",
        "status",
        "table",
        "list",
        "heading",
      ].includes(selector.role) ||
      (selector.name !== undefined &&
        (typeof selector.name !== "string" || selector.name.length > 150))
    ) {
      throw new Error("Use a supported role/name or testId selector.");
    }
  }
  const timing = {
    delayMs: c.timing?.delayMs ?? 1000,
    timeoutMs: c.timing?.timeoutMs ?? 5000,
    runTimeoutMs: c.timing?.runTimeoutMs ?? 180000,
  };
  if (
    !integer(timing.delayMs, 200, 10000) ||
    !integer(timing.timeoutMs, timing.delayMs + 500, 30000) ||
    !integer(timing.runTimeoutMs, timing.timeoutMs, 600000)
  )
    throw new Error("Invalid timing limits.");
  return {
    schemaVersion: 1,
    url: url.href,
    endpoint: c.endpoint,
    data: c.data,
    viewports,
    checks,
    timing,
  };
}
export function at(root: any, path: string): any {
  return path === ""
    ? root
    : path.split(".").reduce((value, part) => value?.[part], root);
}
export function assign(root: any, path: string, value: unknown): any {
  if (!path) return value;
  const parts = path.split(".");
  const parent = at(root, parts.slice(0, -1).join("."));
  if (!parent || typeof parent !== "object" || !(parts.at(-1)! in parent))
    throw new Error("Configured path is absent.");
  parent[parts.at(-1)!] = value;
  return root;
}
