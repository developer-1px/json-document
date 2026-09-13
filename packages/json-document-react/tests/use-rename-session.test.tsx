import {act, renderHook} from "@testing-library/react";
import {expect, test, vi} from "vitest";
import {useRenameSession} from "../src/use-rename-session.js";
test("owner replacement discards the draft and stale sessions cannot commit to the new owner", () => {
 const oldCommit=vi.fn(()=>false), newCommit=vi.fn(()=>true);
 const {result,rerender}=renderHook(({owner,tryCommit})=>useRenameSession<string>({owner,tryCommit}),{initialProps:{owner:{},tryCommit:oldCommit}});
 act(()=>result.current.session.begin("a","draft"));
 act(()=>result.current.session.commit());
 expect(result.current.snapshot?.draft).toBe("draft");
 const oldSession=result.current.session;
 rerender({owner:{},tryCommit:newCommit});
 expect(result.current.snapshot).toBeNull();
 act(()=>oldSession.commit()); expect(newCommit).not.toHaveBeenCalled();
 act(()=>result.current.session.begin("b","new")); act(()=>result.current.session.commit());
 expect(newCommit).toHaveBeenCalledWith("b","new"); expect(result.current.snapshot).toBeNull();
});
