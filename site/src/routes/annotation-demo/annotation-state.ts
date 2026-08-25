import { ANNOTATION_PROFILE_V1, type AnnotationDocument, type AnnotationSource } from "@interactive-os/json-document-editing";

export const annotationSource: AnnotationSource = { id: "cat-enter", src: "/cat-enter.png", width: 1200, height: 800 };
export const initialAnnotationDocument: AnnotationDocument = { profile: ANNOTATION_PROFILE_V1, id: "annotation-demo", sources: [annotationSource], annotations: [] };
