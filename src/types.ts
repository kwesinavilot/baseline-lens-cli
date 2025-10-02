export interface DetectedFeature {
    name: string;
    type: 'css' | 'javascript' | 'html';
    line: number;
    column: number;
    filePath?: string;
    baselineStatus: BaselineStatus;
    browserSupport?: BrowserSupport;
    mdnUrl?: string;
    polyfillUrl?: string;
    suggestion?: string;
    id?: string;
    range?: any;
    context?: string;
    locations?: any[];
    baseline?: BaselineStatus;
    riskLevel?: string;
}

export interface BaselineStatus {
    status: 'widely_available' | 'newly_available' | 'limited_availability';
    since?: string;
    supportPercentage?: number;
    support?: any;
    baseline_date?: string;
    low_date?: string;
    high_date?: string;
}

export interface BrowserSupport {
    chrome?: string;
    firefox?: string;
    safari?: string;
    edge?: string;
    ie?: string;
}

export interface WebFeatureDetails {
    name: string;
    description?: string;
    baseline?: BaselineStatus;
    browserSupport?: BrowserSupport;
    mdn_url?: string;
    spec_url?: string;
    polyfills?: string[];
}

export interface WebFeature {
    id: string;
    name: string;
    description?: string;
    baseline: BaselineStatus;
}

export interface CompatibilityReport {
    summary: ReportSummary;
    features: FeatureUsage[];
    files?: FileLocation[];
    recommendations?: string[];
    generatedAt?: Date;
    totalFiles?: number;
    analyzedFiles?: number;
    projectPath?: string;
    errors?: any[];
}

export interface ReportSummary {
    totalFeatures: number;
    widelyAvailable: number;
    newlyAvailable: number;
    limitedAvailability: number;
    riskDistribution?: {
        high: number;
        medium: number;
        low: number;
    };
    fileTypeBreakdown?: { [key: string]: number };
}

export interface FeatureUsage {
    name?: string;
    type?: string;
    status?: string;
    count?: number;
    locations: FileLocation[];
    riskLevel?: string;
    feature: {
        name: string;
        description?: string;
        baseline: BaselineStatus;
    };
    usageCount: number;
}

export interface FileLocation {
    file: string;
    line: number;
    column: number;
    context?: string;
    filePath?: string;
}

export interface AnalysisError {
    file: string;
    error: string;
    line?: number;
    column?: number;
}