import {useEffect, useState, type ReactNode} from "react";
import {contentPresentation} from "./content-presentation.js";

/** Read elapsed wall time from host-owned timestamps; never infer progress or completion. */
export function ElapsedTime({startedAt, endedAt, label = "경과 시간"}: {readonly startedAt:number; readonly endedAt?:number; readonly label?:string}):ReactNode {
  const [now, setNow] = useState(Date.now);
  useEffect(()=>{
    if (endedAt !== undefined || !Number.isFinite(startedAt)) return;
    setNow(Date.now());
    const interval = setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(interval);
  },[startedAt,endedAt]);
  const duration = (endedAt ?? now) - startedAt;
  const seconds = Number.isFinite(duration) ? Math.max(0,Math.floor(duration / 1000)) : 0;
  return <time data-ui-component="elapsed-time" className={contentPresentation.caption} role="timer" aria-live="off" aria-label={label} dateTime={`PT${seconds}S`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2,"0")}</time>;
}
