export type { ObjectBounds, ObjectPoint, ObjectDraft, DocumentObject, ObjectDocument, CanvasObjectKind, CanvasObjectDraft, CanvasObject, CanvasDocument } from "./object-model.js";
export { assertObjectDocument, assertCanvasDocument, assertCanvasImageSource, parseCanvasDocument, serializeCanvasDocument } from "./object-validation.js";
export { createCanvasObject, createCanvasPath, createCanvasImage, projectObject, transformObject, type ObjectTransform } from "./object-projection.js";
export { planObjectOperation, type ObjectOperation, type ObjectOperationPlan } from "./object-operation.js";
