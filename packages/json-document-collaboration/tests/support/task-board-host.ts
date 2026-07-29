import type {
  JSONAppliedChange,
  JSONDocument,
  JSONDocumentCommitResult,
  JSONPatchOperation,
  JSONValue,
} from "@interactive-os/json-document";

interface TaskBoardCard {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

interface TaskBoardLane {
  readonly id: string;
  readonly title: string;
  readonly cards: ReadonlyArray<TaskBoardCard>;
}

interface TaskBoardSnapshot {
  readonly title: string;
  readonly lanes: ReadonlyArray<TaskBoardLane>;
}

export interface TaskBoardHost {
  snapshot(): TaskBoardSnapshot;
  laneIds(): ReadonlyArray<string>;
  cardIds(): ReadonlyArray<string>;
  card(id: string): TaskBoardCard | null;
  renameBoard(title: string): JSONDocumentCommitResult;
  addCard(laneId: string, card: TaskBoardCard): JSONDocumentCommitResult;
  updateCardText(cardId: string, text: string): JSONDocumentCommitResult;
  toggleCard(cardId: string): JSONDocumentCommitResult;
  moveCard(cardId: string, laneId: string): JSONDocumentCommitResult;
  removeCard(cardId: string): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}

export function taskBoardInitialValue(): JSONValue {
  return {
    title: "Release board",
    lanes: [
      {
        id: "todo",
        title: "Todo",
        cards: [
          { id: "base", text: "Prove the boundary", done: false },
        ],
      },
      {
        id: "doing",
        title: "Doing",
        cards: [],
      },
      {
        id: "done",
        title: "Done",
        cards: [],
      },
    ],
  };
}

/**
 * A product-shaped consumer which knows only the six-member JSONDocument
 * contract. Provider construction, collaboration, transport, and history stay
 * outside this module.
 */
export function createTaskBoardHost(document: JSONDocument): TaskBoardHost {
  const commit = (
    command: string,
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONDocumentCommitResult => {
    const capability = document.canPatch(operations);
    if (!capability.ok) return capability;
    return document.commit(operations, {
      metadata: {
        host: "task-board",
        command,
      },
    });
  };

  const lanePointer = (laneId: string): string | null => (
    parentPointerForValue(document, "$.lanes[*].id", laneId)
  );
  const cardPointer = (cardId: string): string | null => (
    parentPointerForValue(document, "$.lanes[*].cards[*].id", cardId)
  );

  return Object.freeze({
    snapshot(): TaskBoardSnapshot {
      return taskBoardSnapshot(document.value);
    },
    laneIds(): ReadonlyArray<string> {
      return taskBoardSnapshot(document.value).lanes.map((lane) => lane.id);
    },
    cardIds(): ReadonlyArray<string> {
      return taskBoardSnapshot(document.value).lanes.flatMap(
        (lane) => lane.cards.map((card) => card.id),
      );
    },
    card(id: string): TaskBoardCard | null {
      const pointer = cardPointer(id);
      if (pointer === null) return null;
      const result = document.at(pointer);
      return result.ok ? taskBoardCard(result.value) : null;
    },
    renameBoard(title: string): JSONDocumentCommitResult {
      return commit("rename-board", [{
        op: "replace",
        path: "/title",
        value: title,
      }]);
    },
    addCard(laneId: string, card: TaskBoardCard): JSONDocumentCommitResult {
      const lane = lanePointer(laneId);
      if (lane === null) return missing("lane", laneId);
      return commit("add-card", [{
        op: "add",
        path: `${lane}/cards/-`,
        value: card as unknown as JSONValue,
      }]);
    },
    updateCardText(cardId: string, text: string): JSONDocumentCommitResult {
      const card = cardPointer(cardId);
      if (card === null) return missing("card", cardId);
      return commit("update-card-text", [{
        op: "replace",
        path: `${card}/text`,
        value: text,
      }]);
    },
    toggleCard(cardId: string): JSONDocumentCommitResult {
      const card = cardPointer(cardId);
      if (card === null) return missing("card", cardId);
      const current = document.at(`${card}/done`);
      if (!current.ok || typeof current.value !== "boolean") {
        return missing("card", cardId);
      }
      return commit("toggle-card", [{
        op: "replace",
        path: `${card}/done`,
        value: !current.value,
      }]);
    },
    moveCard(cardId: string, laneId: string): JSONDocumentCommitResult {
      const card = cardPointer(cardId);
      if (card === null) return missing("card", cardId);
      const lane = lanePointer(laneId);
      if (lane === null) return missing("lane", laneId);
      return commit("move-card", [{
        op: "move",
        from: card,
        path: `${lane}/cards/-`,
      }]);
    },
    removeCard(cardId: string): JSONDocumentCommitResult {
      const card = cardPointer(cardId);
      if (card === null) return missing("card", cardId);
      return commit("remove-card", [{
        op: "remove",
        path: card,
      }]);
    },
    subscribe(listener: (change: JSONAppliedChange) => void): () => void {
      return document.subscribe(listener);
    },
  });
}

function parentPointerForValue(
  document: JSONDocument,
  jsonPath: string,
  expected: string,
): string | null {
  const query = document.query(jsonPath);
  if (!query.ok) return null;
  for (const pointer of query.pointers) {
    const result = document.at(pointer);
    if (result.ok && result.value === expected) {
      return pointer.slice(0, pointer.lastIndexOf("/"));
    }
  }
  return null;
}

function taskBoardSnapshot(value: JSONValue): TaskBoardSnapshot {
  if (
    !isRecord(value)
    || typeof value.title !== "string"
    || !Array.isArray(value.lanes)
  ) {
    throw new TypeError("task-board document has an invalid root");
  }
  for (const lane of value.lanes) taskBoardLane(lane);
  return value as unknown as TaskBoardSnapshot;
}

function taskBoardLane(value: JSONValue): TaskBoardLane {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.title !== "string"
    || !Array.isArray(value.cards)
  ) {
    throw new TypeError("task-board document has an invalid lane");
  }
  for (const card of value.cards) taskBoardCard(card);
  return value as unknown as TaskBoardLane;
}

function taskBoardCard(value: JSONValue): TaskBoardCard {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.text !== "string"
    || typeof value.done !== "boolean"
  ) {
    throw new TypeError("task-board document has an invalid card");
  }
  return value as unknown as TaskBoardCard;
}

function isRecord(
  value: JSONValue,
): value is { readonly [key: string]: JSONValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function missing(
  kind: "card" | "lane",
  id: string,
): Extract<JSONDocumentCommitResult, { readonly ok: false }> {
  return {
    ok: false,
    code: `${kind}_not_found`,
    reason: `${kind} ${id} does not exist`,
  };
}
