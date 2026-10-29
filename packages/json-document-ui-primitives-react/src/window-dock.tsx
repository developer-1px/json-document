import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Minus, X } from "lucide-react";
import { Command, DisclosureButton } from "./controls.js";
import { floatingSurface } from "./floating-surface.js";

export interface WindowDockItem {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
  readonly content: ReactNode;
}
export interface WindowDockProps {
  readonly label: string;
  readonly items: ReadonlyArray<WindowDockItem>;
  /** A newly activated item opens without closing other requested windows. */
  readonly activeId: string;
  /** Change to reopen the active window even when its id did not change. */
  readonly activationKey?: string;
  readonly onActivate: (id: string) => void;
  readonly onClose?: (id: string) => void;
  readonly action?: ReactNode;
  readonly notice?: ReactNode;
  readonly className?: string;
}

/** Independent, non-modal windows. Hidden contents stay mounted while work continues. */
export function WindowDock({ label, items, activeId, activationKey, onActivate, onClose, action, notice, className }: WindowDockProps): ReactNode {
  const prefix = useId();
  const root = useRef<HTMLDivElement>(null);
  const focusTitle = (id: string) => {
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>("[data-ui-dock-trigger]") ?? [];
    Array.from(buttons).find(button => button.dataset.uiDockTrigger === id)?.focus();
  };
  const [requested, setRequested] = useState<string[]>([activeId]);
  const [capacity, setCapacity] = useState(1);
  useLayoutEffect(() => { setRequested(current => [...current.filter(id => id !== activeId), activeId]); }, [activeId, activationKey]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(element.ownerDocument.documentElement).fontSize) || 16;
      // One readable panel per 22rem, with an existing 0.75rem spacing step.
      setCapacity(Math.max(1, Math.floor((element.clientWidth + 0.75 * rem) / (22.75 * rem))));
    };
    measure();
    const Observer = element.ownerDocument.defaultView?.ResizeObserver;
    if (!Observer) return;
    const observer = new Observer(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = requested.filter(id => items.some(item => item.id === id)).slice(-capacity);
  const toggle = (id: string) => {
    if (visible.includes(id)) {
      setRequested(current => current.filter(value => value !== id));
      focusTitle(id);
    } else {
      setRequested(current => [...current.filter(value => value !== id), id]);
      onActivate(id);
    }
  };
  // If resizing hides the focused editor, return focus to its still-visible title.
  useLayoutEffect(() => {
    for (const panel of Array.from(root.current?.querySelectorAll<HTMLElement>("[data-ui-dock-panel]") ?? [])) {
      if (panel.hidden && panel.contains(panel.ownerDocument.activeElement)) focusTitle(panel.dataset.uiDockPanel!);
    }
  }, [visible.join("\0")]);
  return <div ref={root} aria-label={label} role="group" className={className} data-ui-window-dock>
    <div data-ui-dock-windows>
      {items.map((item, index) => <section key={item.id} id={`${prefix}-panel-${index}`} aria-label={item.title}
        data-ui-dock-panel={item.id} hidden={!visible.includes(item.id)} className={floatingSurface.panel}>
        <div data-ui-dock-heading>
          <span className="truncate">{item.title}</span>
          <div className="flex items-center gap-1"><Command label={`${item.title} 접기`} onClick={() => toggle(item.id)}><Minus aria-hidden="true" size={16} /></Command>
          {onClose && <Command label={`${item.title} 닫기`} onClick={() => onClose(item.id)}><X aria-hidden="true" size={16} /></Command>}</div>
        </div>
        {item.content}
      </section>)}
    </div>
    {notice}
    <div data-ui-dock-footer>
      <div data-ui-dock-titles>
        {items.map((item, index) => <DisclosureButton key={item.id} data-ui-dock-trigger={item.id}
          expanded={visible.includes(item.id)} controls={`${prefix}-panel-${index}`} aria-label={item.title}
          aria-describedby={item.status ? `${prefix}-status-${index}` : undefined}
          onClick={() => toggle(item.id)} className={floatingSurface.control}>
          <span>{item.title}</span>
          {item.status && <span id={`${prefix}-status-${index}`} role="status">{item.status}</span>}
        </DisclosureButton>)}
      </div>
      {action}
    </div>
  </div>;
}
