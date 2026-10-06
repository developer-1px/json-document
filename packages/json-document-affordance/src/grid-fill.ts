export interface GridFillBounds {
  readonly rMin: number; readonly rMax: number; readonly cMin: number; readonly cMax: number;
}

/** Extend a fill rectangle on the dominant axis; vertical wins ties, as in dogfooding-sheet. */
export function extendGridFill(source: GridFillBounds, point: {readonly row: number;readonly column: number}, bounds: {readonly rowCount:number;readonly columnCount:number}): GridFillBounds {
  const row = Math.max(0,Math.min(bounds.rowCount-1,point.row));
  const column = Math.max(0,Math.min(bounds.columnCount-1,point.column));
  const down = Math.max(0,row-source.rMax), up = Math.max(0,source.rMin-row);
  const right = Math.max(0,column-source.cMax), left = Math.max(0,source.cMin-column);
  if (Math.max(down,up,right,left) === 0) return source;
  return Math.max(up,down) >= Math.max(left,right)
    ? {...source,...(up > down ? {rMin:row} : {rMax:row})}
    : {...source,...(left > right ? {cMin:column} : {cMax:column})};
}
