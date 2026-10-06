export type SensitiveConfigurationKind = "SECRET" | "PRIVATE";

export interface SensitiveConfigurationRule {
  readonly keyPattern: RegExp;
  readonly kind: SensitiveConfigurationKind;
}

export const DEFAULT_SENSITIVE_CONFIGURATION_RULES: readonly SensitiveConfigurationRule[] = [
  { keyPattern: /^(password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)$/i, kind: "SECRET" },
  { keyPattern: /^(credential|credentials|authorization|cookie)$/i, kind: "PRIVATE" },
];

export function classifyConfigurationKey(key: string, rules = DEFAULT_SENSITIVE_CONFIGURATION_RULES): SensitiveConfigurationKind | undefined {
  return rules.find(rule => rule.keyPattern.test(key))?.kind;
}

export function redactSensitiveConfiguration(value: unknown, rules = DEFAULT_SENSITIVE_CONFIGURATION_RULES): unknown {
  if (Array.isArray(value)) return value.map(item => redactSensitiveConfiguration(item, rules));
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    result[key] = classifyConfigurationKey(key, rules) ? "[REDACTED]" : redactSensitiveConfiguration(child, rules);
  }
  return result;
}

export function assertNoSensitiveConfiguration(value: unknown, rules = DEFAULT_SENSITIVE_CONFIGURATION_RULES): void {
  if (containsSensitiveConfiguration(value, rules)) {
    throw new Error("Sensitive configuration values must not be stored in ordinary configuration.");
  }
}

function containsSensitiveConfiguration(value: unknown, rules: readonly SensitiveConfigurationRule[]): boolean {
  if (Array.isArray(value)) return value.some(item => containsSensitiveConfiguration(item, rules));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) =>
    Boolean(classifyConfigurationKey(key, rules)) || containsSensitiveConfiguration(child, rules),
  );
}
