import * as bcd from '@mdn/browser-compat-data';
import { WebFeatureDetails, BaselineStatus, DetectedFeature } from './types';
import { CLIErrorHandler, ErrorType } from './errorHandler';

export class CLICompatibilityService {
    private errorHandler: CLIErrorHandler;
    private initialized = false;

    constructor() {
        this.errorHandler = new CLIErrorHandler();
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // BCD data is already loaded when imported
            this.initialized = true;
        } catch (error) {
            CLIErrorHandler.handleError(error, 'initialize');
            throw error;
        }
    }

    /**
     * Get feature details by ID
     */
    async getFeatureDetails(featureId: string): Promise<WebFeatureDetails | null> {
        await this.initialize();

        try {
            // Navigate through BCD data structure
            const parts = featureId.split('.');
            let current: any = bcd;

            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return null;
                }
            }

            if (current && current.__compat) {
                const compat = current.__compat;
                return {
                    name: featureId,
                    description: compat.description || '',
                    mdn_url: compat.mdn_url,
                    spec_url: compat.spec_url,
                    baseline: this.calculateBaselineStatus(compat.support)
                };
            }

            return null;
        } catch (error) {
            CLIErrorHandler.handleError(error, 'getFeatureDetails');
            return null;
        }
    }

    /**
     * Get all available features
     */
    async getAllFeatures(): Promise<WebFeatureDetails[]> {
        await this.initialize();

        const features: WebFeatureDetails[] = [];
        
        try {
            this.extractFeatures(bcd, '', features);
            return features;
        } catch (error) {
            CLIErrorHandler.handleError(error, 'getAllFeatures');
            return [];
        }
    }

    /**
     * Recursively extract features from BCD data
     */
    private extractFeatures(obj: any, prefix: string, features: WebFeatureDetails[]): void {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        for (const [key, value] of Object.entries(obj)) {
            if (key === '__compat' && value && typeof value === 'object') {
                const compat = value as any;
                const featureName = prefix || 'unknown';
                
                features.push({
                    name: featureName,
                    description: compat.description || '',
                    mdn_url: compat.mdn_url,
                    spec_url: compat.spec_url,
                    baseline: this.calculateBaselineStatus(compat.support)
                });
            } else if (typeof value === 'object' && value !== null) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                this.extractFeatures(value, newPrefix, features);
            }
        }
    }

    /**
     * Calculate baseline status from browser support data
     */
    private calculateBaselineStatus(support: any): BaselineStatus {
        if (!support || typeof support !== 'object') {
            return {
                status: 'limited_availability',
                support: {}
            };
        }

        // Simplified baseline calculation
        // In a real implementation, this would use the compute-baseline package
        const browsers = ['chrome', 'firefox', 'safari', 'edge'];
        let supportedBrowsers = 0;

        for (const browser of browsers) {
            if (support[browser] && this.isBrowserSupported(support[browser])) {
                supportedBrowsers++;
            }
        }

        const supportPercentage = (supportedBrowsers / browsers.length) * 100;

        if (supportPercentage >= 95) {
            return {
                status: 'widely_available',
                baseline_date: '2020-01-01',
                support: support || {}
            };
        } else if (supportPercentage >= 75) {
            return {
                status: 'newly_available',
                baseline_date: '2022-01-01',
                support: support || {}
            };
        } else {
            return {
                status: 'limited_availability',
                support: support || {}
            };
        }
    }

    /**
     * Check if browser version indicates support
     */
    private isBrowserSupported(browserData: any): boolean {
        if (!browserData) {
            return false;
        }

        if (Array.isArray(browserData)) {
            return browserData.some(entry => this.isBrowserSupported(entry));
        }

        if (typeof browserData === 'object') {
            return browserData.version_added !== false && 
                   browserData.version_added !== null &&
                   browserData.version_removed === undefined;
        }

        return false;
    }

    /**
     * Lookup CSS feature
     */
    async lookupCSSFeature(property: string): Promise<Partial<DetectedFeature> | null> {
        const featureId = `css.properties.${property}`;
        const details = await this.getFeatureDetails(featureId);
        
        if (!details) {
            return null;
        }

        return {
            id: featureId,
            name: property,
            type: 'css',
            baselineStatus: details.baseline,
            context: property
        };
    }

    /**
     * Lookup JavaScript feature
     */
    async lookupJSFeature(feature: string): Promise<Partial<DetectedFeature> | null> {
        const featureId = `javascript.builtins.${feature}`;
        const details = await this.getFeatureDetails(featureId);
        
        if (!details) {
            return null;
        }

        return {
            id: featureId,
            name: feature,
            type: 'javascript',
            baselineStatus: details.baseline,
            context: feature
        };
    }

    /**
     * Lookup HTML feature
     */
    async lookupHTMLFeature(element: string, attribute?: string): Promise<Partial<DetectedFeature> | null> {
        const featureId = attribute 
            ? `html.elements.${element}.${attribute}`
            : `html.elements.${element}`;
            
        const details = await this.getFeatureDetails(featureId);
        
        if (!details) {
            return null;
        }

        return {
            id: featureId,
            name: attribute ? `${element}[${attribute}]` : element,
            type: 'html',
            baselineStatus: details.baseline,
            context: attribute ? `${element}[${attribute}]` : element
        };
    }
}