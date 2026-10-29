import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { createAnnotationReviewQueue, createAnnotationReviewSession } from "@interactive-os/json-document-editing";
import { AnnotationReview } from "../src/index.js";
afterEach(cleanup);
it("shows a finished source automatically and continues reviewing the accepted source", async () => {
  const session = createAnnotationReviewSession({ id: "page", source: "original", width: 400, height: 200 });
  const queue = createAnnotationReviewQueue({ tasks: [{ id: "task", annotation: { id: "mark", target: { sourceId: "page", selector: { type: "point", x: 1, y: 1 } }, body: { instruction: "Fix" }, presentation: { type: "marker" } }, source: "original", result: "updated", state: "review", error: "" }] });
  render(<AnnotationReview session={session} queue={queue} liveSource="updated" label="review" title="Page" createId={() => "id"} renderContent={text => <text>{text}</text>} />);
  await waitFor(() => expect(screen.getByText("updated")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "확인" }));
  await waitFor(() => expect(session.snapshot.value.source).toBe("updated"));
  expect(screen.getByRole("application", { name: "review 표시" })).toBeTruthy();
  expect(screen.getByText("완료한 첨삭 1개")).toBeTruthy();
});
