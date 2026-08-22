export const legacyPageRedirects = {
  contenteditableConnector: {
    from: "/connectors/contenteditable",
    to: "/adapters/contenteditable",
  },
  webConnector: {
    from: "/connectors/web",
    to: "/adapters",
  },
  showcase: {
    from: "/demos",
    to: "/editors",
  },
  widgetsCatalog: {
    from: "/widgets",
    to: "/docs/affordance",
  },
} as const;
