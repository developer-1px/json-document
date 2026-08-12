import {
  createKeySelectionFamily,
  createRangeSelectionFamily,
  idlePointerInteraction,
  reducePressInteraction,
} from "../../src/index.js";

const keyFamily = createKeySelectionFamily();
const rangeFamily = createRangeSelectionFamily<number>();
const press = reducePressInteraction(idlePointerInteraction<number>(), {
  phase: "start",
  pointerId: "pointer:1",
  point: 1,
  operation: "replace",
});

void keyFamily;
void rangeFamily;
void press;
