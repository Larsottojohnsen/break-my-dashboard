import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
export async function startDemo(fixed = false) {
  const html = await readFile(
    new URL("../demo/index.html", import.meta.url),
    "utf8",
  );
  const items = [
    {
      id: "INV-1048",
      supplierName: "Northwind Studio",
      amount: "€2,480.00",
      status: "Pending",
    },
    {
      id: "INV-1049",
      supplierName: "Birch & Field",
      amount: "€840.00",
      status: "Pending",
    },
    {
      id: "INV-1050",
      supplierName: "Harbour Office",
      amount: "€1,120.00",
      status: "Pending",
    },
  ];
  const server = createServer((request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405);
      response.end();
      return;
    }
    if (request.url === "/api/invoices") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ items, total: items.length }));
    } else if (request.url === "/invoices" || request.url === "/") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        html.replace(/\/\*DEMO_FIXED\*\/\s*false/, JSON.stringify(fixed)),
      );
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as { port: number }).port;
  return {
    url: "http://127.0.0.1:" + port + "/invoices",
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
export function demoConfig(url: string) {
  return {
    schemaVersion: 1,
    url,
    endpoint: { method: "GET", path: "/api/invoices" },
    data: {
      arrayPath: "items",
      longStringFields: ["supplierName"],
      countPaths: ["total"],
    },
    checks: {
      target: { role: "button", name: "Approve first invoice" },
      loading: { testId: "invoices-loading" },
      empty: { testId: "invoices-empty" },
      error: { role: "alert" },
    },
  };
}
