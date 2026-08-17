export const legacyPageRedirects = {
  contenteditableConnector: {
    from: "/connectors/contenteditable",
    to: "/adapters/contenteditable",
  },
  webConnector: {
    from: "/connectors/web",
    to: "/adapters",
  },
} as const;
