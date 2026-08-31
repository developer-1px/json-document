import { tv } from "tailwind-variants";

const fullScene = "relative isolate mx-auto min-h-[100svh] max-w-[92rem] overflow-hidden [@media(min-width:1024px)_and_(min-height:720px)]:snap-start [@media(min-width:1024px)_and_(min-height:720px)]:snap-always";

export const homeRecipe = tv({
  slots: {
    page: "min-h-full bg-background-canvas [@media(min-width:1024px)_and_(min-height:720px)]:h-[100svh] [@media(min-width:1024px)_and_(min-height:720px)]:overflow-y-auto [@media(min-width:1024px)_and_(min-height:720px)]:snap-y [@media(min-width:1024px)_and_(min-height:720px)]:snap-proximity motion-reduce:snap-none",
    hero: fullScene,
    heroCopy: "relative z-10 flex min-h-[100svh] max-w-2xl flex-col justify-center px-6 pb-[20rem] pt-20 sm:px-12 sm:pb-[18rem] lg:max-w-[42rem] lg:px-16 lg:pb-20 xl:px-24",
    logoHeading: "m-0 w-full max-w-[29rem] text-foreground-strong",
    logo: "block h-auto w-full overflow-visible",
    statement: "mb-0 mt-8 text-page-title font-semibold leading-tight tracking-page-title text-foreground-strong",
    description: "mb-0 mt-4 max-w-lg text-base leading-7 text-foreground-default",
    actions: "mt-8 flex flex-wrap items-center gap-x-5 gap-y-3",
    scrollCue: "mt-12 w-fit text-xs text-foreground-muted underline decoration-line-subtle underline-offset-4 hover:text-foreground-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-border-focus",
    heroArtwork: "pointer-events-none absolute inset-0 z-0 m-0 overflow-hidden",
    heroCat: "absolute bottom-0 right-0 h-auto w-[140vw] max-w-none translate-x-[18%] sm:w-[112vw] sm:translate-x-[14%] lg:w-[78vw] lg:translate-x-[8%]",
    scene: `${fullScene} grid content-center gap-8 px-6 py-20 sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-center lg:gap-16 lg:px-16 xl:px-24`,
    sceneCopy: "relative z-10 max-w-2xl lg:justify-self-end",
    sceneNumber: "font-mono text-xs text-foreground-muted",
    eyebrow: "mb-0 mt-6 text-sm font-semibold tracking-wide text-accent-foreground",
    sceneTitle: "mb-0 mt-3 text-page-title font-semibold leading-tight tracking-page-title text-foreground-strong",
    sceneDescription: "mb-0 mt-5 max-w-xl text-base leading-7 text-foreground-default",
    sceneArtwork: "relative z-0 m-0 flex min-h-64 items-center justify-center lg:min-h-0",
    sceneCat: "h-auto w-56 max-w-full sm:w-72 lg:w-80",
  },
});
