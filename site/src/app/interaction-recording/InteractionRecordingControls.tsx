import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { useEffect, useState } from "react";
import {
  bindWebRecordingArchive, createWebInteractionRecorder, createWebRecordingArchive,
  downloadWebInteractionRecording,
  type WebInteractionRecorder, type WebInteractionRecording, type WebRecordingSaveResult,
} from "@interactive-os/json-document-web/interaction-recording";

/** Site-wide development controls; capture and persistence live in the Web owner. */
export function InteractionRecordingControls() {
  const [recorder, setRecorder] = useState<WebInteractionRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [last, setLast] = useState<WebInteractionRecording | null>(null);
  const [saved, setSaved] = useState<WebRecordingSaveResult | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const current = createWebInteractionRecorder({ document });
    const archive = createWebRecordingArchive({ endpoint: "/__interaction-recordings", storage: localStorage, fetch: window.fetch.bind(window) });
    const unbind = bindWebRecordingArchive(current, archive, (result, snapshot) => {
      if (!snapshot.endedAt) return;
      setSaved(result); setLast(snapshot); setSaving(false);
    });
    const unsubscribe = current.subscribe(() => {
      setRecording(current.recording);
      if (!current.recording) { setLast(current.snapshot()); setSaving(true); }
    });
    setRecorder(current);
    return () => { current.dispose(); unsubscribe(); unbind(); };
  }, []);
  const start = () => { setLast(null); setSaved(null); recorder?.start(); };
  return <aside data-interaction-recorder aria-label="입력 진단 기록" className={classes("fixed bottom-3 right-3 z-[100] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 px-2 py-1", ui.frame.app)}>
    <Command preserveFocus className="px-2 py-1"
      aria-label={recording ? "기록 종료" : "REC 기록 시작"} disabled={!recorder}
      onClick={recording ? () => recorder?.stop() : start}>
      {recording ? "■ STOP" : "● REC"}
    </Command>
    <span role="status" className={ui.text.meta}>
      {recording ? "입력 내용 기록 중" : saving ? "저장 중…" : saved?.ok ? `저장됨 · ${saved.id.slice(0, 8)}` : saved ? "서버 저장 실패 · JSON을 보관하세요" : ""}
      {last?.reason === "limit" ? " · 기록 한도 도달" : ""}
    </span>
    {last && !recording ? <Command preserveFocus className="px-2 py-1"
      onClick={() => downloadWebInteractionRecording(document, last)}>JSON</Command> : null}
  </aside>;
}
