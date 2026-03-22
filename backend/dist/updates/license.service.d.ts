export interface LicenseInfo {
    serverId: string;
    licenseKey: string | null;
    customerName: string | null;
    customerEmail: string | null;
    planName: string | null;
    maxHypervisors: number;
    maxVms: number;
    expiresAt: string | null;
    isLifetime: boolean;
    activatedAt: string | null;
}
export interface UpdateInfo {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseDate?: string;
    changelog?: Array<{
        version: string;
        date: string;
        changes: string[];
        min_version_required?: string;
    }>;
    downloadToken?: string;
    downloadTokens?: Record<string, string>;
    downloadUrl?: string;
}
export declare function getOrCreateServerId(): string;
export declare function getLicenseInfo(): LicenseInfo | null;
export declare function activateLicense(licenseKey: string, customerEmail: string): Promise<{
    success: boolean;
    status: string;
    message: string;
}>;
export declare function verifyLicense(): Promise<{
    valid: boolean;
    error?: string;
}>;
export declare function checkForUpdates(): Promise<UpdateInfo>;
export declare function getServerInfo(): {
    serverId: string;
    appVersion: string;
    license: {
        licenseKey: string | null;
        planName: string | null;
        customerName: string | null;
        maxHypervisors: number;
        maxVms: number;
        expiresAt: string | null;
        isLifetime: boolean;
    } | null;
};
//# sourceMappingURL=license.service.d.ts.map