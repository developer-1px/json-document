import type { HTMLAttributes, ReactNode } from "react";
import { contentPresentation } from "./content-presentation.js";

type NumericPresentationProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  readonly value: number | null | undefined;
  readonly locale?: string;
  readonly emptyLabel?: string;
};

/** A measured quantity, never an identifier or an invented KPI. Unit is domain-owned. */
export function QuantityDisplay({value, unit, locale = "ko-KR", emptyLabel = "미정", className, ...attributes}: NumericPresentationProps & {readonly unit: string}): ReactNode {
  let text = emptyLabel;
  if (value != null && Number.isFinite(value)) {
    let formatted = String(value);
    try { formatted = new Intl.NumberFormat(locale, {maximumFractionDigits: 20}).format(value); } catch { /* Preserve the value if a host provides an invalid locale. */ }
    text = `${formatted}${unit ? ` ${unit}` : ""}`;
  }
  return <span {...attributes} data-ui-component="quantity-display" className={[contentPresentation.body, className].filter(Boolean).join(" ")}>{text}</span>;
}

/** Currency is explicit. Formatting does not convert money or change stored precision. */
export function MoneyDisplay({value, currency, locale = "ko-KR", emptyLabel = "미정", className, ...attributes}: NumericPresentationProps & {readonly currency: string}): ReactNode {
  let text = emptyLabel;
  if (value != null && Number.isFinite(value)) {
    try { text = new Intl.NumberFormat(locale, {style: "currency", currency, currencyDisplay: "code"}).format(value); }
    catch { text = `${value} ${currency}`; }
  }
  return <span {...attributes} data-ui-component="money-display" className={[contentPresentation.body, className].filter(Boolean).join(" ")}>{text}</span>;
}
