import { useState } from "react";

export type EditingObservedResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string };

export type EditingOperationResult = { readonly ok: boolean; readonly code?: string };

export type EditingResultMessage<Result extends EditingOperationResult> =
  | string
  | ((result: Result) => string);

export type EditingObservation<Intent> = {
  readonly announcement: string;
  readonly lastIntent: Intent | null;
  readonly lastResult: EditingObservedResult | null;
  readonly announce: (message: string) => void;
  readonly dispatch: <Result extends EditingOperationResult>(
    intent: Intent,
    action: (intent: Intent) => Result,
    success: EditingResultMessage<Result>,
    failure?: EditingResultMessage<Result>,
  ) => Result;
  readonly observe: <Result extends EditingOperationResult>(intent: Intent, result: Result) => Result;
  readonly observeResult: <Result extends EditingOperationResult>(result: Result) => Result;
  readonly run: <Result extends EditingOperationResult>(
    action: () => Result,
    success: EditingResultMessage<Result>,
    failure: EditingResultMessage<Result>,
  ) => Result;
};

/** Observes an Editing Intent lifecycle for host feedback and inspection. */
export function useEditingObservation<Intent>(initialAnnouncement: string): EditingObservation<Intent> {
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const [lastResult, setLastResult] = useState<EditingObservedResult | null>(null);

  function observe<Result extends EditingOperationResult>(intent: Intent, result: Result): Result {
    setLastIntent(intent);
    observeResult(result);
    return result;
  }

  function observeResult<Result extends EditingOperationResult>(result: Result): Result {
    setLastResult(projectResult(result));
    return result;
  }

  function run<Result extends EditingOperationResult>(
    action: () => Result,
    success: EditingResultMessage<Result>,
    failure: EditingResultMessage<Result>,
  ): Result {
    const result = action();
    setAnnouncement(messageFor(result.ok ? success : failure, result));
    return result;
  }

  function dispatch<Result extends EditingOperationResult>(
    intent: Intent,
    action: (intent: Intent) => Result,
    success: EditingResultMessage<Result>,
    failure: EditingResultMessage<Result> = (result) => result.ok ? "" : result.code ?? "editing.rejected",
  ): Result {
    return run(() => observe(intent, action(intent)), success, failure);
  }

  function announce(message: string): void {
    setAnnouncement(message);
  }

  return {
    announcement,
    lastIntent,
    lastResult,
    announce,
    dispatch,
    observe,
    observeResult,
    run,
  } as const;
}

function projectResult(result: EditingOperationResult): EditingObservedResult {
  return result.ok ? { ok: true } : { ok: false, code: result.code ?? "editing.rejected" };
}

function messageFor<Result extends EditingOperationResult>(
  message: EditingResultMessage<Result>,
  result: Result,
): string {
  return typeof message === "function" ? message(result) : message;
}
