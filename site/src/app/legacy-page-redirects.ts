export const legacyPageRedirects = {
  tutorial: {
    from: "/docs/tutorial",
    to: "/docs/concepts",
  },
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
