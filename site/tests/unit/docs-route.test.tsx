import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
  document.head.innerHTML = [
    '<meta name="description" content="" />',
    '<meta property="og:title" content="" />',
    '<meta property="og:description" content="" />',
    '<meta property="og:url" content="" />',
    '<meta name="twitter:title" content="" />',
    '<meta name="twitter:description" content="" />',
    '<link rel="canonical" href="" />',
  ].join("");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  window.history.pushState(null, "", "/");
});

afterEach(cleanup);

describe("documentation routes", () => {
  test("renders package APIs and the Calendar profile without the API index masking them", async () => {
    window.history.pushState(null, "", "/docs/api/editing#calendar-protocol-profile-rc");
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Editing API" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Calendar protocol profile (RC)" }).id).toBe("calendar-protocol-profile-rc");
    expect(screen.queryByRole("heading", { level: 1, name: "JSON Document Protocol" })).toBeNull();

    window.history.pushState(null, "", "/docs/api/calendar");
    window.dispatchEvent(new Event("popstate"));
    expect(await screen.findByRole("heading", { level: 1, name: "Calendar API" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole("link", { name: "시간·반복·거절 계약: Editing의 Calendar protocol profile" }).getAttribute("href"))
      .toBe("/docs/api/editing#calendar-protocol-profile-rc");

    window.history.pushState(null, "", "/docs/api");
    window.dispatchEvent(new Event("popstate"));
    expect(await screen.findByRole("heading", { level: 1, name: "JSON Document Protocol" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "Calendar protocol profile (RC)" })).toBeNull();
  }, 15000);

  test("navigates across the keyed documentation registry", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

    await user.click(nav.getByRole("button", { name: "시작하기" }));
    await user.click(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "소개" }));
    await waitFor(() => expect(document.title).toBe("json-document Docs - json-document"));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://developer-1px.github.io/json-document/docs");
    expect(await screen.findByRole("heading", { level: 1 }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "소개" }).getAttribute("aria-current")).toBe("page");

    await user.click(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "Architecture" }));
    await waitFor(() => expect(document.title).toBe("Architecture - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Architecture" }, { timeout: 10000 })).toBeTruthy();

    expect(screen.queryByRole("navigation", { name: "Documentation pages" })).toBeNull();

    await user.click(nav.getByRole("button", { name: "모듈" }));
    await user.click(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "Connector", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connector Docs - json-document"), { timeout: 10000 });
    expect(await screen.findByRole("heading", { level: 1, name: "json-document Connectors" }, { timeout: 10000 })).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "React Reference" }));
    expect(await screen.findByRole("heading", { level: 1, name: "React Connector" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "useEditingObservation" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "Editing guide" })).toBeTruthy();

    await user.click(nav.getByRole("link", { name: "Editing", exact: true }));
    await user.click(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "Topology" }));
    await waitFor(() => expect(document.title).toBe("Topology - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Topology" }, { timeout: 10000 })).toBeTruthy();

    await user.click(nav.getByRole("link", { name: "JSON Document" }));
    await waitFor(() => expect(document.title).toBe("JSON Document Protocol - json-document"));
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("로컬·협업 구현이 공유하는 여섯 member의 JSONDocument 계약과 JSON 표준 연산 API를 설명합니다.");
    expect(await screen.findByRole("heading", { level: 1, name: "JSON Document Protocol" }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "소개" }).getAttribute("aria-current")).toBeNull();
    expect(nav.getByRole("link", { name: "JSON Document" }).getAttribute("aria-current")).toBe("page");
    const mobileSections = within(screen.getByRole("navigation", { name: "Documentation sections" }));
    expect(mobileSections.getByRole("link", { name: "작업별 진입점" }).getAttribute("href")).toBe("#작업별-진입점");
  });

  test("supports direct route entry for static-hosting fallbacks", async () => {
    window.history.pushState(null, "", "/docs/");
    render(<App />);
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }, { timeout: 10000 }));

    await waitFor(() => expect(document.title).toBe("json-document Docs - json-document"));
    expect(await screen.findByRole("heading", { level: 1 }, { timeout: 10000 })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "소개" }).getAttribute("aria-current")).toBe("page");

    window.history.pushState(null, "", "/docs/topology/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => expect(document.title).toBe("Topology - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Topology" })).toBeTruthy();
    expect(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "Topology" }).getAttribute("aria-current")).toBe("page");

    window.history.pushState(null, "", "/docs/api/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => expect(document.title).toBe("JSON Document Protocol - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "JSON Document Protocol" })).toBeTruthy();
    expect(nav.getByRole("link", { name: "JSON Document" }).getAttribute("aria-current")).toBe("page");
  });

  test("exposes the Interaction Handles ecosystem document", async () => {
    window.history.pushState(null, "", "/docs/affordance/handles");
    render(<App />);

    await waitFor(() => expect(document.title).toBe("Interaction Handles - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Interaction Handles" }, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "책임 경계" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Affordance API Reference" }).getAttribute("href")).toBe("/docs/api/affordance");
    expect(screen.getByRole("link", { name: "UI Primitives React API Reference" }).getAttribute("href")).toBe("/docs/api/ui-primitives-react");
    expect(screen.getByRole("region", { name: "Live demo: /affordances/handles" }).getAttribute("data-live-demo")).toBe("/affordances/handles");
  });
});
