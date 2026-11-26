# Configuration schema 1

```json
{
  "schemaVersion": 1,
  "url": "http://127.0.0.1:3000/invoices",
  "endpoint": { "method": "GET", "path": "/api/invoices" },
  "data": {
    "arrayPath": "items",
    "longStringFields": ["supplierName"],
    "countPaths": ["total"]
  },
  "viewports": [
    { "width": 390, "height": 844 },
    { "width": 1440, "height": 900 }
  ],
  "checks": {
    "target": { "role": "button", "name": "Approve first invoice" },
    "error": { "role": "alert" },
    "loading": { "testId": "invoices-loading" },
    "empty": { "testId": "invoices-empty" }
  },
  "timing": { "delayMs": 1000, "timeoutMs": 5000, "runTimeoutMs": 180000 }
}
```

Use arrayPath "" for a root array and dot paths such as data.records for nested arrays. Object path components use letters, digits and underscores and cannot be prototype keys. Nested array indexing is outside this schema.

longStringFields are explicit paths within each array item. Only existing string values are replaced. Choose display fields from app source. IDs, enums, dates and machine fields are preserved by leaving them outside the field list. Empty mode preserves the envelope and zeroes documented numeric countPaths. Missing fields or empty long-value data cause coverage skips.

All checks are optional. Each selector must identify exactly one element in its relevant state. Supported roles are button, link, alert, status, table, list and heading. Role names use exact matching. Unknown expectations produce observations with skipped checks.

One to four unique viewports are allowed, widths 240–3840 and heights 240–2160. Delays range from 200–10000 ms. The state timeout must exceed delay by at least 500 ms and cannot exceed 30000 ms. Run deadlines range up to 600000 ms. Context shutdown enforces a scenario deadline of timeoutMs plus 3000 ms.

The selected endpoint must return HTTP 200 JSON in the baseline. Responses are limited to 2 MiB and arrays to 10000 items. The maximum matrix has twenty scenarios. Reports omit response bodies and exception text. Configuration is at most 64 KiB. Replay retains source hashes, timing and checks and obtains a fresh response.

Loopback HTTP(S) hosts are localhost, 127.0.0.1 and [::1]. Route queries up to 2048 characters and simple hash routes up to 256 characters are supported. Hash routes contain letters, digits, underscores, hyphens and slashes. URL credentials, common authentication query parameters and cross-origin endpoint paths are rejected. Pathname matching applies to all GET requests for the selected endpoint during a case. Multiple hits are counted.

State selectors that match multiple elements produce a coverage skip with the match count. Narrow the selector using a documented accessible name or stable testId. Authenticated runs save a requiresLogin flag and generated replay commands request a new interactive login. Session data remains in memory.
