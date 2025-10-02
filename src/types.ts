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
}

export interface BaselineStatus {
    status: 'widely_available' | 'newly_available' | 'limited_availability';
    since?: string;
    supportPercentage?: number;
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

export interface AnalysisError {
    file: string;
    error: string;
    line?: number;
    column?: number;
}