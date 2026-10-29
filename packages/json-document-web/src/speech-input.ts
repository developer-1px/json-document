/** Browser speech recognition, with final text separated from replaceable interim text. */
export interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type WebSpeechRecognitionConstructor = new () => WebSpeechRecognition;

export function webSpeechRecognitionConstructor(): WebSpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as unknown as { SpeechRecognition?: WebSpeechRecognitionConstructor; webkitSpeechRecognition?: WebSpeechRecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function createWebSpeechInput(options: {
  lang: string;
  onText: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
  Recognition?: WebSpeechRecognitionConstructor;
}) {
  const Recognition = options.Recognition ?? webSpeechRecognitionConstructor();
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = options.lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  let committed = 0;
  let disposed = false;
  recognition.onresult = event => {
    if (disposed) return;
    const interim: string[] = [];
    for (let index = committed; index < event.results.length; index++) {
      const result = event.results[index]!;
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (text) options.onText(text);
        committed = index + 1;
      } else interim.push(result[0].transcript);
    }
    options.onInterim(interim.join(" "));
  };
  recognition.onerror = event => { if (!disposed) options.onError(event.error); };
  recognition.onend = () => { if (!disposed) { options.onInterim(""); options.onEnd(); } };
  return {
    start() { try { recognition.start(); } catch { options.onError("start-failed"); options.onEnd(); } },
    stop() { if (!disposed) recognition.stop(); },
    dispose() { disposed = true; recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.abort(); },
  };
}
