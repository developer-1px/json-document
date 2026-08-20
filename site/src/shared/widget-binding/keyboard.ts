import { useState } from "react";
import {
  applyAffordance,
  resolveAffordanceKey,
} from "@interactive-os/json-document-affordance";
import {
  createWebKeyboardAdapter,
  type WebKeyboardCommand,
  type WebKeyboardStroke,
} from "@interactive-os/json-document-web";

export function editingCommandFromStroke(stroke: WebKeyboardStroke): WebKeyboardCommand | null {
  let command: WebKeyboardCommand | null = null;
  applyAffordance(resolveAffordanceKey(stroke), {
    hand: (hand) => {
      if (
        hand.type === "move"
        || hand.type === "boundary"
        || hand.type === "toggle"
        || hand.type === "delete"
        || hand.type === "undo"
        || hand.type === "redo"
      ) {
        command = hand;
      }
    },
  });
  return command;
}

export function useWidgetKeyboard() {
  const [keyboard] = useState(() => createWebKeyboardAdapter());
  const [lastCommand, setLastCommand] = useState<WebKeyboardCommand | null>(null);

  return {
    lastCommand,
    resolve(stroke: Parameters<typeof keyboard.resolve>[0]) {
      const command = keyboard.resolve(stroke);
      if (command) setLastCommand(command);
      return command;
    },
  };
}
