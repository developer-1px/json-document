export interface MaskSelection<Representation> {
  readonly kind: "mask";
  readonly representation: Representation;
}

export interface MaskAlgebra<Representation, Region> {
  empty(): Representation;
  replace(region: Region): Representation;
  union(mask: Representation, region: Region): Representation;
  subtract(mask: Representation, region: Region): Representation;
  intersect(mask: Representation, region: Region): Representation;
  xor(mask: Representation, region: Region): Representation;
  isEmpty(mask: Representation): boolean;
}
