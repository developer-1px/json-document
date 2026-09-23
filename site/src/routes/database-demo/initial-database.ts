import type { DatabaseDocument } from "@interactive-os/json-document-editing";

export const initialDatabase: DatabaseDocument = {
  schema: {
    properties: [
      { id: "name", name: "Name", type: "title", options: [] },
      { id: "note", name: "Note", type: "text", options: [] },
      { id: "score", name: "Score", type: "number", options: [] },
      {
        id: "status",
        name: "Status",
        type: "select",
        options: [
          { id: "backlog", name: "Backlog" },
          { id: "progress", name: "In progress" },
          { id: "done", name: "Done" },
        ],
      },
      { id: "complete", name: "Complete", type: "checkbox", options: [] },
    ],
  },
  records: [
    { id: "page-1", values: { name: "Selection contract", note: "Headless interaction", score: 3, status: "done", complete: true } },
    { id: "page-2", values: { name: "Database table", note: "Typed property editors", score: 5, status: "progress", complete: false } },
    { id: "page-3", values: { name: "Board view", note: "Same records, new projection", score: 2, status: "backlog", complete: false } },
    { id: "page-4", values: { name: "Calendar view", note: "Deferred until date property", score: 1, status: "backlog", complete: false } },
  ],
  views: [{
    id: "table",
    name: "All work",
    ownership: "personal",
    layout: "table",
    projection: {
      search: "",
      filter: { id: "table:root", conjunction: "and", items: [] },
      sorts: [],
      groups: [],
      columns: ["name", "note", "score", "status", "complete"].map((propertyId) => ({ propertyId, visible: true, width: null, pinned: null })),
    },
  }],
};
