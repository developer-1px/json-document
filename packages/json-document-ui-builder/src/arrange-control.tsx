import { useEffect, useRef, useState } from "react";
import { Command } from "@interactive-os/json-document-ui-primitives-react";

export function BuilderArrangeControl({arrange, onError, onApplied}: {onApplied: () => void; arrange: (signal: AbortSignal) => Promise<void>; onError: (error: string) => void}) {
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  return <>
    <Command disabled={busy} onClick={async () => {
      if (controller.current) return;
      const request = new AbortController(); controller.current = request; setBusy(true);
      try {await arrange(request.signal); if (!request.signal.aborted) onApplied();} catch(e) {if (!request.signal.aborted) onError(e instanceof Error ? e.message : "정리하지 못했습니다. 다시 시도해 주세요.");}
      finally {controller.current = null; setBusy(false);}
    }}>{busy ? "AI가 정리 중…" : "알아서 정리"}</Command>
    {busy && <Command onClick={() => controller.current?.abort()}>취소</Command>}
  </>;
}
