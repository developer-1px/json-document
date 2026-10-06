import {createFileRoute} from "@tanstack/react-router";
import {SheetApplication} from "../../../applications/sheet/SheetApplication";
export const Route = createFileRoute("/applications/sheet")({component:SheetApplication});
