import { tv } from "tailwind-variants";

const fullScene = "relative isolate mx-auto min-h-[100svh] max-w-[92rem] overflow-hidden [@media(min-width:1024px)_and_(min-height:720px)]:snap-start [@media(min-width:1024px)_and_(min-height:720px)]:snap-always";

export const homeRecipe = tv({
  slots: {
    page: "min-h-full bg-background-canvas [@media(min-width:1024px)_and_(min-height:720px)]:h-[100svh] [@media(min-width:1024px)_and_(min-height:720px)]:overflow-y-auto [@media(min-width:1024px)_and_(min-height:720px)]:snap-y [@media(min-width:1024px)_and_(min-height:720px)]:snap-mandatory motion-reduce:snap-none",
    hero: fullScene,
    heroCopy: "relative z-10 flex min-h-[100svh] max-w-2xl flex-col justify-center gap-region px-group pb-[20rem] pt-region sm:px-region sm:pb-[18rem] lg:max-w-[42rem] lg:px-region lg:pb-region xl:px-region",
    logoHeading: "m-0 w-full max-w-[29rem] text-foreground-strong",
    logo: "block h-auto w-full overflow-visible",
    statement: "m-0 text-page-title font-semibold leading-tight tracking-page-title text-foreground-strong",
    description: "m-0 max-w-lg text-base leading-7 text-foreground-default",
    actions: "flex flex-wrap items-center gap-x-group gap-y-related",
    scrollCue: "w-fit text-xs text-foreground-muted underline decoration-line-subtle underline-offset-4 hover:text-foreground-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-border-focus",
    heroArtwork: "pointer-events-none absolute inset-0 z-0 m-0 overflow-hidden",
    heroCat: "absolute bottom-0 right-0 h-auto w-[140vw] max-w-none translate-x-[18%] sm:w-[112vw] sm:translate-x-[14%] lg:w-[78vw] lg:translate-x-[8%]",
    scene: `${fullScene} grid content-center gap-region px-group py-region sm:px-region lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-center lg:gap-region lg:px-region xl:px-region`,
    sceneCopy: "grid content-start gap-group relative z-10 max-w-2xl lg:justify-self-end",
    sceneNumber: "font-mono text-xs text-foreground-muted",
    eyebrow: "m-0 text-sm font-semibold tracking-wide text-accent-foreground",
    sceneTitle: "m-0 text-page-title font-semibold leading-tight tracking-page-title text-foreground-strong",
    sceneDescription: "m-0 max-w-xl text-base leading-7 text-foreground-default",
    sceneArtwork: "relative z-0 m-0 flex min-h-64 items-center justify-center lg:min-h-0",
    sceneCat: "h-auto w-56 max-w-full sm:w-72 lg:w-80",
  },
});
