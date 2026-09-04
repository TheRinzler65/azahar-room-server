export function toGameIdNumber(input: string): number {
  const trimmed = input.trim();
  const value =
    trimmed.startsWith("0x") || trimmed.startsWith("0X")
      ? BigInt(trimmed)
      : BigInt("0x" + trimmed);
  return Number(value);
}

export function fromGameIdNumber(id: number): string {
  return "0x" + BigInt(id).toString(16).padStart(16, "0");
}

export function isValidGameId(input: string): boolean {
  const trimmed = input.trim().replace(/^0x/i, "");
  return /^[0-9a-fA-F]{1,16}$/.test(trimmed);
}
