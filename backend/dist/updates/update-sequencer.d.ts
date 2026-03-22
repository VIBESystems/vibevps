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
export declare function compareVersions(v1: string, v2: string): number;
export declare function isVersionCompatible(currentVersion: string, minRequired: string): boolean;
export declare function calculateUpdatePath(currentVersion: string, targetVersion: string, changelog: VersionInfo[]): UpdateStep[] | null;
export declare function filterAppliedUpdates(updatePath: UpdateStep[], versionHistory: VersionHistory): UpdateStep[];
export declare function formatUpdatePath(updatePath: UpdateStep[]): string;
//# sourceMappingURL=update-sequencer.d.ts.map