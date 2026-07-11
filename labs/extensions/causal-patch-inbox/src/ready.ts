export class ReadyIdHeap {
  readonly #values: string[] = [];

  push(id: string): void {
    this.#values.push(id);
    let index = this.#values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareIds(this.#values[parent]!, id) <= 0) break;
      this.#values[index] = this.#values[parent]!;
      index = parent;
    }
    this.#values[index] = id;
  }

  pop(): string | undefined {
    const first = this.#values[0];
    const last = this.#values.pop();
    if (first === undefined || last === undefined || this.#values.length === 0) {
      return first;
    }

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= this.#values.length) break;
      const right = left + 1;
      const child = right < this.#values.length
        && compareIds(this.#values[right]!, this.#values[left]!) < 0
        ? right
        : left;
      if (compareIds(this.#values[child]!, last) >= 0) break;
      this.#values[index] = this.#values[child]!;
      index = child;
    }
    this.#values[index] = last;
    return first;
  }
}

export function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
