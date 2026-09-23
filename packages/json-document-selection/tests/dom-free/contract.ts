import {
  createKeySelectionFamily,
  createRangeSelectionFamily,
} from "../../src/index.js";

const keyFamily = createKeySelectionFamily();
const rangeFamily = createRangeSelectionFamily<number>();

void keyFamily;
void rangeFamily;
