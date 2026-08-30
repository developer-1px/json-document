import { CardApi, ColumnApi, DividerApi, RowApi, TextApi } from "@a2ui/web_core/v0_9/basic_catalog";

export const A2UI_BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

const supportedComponentSchemas = {
  Text: TextApi.schema,
  Column: ColumnApi.schema,
  Row: RowApi.schema,
  Card: CardApi.schema,
  Divider: DividerApi.schema,
} as const;

export const A2UI_BASIC_COMPONENT_NAMES = Object.freeze(Object.keys(supportedComponentSchemas) as ReadonlyArray<keyof typeof supportedComponentSchemas>);

export function validateBasicCatalogComponent(candidate: Readonly<{ id?: string; component: string; [key: string]: unknown }>): void {
  if (!candidate.id) throw new Error("A2UI Basic Catalog component에는 id가 필요합니다.");
  const schema = supportedComponentSchemas[candidate.component as keyof typeof supportedComponentSchemas];
  if (!schema) throw new Error(`지원하지 않는 A2UI Basic Catalog component입니다: ${candidate.component}`);
  const { id: _id, component: _component, ...properties } = candidate;
  schema.parse(properties);
}
