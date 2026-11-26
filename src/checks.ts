import type { Page } from "playwright";
import type { Config, Selector } from "./config.js";
export interface Check {
  name: string;
  status: "passed" | "finding" | "skipped";
  expected: string | number;
  observed: string | number;
  inherited?: boolean;
}
export function locator(page: Page, selector: Selector) {
  return "testId" in selector
    ? page.getByTestId(selector.testId)
    : page.getByRole(selector.role as Parameters<Page["getByRole"]>[0], {
        name: selector.name,
        exact: true,
      });
}
export async function expectedState(
  page: Page,
  selector: Selector | undefined,
  name: string,
  timeout: number,
): Promise<Check> {
  if (!selector)
    return {
      name,
      status: "skipped",
      expected: "Documented selector",
      observed: "No expectation configured",
    };
  try {
    await locator(page, selector).waitFor({ state: "visible", timeout });
    return { name, status: "passed", expected: "visible", observed: "visible" };
  } catch {
    return {
      name,
      status: "finding",
      expected: "visible",
      observed: "absent or ambiguous at deadline",
    };
  }
}
export async function layout(page: Page, config: Config): Promise<Check[]> {
  const width = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ),
  );
  const viewport = page.viewportSize()!.width;
  const checks: Check[] = [
    {
      name: "page-overflow",
      status: width > viewport + 1 ? "finding" : "passed",
      expected: viewport,
      observed: width,
    },
  ];
  if (config.checks.target) {
    const target = locator(page, config.checks.target);
    if ((await target.count()) !== 1 || !(await target.isVisible())) {
      checks.push({
        name: "target-horizontal-position",
        status: "skipped",
        expected: "One visible target",
        observed: "Target absent or ambiguous in this state",
      });
    } else {
      const box = await target.boundingBox();
      if (box)
        checks.push({
          name: "target-horizontal-position",
          status:
            box.x < -1 || box.x + box.width > viewport + 1
              ? "finding"
              : "passed",
          expected: "Horizontal bounds 0–" + viewport,
          observed: Math.round(box.x) + "–" + Math.round(box.x + box.width),
        });
    }
  }
  return checks;
}
