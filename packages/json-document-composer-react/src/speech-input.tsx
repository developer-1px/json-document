import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { createWebSpeechInput, webSpeechRecognitionConstructor } from "@interactive-os/json-document-web";

/** Dictation inserts final segments through the Composer command, never editable DOM mutation. */
export function ComposerSpeechInput({ lang, onText, disabled }: { lang: string; onText: (text: string) => void; disabled: boolean }) {
  const [supported] = useState(() => !!webSpeechRecognitionConstructor());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const session = useRef<ReturnType<typeof createWebSpeechInput>>(null);
  const root = useRef<HTMLDivElement>(null);
  const insert = useRef(onText); insert.current = onText;
  const cancel = () => { session.current?.dispose(); session.current = null; setListening(false); setInterim(""); };
  useEffect(() => () => { session.current?.dispose(); }, []);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) cancel(); };
    const observer = new ResizeObserver(() => { if (!root.current?.getClientRects().length) cancel(); });
    if (root.current) observer.observe(root.current);
    const submit = (event: KeyboardEvent) => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) cancel(); };
    document.addEventListener("visibilitychange", visibility);

    const form = root.current?.closest("form");
    form?.addEventListener("keydown", submit, true);
    return () => { document.removeEventListener("visibilitychange", visibility); observer.disconnect(); form?.removeEventListener("keydown", submit, true); };
  }, []);
  if (!supported) return null;
  return <div ref={root} data-ui-composer-speech>
    <Command label={listening ? "음성 입력 중지" : "음성 입력"} aria-pressed={listening} disabled={disabled} preserveFocus onClick={() => {
      if (listening) { session.current?.stop(); return; }
      session.current?.dispose(); setError(""); setInterim("");
      session.current = createWebSpeechInput({ lang,
        onText: text => insert.current(`${text} `), onInterim: setInterim,
        onError: code => { setError(code === "not-allowed" || code === "service-not-allowed" ? "마이크 사용 권한을 허용해 주세요." : code === "no-speech" ? "음성이 감지되지 않았습니다. 다시 눌러 말씀해 주세요." : code === "audio-capture" ? "마이크를 찾을 수 없습니다." : "음성 인식을 시작하지 못했습니다. 연결 상태를 확인해 주세요."); },
        onEnd: () => { setListening(false); setInterim(""); },
      });
      setListening(true); session.current?.start();
    }}>{listening ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}</Command>
    {(listening || error) && <span role="status" data-ui-composer-speech-status>{error || interim || "듣고 있어요…"}</span>}
  </div>;
}
