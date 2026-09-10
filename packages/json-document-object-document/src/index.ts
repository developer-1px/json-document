export type { ObjectBounds, ObjectPoint, ObjectDraft, DocumentObject, ObjectDocument, CanvasObjectKind, CanvasTextFormat, CanvasObjectDraft, CanvasObject, CanvasDocument } from "./object-model.js";
export { assertObjectDocument, assertCanvasDocument, assertCanvasImageSource, parseCanvasDocument, serializeCanvasDocument } from "./object-validation.js";
export { createCanvasObject, createCanvasPath, createCanvasImage, projectObject, projectObjectText, transformObject, type ObjectTransform, type ObjectTextProjection } from "./object-projection.js";
export { planObjectOperation, type ObjectOperation, type ObjectOperationPlan } from "./object-operation.js";
export { getObjectStyle, readObjectStyle, assertObjectStyle, type ObjectStyle, type ObjectStyleSelection } from "./object-style.js";
