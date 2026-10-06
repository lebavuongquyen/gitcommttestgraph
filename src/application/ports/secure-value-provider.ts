export interface SecureValueProvider {
  getValue(name: string): Promise<string | undefined>;
}
