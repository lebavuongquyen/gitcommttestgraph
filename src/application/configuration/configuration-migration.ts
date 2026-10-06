export interface ConfigurationMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(value: unknown): unknown;
}

export interface ConfigurationMigrationResult {
  readonly value: unknown;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrated: boolean;
}

export const CURRENT_CONFIGURATION_SCHEMA_VERSION = 1;

export function migrateConfiguration(
  value: unknown,
  currentVersion: number,
  migrations: readonly ConfigurationMigration[] = [],
): ConfigurationMigrationResult {
  const fromVersion = readSchemaVersion(value);
  if (fromVersion === currentVersion) {
    return { value, fromVersion, toVersion: currentVersion, migrated: false };
  }
  if (fromVersion > currentVersion) {
    throw new Error("Configuration schemaVersion is newer than the supported version.");
  }

  let current = value;
  let version = fromVersion;
  while (version < currentVersion) {
    const migration = migrations.find(item => item.fromVersion === version);
    if (!migration || migration.toVersion <= version) {
      throw new Error("No configuration migration is registered for schemaVersion " + version + ".");
    }
    current = migration.migrate(current);
    version = migration.toVersion;
  }

  if (readSchemaVersion(current) !== currentVersion) {
    throw new Error("Configuration migration did not produce the target schemaVersion.");
  }

  return { value: current, fromVersion, toVersion: currentVersion, migrated: true };
}

function readSchemaVersion(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Configuration must be an object.");
  }
  const version = (value as Record<string, unknown>).schemaVersion;
  if (!Number.isInteger(version) || Number(version) < 0) {
    throw new Error("Configuration schemaVersion must be a non-negative integer.");
  }
  return Number(version);
}
