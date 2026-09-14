import {createFileRoute} from "@tanstack/react-router";
import {defineDemo} from "../../../../shared/demo-workbench/define-demo";
import {SheetViewsDemoRoute} from "../../../../routes/sheet-demo/SheetViewsDemoRoute";
export const Route=createFileRoute("/_page/demo/sheet-views")({component:SheetViewsDemoRoute,...defineDemo({source:"routes/sheet-demo/SheetViewsDemoRoute.tsx"})});
