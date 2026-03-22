/**
 * Update Sequencer - Gestione aggiornamenti sequenziali
 *
 * Garantisce che gli update vengano applicati nell'ordine corretto,
 * anche quando si salta più versioni.
 */

export interface VersionInfo {
  version: string;
  min_version_required: string;
  date: string;
  changes: string[];
}

export interface UpdateStep {
  version: string;
  fromVersion: string;
  toVersion: string;
  required: boolean;
}

export interface VersionHistory {
  current_version: string;
  applied_updates: Array<{
    version: string;
    applied_at: string;
  }>;
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

export function isVersionCompatible(currentVersion: string, minRequired: string): boolean {
  return compareVersions(currentVersion, minRequired) >= 0;
}

export function calculateUpdatePath(
  currentVersion: string,
  targetVersion: string,
  changelog: VersionInfo[]
): UpdateStep[] | null {
  if (compareVersions(currentVersion, targetVersion) === 0) return [];
  if (compareVersions(currentVersion, targetVersion) > 0) return null;

  const relevantVersions = changelog
    .filter(v =>
      compareVersions(v.version, currentVersion) > 0 &&
      compareVersions(v.version, targetVersion) <= 0
    )
    .sort((a, b) => compareVersions(a.version, b.version));

  if (relevantVersions.length === 0) return null;

  const updatePath: UpdateStep[] = [];
  let currentStep = currentVersion;

  for (const version of relevantVersions) {
    if (!isVersionCompatible(currentStep, version.min_version_required)) return null;

    updatePath.push({
      version: version.version,
      fromVersion: currentStep,
      toVersion: version.version,
      required: true,
    });
    currentStep = version.version;
  }

  if (currentStep !== targetVersion) return null;
  return updatePath;
}

export function filterAppliedUpdates(
  updatePath: UpdateStep[],
  versionHistory: VersionHistory
): UpdateStep[] {
  return updatePath.filter(
    step => !versionHistory.applied_updates.some(u => u.version === step.version)
  );
}

export function formatUpdatePath(updatePath: UpdateStep[]): string {
  if (updatePath.length === 0) return 'No updates required';
  const steps = updatePath.map(s => `${s.fromVersion} → ${s.toVersion}`).join(' → ');
  return `Update path: ${updatePath[0].fromVersion} → ${updatePath[updatePath.length - 1].toVersion}\nSteps (${updatePath.length}): ${steps}`;
}
