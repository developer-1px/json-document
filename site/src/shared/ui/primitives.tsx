import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classes, ui } from "./styles";

export function PageIntro(props: {
  readonly label?: ReactNode;
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div>
      {props.label ? <p className={classes("mb-2 mt-0", ui.text.label)}>{props.label}</p> : null}
      <h1 className={classes("mb-2 mt-0", ui.text.title)}>{props.title}</h1>
      <p className={`m-0 max-w-2xl ${ui.text.body}`}>{props.children}</p>
    </div>
  );
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly kind?: "primary" | "secondary" | "toggle";
}) {
  const { className, kind = "secondary", type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} className={classes(className, ui.action[kind])} />;
}
