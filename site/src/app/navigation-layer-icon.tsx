import {
  Blocks,
  Braces,
  Cable,
  FileType2,
  Files,
  Hand,
  Link2,
  MousePointer2,
  PencilLine,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { type SiteNavigationGroup } from "./page-descriptors";

type LayerIcon = {
  readonly icon: LucideIcon;
  readonly size: number;
};

const layerIcons: Readonly<Record<SiteNavigationGroup, LayerIcon>> = {
  "JSON Document": { icon: Braces, size: 19 },
  "Document Types": { icon: FileType2, size: 19 },
  Editing: { icon: PencilLine, size: 18 },
  Adapter: { icon: Cable, size: 19 },
  Connector: { icon: Link2, size: 21 },
  Affordance: { icon: MousePointer2, size: 20 },
  "UI Primitives": { icon: Blocks, size: 18 },
  Hands: { icon: Hand, size: 19 },
  Artifact: { icon: Files, size: 18 },
  Collaboration: { icon: UsersRound, size: 19 },
};

export function NavigationLayerIcon(props: {
  readonly group: SiteNavigationGroup;
  readonly className?: string;
}) {
  const layerIcon = layerIcons[props.group];
  const Icon = layerIcon.icon;
  return <Icon aria-hidden="true" className={props.className} size={layerIcon.size} strokeWidth={1.8} />;
}
