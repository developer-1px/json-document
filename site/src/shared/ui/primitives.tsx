import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classes, ui } from "./styles";

export type PetiteCatIllustration = "sleep" | "peek" | "braces" | "cursor";

export function PageIntro(props: {
  readonly label?: ReactNode;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly illustration: PetiteCatIllustration;
}) {
  return (
    <div className={ui.pageIntro.root}>
      <div>
        {props.label ? <p className={classes("mb-2 mt-0", ui.text.label)}>{props.label}</p> : null}
        <h1 className={classes("mb-2 mt-0", ui.text.title)}>{props.title}</h1>
        <p className={`m-0 max-w-2xl ${ui.text.body}`}>{props.children}</p>
      </div>
      <figure className={ui.pageIntro.artwork} aria-hidden="true" data-petite-cat={props.illustration}>
        <img
          alt=""
          className={ui.pageIntro.image}
          src={sitePath(`/illustrations/petite-cats/${props.illustration}.png`)}
        />
      </figure>
    </div>
  );
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly kind?: "primary" | "secondary" | "toggle";
}) {
  const { className, kind = "secondary", type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} className={classes(className, ui.action[kind])} />;
}
