import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ChatBubble } from "../src/index.js";

afterEach(cleanup);

test("messages keep sender semantics, rich children, and Host attributes", () => {
  render(<>
    <ChatBubble direction="incoming" label="Partner" lang="ko"><a href="#reply">답장</a></ChatBubble>
    <ChatBubble direction="outgoing" label="Me" dir="rtl" className="product-message">first{"\n"}second</ChatBubble>
  </>);
  expect(screen.getByRole("group", { name: "Partner" }).getAttribute("data-ui-chat-bubble")).toBe("incoming");
  expect(screen.getByRole("group", { name: "Partner" }).lang).toBe("ko");
  expect(screen.getByRole("link", { name: "답장" }).getAttribute("href")).toBe("#reply");
  const outgoing = screen.getByRole("group", { name: "Me" });
  expect(outgoing.getAttribute("data-ui-chat-bubble")).toBe("outgoing");
  expect(outgoing.dir).toBe("rtl");
  expect(outgoing.className).toBe("product-message");
  expect(outgoing.textContent).toBe("first\nsecond");
});
