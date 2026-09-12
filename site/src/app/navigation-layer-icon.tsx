import {
  Blocks,
  BookOpen,
  Files,
  Hand,
  PanelsTopLeft,
  type LucideIcon,
} from "lucide-react";
import { type SiteSectionId } from "./site-layers";

type LayerIcon = {
  readonly icon: LucideIcon;
  readonly size: number;
};

const layerIcons: Readonly<Record<SiteSectionId, LayerIcon>> = {
  "getting-started": { icon: BookOpen, size: 18 },
  modules: { icon: Blocks, size: 18 },
  hands: { icon: Hand, size: 19 },
  design: { icon: Files, size: 18 },
  applications: { icon: PanelsTopLeft, size: 19 },
};

export function NavigationLayerIcon(props: {
  readonly section: SiteSectionId;
  readonly className?: string;
}) {
  const layerIcon = layerIcons[props.section];
  const Icon = layerIcon.icon;
  return <Icon aria-hidden="true" className={props.className} size={layerIcon.size} strokeWidth={1.8} />;
}
