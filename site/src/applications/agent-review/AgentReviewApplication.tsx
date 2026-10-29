import { SlidesApplication } from "../slides/SlidesApplication";
import { createReviewDocument } from "../../shared/demo-workbench/agent-review-demo-document";

export function AgentReviewApplication() {
  return <SlidesApplication workspaceId="agent-review" title="함께 고치기" description="고칠 곳을 짚고 말하세요. 반영된 내용을 그 자리에서 확인하세요." createDocument={createReviewDocument} />;
}
