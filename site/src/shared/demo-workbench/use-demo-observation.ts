import { useState } from "react";

export type DemoObservedResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string };

type OperationResult = { readonly ok: boolean; readonly code?: string };

type ResultMessage<Result extends OperationResult> =
  | string
  | ((result: Result) => string);

export function useDemoObservation<Intent>(initialAnnouncement: string) {
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const [lastResult, setLastResult] = useState<DemoObservedResult | null>(null);

  function observe<Result extends OperationResult>(intent: Intent, result: Result): Result {
    setLastIntent(intent);
    observeResult(result);
    return result;
  }

  function observeResult<Result extends OperationResult>(result: Result): Result {
    setLastResult(projectResult(result));
    return result;
  }

  function run<Result extends OperationResult>(
    action: () => Result,
    success: ResultMessage<Result>,
    failure: ResultMessage<Result>,
  ): Result {
    const result = action();
    setAnnouncement(messageFor(result.ok ? success : failure, result));
    return result;
  }

  function dispatch<Result extends OperationResult>(
    intent: Intent,
    action: (intent: Intent) => Result,
    success: ResultMessage<Result>,
    failure: ResultMessage<Result> = (result) => result.ok ? "" : result.code ?? "editing.rejected",
  ): Result {
    return run(() => observe(intent, action(intent)), success, failure);
  }

  return {
    announcement,
    lastIntent,
    lastResult,
    announce: setAnnouncement,
    dispatch,
    observe,
    observeResult,
    run,
  } as const;
}

function projectResult(result: OperationResult): DemoObservedResult {
  return result.ok ? { ok: true } : { ok: false, code: result.code ?? "editing.rejected" };
}

function messageFor<Result extends OperationResult>(message: ResultMessage<Result>, result: Result): string {
  return typeof message === "function" ? message(result) : message;
}
