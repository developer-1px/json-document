import { useState } from "react";
import {
  createWebKeyboardAdapter,
  type WebKeyboardCommand,
} from "@interactive-os/json-document-web";

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
