const BLOCKED_PATTERNS: RegExp[] = [
  /\bn+i+g+g+e+r+[s]?\b/i,
  /\bn+e+g+r+e+[s]?\b/i,
  /\bf+a+g+g+o+t+[s]?\b/i,
  /\bp+d+\b/i,
  /\bs+a+l+o+p+e+[s]?\b/i,
  /\bp+u+t+e+[s]?\b/i,
  /\bc+o+n+n+a+r+d+[s]?\b/i,
  /\bf+u+c+k+\b/i,
];

const URL_PATTERN =
  /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|com\/invite)\/[^\s]+)/i;

export interface FilterResult {
  clean: string;
  flagged: boolean;
  reason?: "profanity" | "link" | "caps";
}

export function filterChatMessage(raw: string): FilterResult {
  let message = raw.trim();
  let flagged = false;
  let reason: FilterResult["reason"];

  if (URL_PATTERN.test(message)) {
    message = message.replace(URL_PATTERN, "[lien supprimé]");
    flagged = true;
    reason = "link";
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      flagged = true;
      reason = "profanity";
      message = message.replace(pattern, (match) => "*".repeat(match.length));
    }
  }

  if (message.length > 8) {
    const uppercaseCount = (message.match(/[A-Z]/g) || []).length;
    const letterCount = (message.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 6 && uppercaseCount / letterCount > 0.75) {
      message = message.toLowerCase();
      flagged = true;
      reason = "caps";
    }
  }

  return { clean: message, flagged, reason };
}
