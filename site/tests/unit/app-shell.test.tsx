import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
  resetDocument("/");
});

afterEach(cleanup);

describe("official site shell", () => {
  test("serves the official overview at the root route", async () => {
    render(<App />);

    expect((await screen.findByRole("link", { name: "Skip to content" })).getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("heading", { level: 1, name: "json-document" })).toBeTruthy();
    expect(screen.getByText("Agent-native artifact editing의 개발 정본.")).toBeTruthy();
    expect(screen.getByText(/제품을 먼저 만들고/)).toBeTruthy();
    const home = within(screen.getByRole("main"));
    expect(home.getAllByRole("link", { name: "Applications 보기" }).map((link) => link.getAttribute("href"))).toEqual([
      "/applications",
      "/applications",
    ]);
    expect(Array.from(document.querySelectorAll("[data-home-scene]")).map((scene) => scene.getAttribute("data-home-scene"))).toEqual([
      "hero",
      "foundation",
      "hands-artifact",
      "applications",
      "how-we-build",
    ]);
    expect(home.getByRole("heading", { level: 2, name: "모든 편집은 같은 값에서 시작합니다." })).toBeTruthy();
    expect(home.getByRole("heading", { level: 2, name: "Hands가 Artifact를 만지고 편집합니다." })).toBeTruthy();
    expect(home.getByRole("heading", { level: 2, name: "제품에서 책임을 발견합니다." })).toBeTruthy();
    expect(home.getByRole("heading", { level: 2, name: "제품에서 시작해 생태계로 돌아갑니다." })).toBeTruthy();
    expect(home.queryByText("v3.0.0")).toBeNull();
    expect(home.queryByRole("link", { name: "Read the API" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });

  test("projects the product hierarchy into the site navigation", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));

    expect(nav.queryByRole("group", { name: "Start" })).toBeNull();
    expect(nav.queryByRole("group", { name: "Core" })).toBeNull();
    expect(nav.queryByRole("link", { name: "소개" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Replica" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Dependency map" })).toBeNull();
    await user.click(nav.getByRole("button", { name: "시작하기" }));
    expect(groupLinks(nav, "시작하기")).toEqual(["소개", "빠른 시작", "Architecture"]);
    await user.click(nav.getByRole("button", { name: "모듈" }));
    expect(groupLinks(nav, "모듈")).toEqual([
      "전체 모듈", "JSON Document", "Document Types", "Editing", "Collaboration", "Adapter", "Connector", "Affordance", "UI Primitives",
    ]);
    await user.click(nav.getByRole("button", { name: "편집 조합 · Hands" }));
    expect(groupLinks(nav, "편집 조합 · Hands")).toEqual(expect.arrayContaining([
      "장르별 예제", "지원 범위", "Order", "Object", "Tree", "Database", "Composer", "Mention",
    ]));
    expect(groupLinks(nav, "편집 조합 · Hands")).not.toContain("Official Hands 목표");
    await user.click(nav.getByRole("button", { name: "설계와 진행 상태" }));
    expect(groupLinks(nav, "설계와 진행 상태")).toEqual(expect.arrayContaining([
      "설계 현황", "Official Hands 목표", "소유권 감사", "Artifact · Prototype", "개발 원칙",
    ]));
    await user.click(nav.getByRole("button", { name: "Applications" }));
    expect(groupLinks(nav, "Applications")).toEqual(["Overview", "Bear", "Calendar", "AI Agent"]);
    expect(nav.getByRole("link", { name: "JSON Document", exact: true }).getAttribute("href")).toBe("/docs/api");
    expect(nav.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual([
      "시작하기", "모듈", "편집 조합 · Hands", "Applications", "설계와 진행 상태",
    ]);
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    await user.click(nav.getByRole("link", { name: "json-document" }));
    window.history.pushState(null, "", "/connectors");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(document.title).toBe("Connectors - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "json-document Connectors" }, {timeout:5000})).toBeTruthy();
    const catalog = within(document.querySelector("[data-doc-content]") as HTMLElement);
    expect(catalog.getByRole("link", {name:"Markdown React",exact:true}).getAttribute("href")).toBe("/docs/api/markdown-react");
    expect(catalog.getByRole("link", {name:"Rich Text React",exact:true}).getAttribute("href")).toBe("/docs/api/rich-text-react");
    expect(catalog.getByRole("link", {name:"Validate commits",exact:true}).getAttribute("href")).toBe("/connectors/zod/validate");

    await user.click(within(nav.getByRole("group", { name: "편집 조합 · Hands" })).getByRole("link", { name: "Database", exact: true }));
    const databaseCrumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(databaseCrumb.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/");
    expect(databaseCrumb.getByRole("link", { name: "편집 조합 · Hands" }).getAttribute("href")).toBe("/editors");
    expect(databaseCrumb.getByText("Database")).toBeTruthy();

    await user.click(within(nav.getByRole("group", { name: "모듈" })).getByRole("link", { name: "Connector", exact: true }));
    expect(await screen.findByRole(
      "heading",
      { level: 1, name: "json-document Connectors" },
      { timeout: 5000 },
    )).toBeTruthy();
  }, 10000);

  test("exposes Calendar and Object owners without closing the remaining Document Types TBD boundary", async () => {
    resetDocument("/docs/document-types");
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Document Types · TBD" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "책임" })).toBeTruthy();
    expect(screen.getByText(/Calendar와 Object는 공개 소유자와 소비 경계를 확정했고/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "현재 소유자와 후보" })).toBeTruthy();
    const breadcrumb = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(breadcrumb.getByRole("link", { name: "모듈" }).getAttribute("href")).toBe("/docs/modules");
    expect(breadcrumb.getByText("Document Types")).toBeTruthy();
  });

  test("renders the Calendar owner API reference and package-owned contract", async () => {
    resetDocument("/docs/api/calendar-document");
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Calendar Document Type API" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Calendar Document Type 계약 · RC" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "validateCalendarDocument", exact: true }).length).toBeGreaterThan(0);
  });

  test("keeps the site chrome mounted across interior routes", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(await screen.findByRole("navigation", { name: "Site navigation" }));
    const brand = screen.getByRole("link", { name: "json-document" });
    const siteNav = screen.getByRole("navigation", { name: "Site navigation" });

    await user.click(nav.getByRole("button", { name: "시작하기" }));
    await user.click(within(nav.getByRole("group", { name: "시작하기" })).getByRole("link", { name: "소개" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
    const frame = await waitFor(() => {
      const node = document.querySelector("[data-page-frame]");
      expect(node).toBeTruthy();
      return node;
    });

    await user.click(nav.getByRole("button", { name: "모듈" }));
    await user.click(nav.getByRole("link", { name: "JSON Document" }));
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    await waitFor(() => expect(crumb.getByText("JSON Document")).toBeTruthy());
    expect(screen.getByRole("link", { name: "json-document" })).toBe(brand);
    expect(screen.getByRole("navigation", { name: "Site navigation" })).toBe(siteNav);
    expect(document.querySelector("[data-page-frame]")).toBe(frame);
    const header = document.querySelector("[data-page-header]");
    expect(header?.contains(screen.getByRole("navigation", { name: "Breadcrumb" }))).toBe(true);
    expect(header?.querySelector("h1")).toBeTruthy();

    await user.click(nav.getByRole("button", { name: "편집 조합 · Hands" }));
    await user.click(within(nav.getByRole("group", { name: "편집 조합 · Hands" })).getByRole("link", { name: "장르별 예제", exact: true }));
    await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
  });
});

function groupLinks(nav: ReturnType<typeof within>, name: string): string[] {
  return within(nav.getByRole("group", { name })).getAllByRole("link").map((link) => link.textContent ?? "");
}

function resetDocument(path: string) {
  document.documentElement.lang = "en";
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
  window.history.pushState(null, "", path);
}
