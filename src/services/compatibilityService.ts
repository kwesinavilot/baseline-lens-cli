import { BaselineStatus, WebFeatureDetails, WebFeature } from '../types';
import features from 'web-features';
import bcd from '@mdn/browser-compat-data';

export class CompatibilityDataService {
    private webFeaturesData = features;
    private bcdCache: Map<string, BaselineStatus> = new Map();
    private isInitialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('Initializing web-features data...');
            const featureCount = Object.keys(this.webFeaturesData).length;
            console.log(`Loaded ${featureCount} web features`);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize web-features:', error);
        }
    }

    getBCDData(bcdKey: string): any {
        const parts = bcdKey.split('.');
        let current: any = bcd;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return null;
            }
        }
        
        return current && current.__compat ? current.__compat : null;
    }

    private convertBCDToBaselineStatus(bcdData: any): BaselineStatus {
        if (!bcdData || !bcdData.support) {
            return {
                status: 'limited_availability',
                support: {}
            };
        }

        const support = bcdData.support;
        const majorBrowsers = ['chrome', 'firefox', 'safari', 'edge'];
        
        let recentVersionCount = 0;
        const supportData: any = {};
        
        for (const browser of majorBrowsers) {
            if (support[browser]) {
                const browserSupport = Array.isArray(support[browser]) ? support[browser][0] : support[browser];
                if (browserSupport.version_added && browserSupport.version_added !== false) {
                    supportData[browser] = { version_added: browserSupport.version_added };
                    
                    const version = parseInt(browserSupport.version_added);
                    if (browser === 'chrome' && version >= 88) recentVersionCount++;
                    else if (browser === 'firefox' && version >= 85) recentVersionCount++;
                    else if (browser === 'safari' && version >= 14) recentVersionCount++;
                    else if (browser === 'edge' && version >= 88) recentVersionCount++;
                }
            }
        }

        let status: 'widely_available' | 'newly_available' | 'limited_availability';
        const totalSupported = Object.keys(supportData).length;
        
        if (totalSupported >= 4 && recentVersionCount === 0) {
            status = 'widely_available';
        } else if (totalSupported >= 3 && recentVersionCount <= 2) {
            status = 'newly_available';
        } else {
            status = 'limited_availability';
        }

        return {
            status,
            support: supportData
        };
    }

    private convertWebFeatureStatus(status: any): BaselineStatus {
        if (!status) {
            return {
                status: 'limited_availability',
                support: {}
            };
        }

        let baselineStatus: 'widely_available' | 'newly_available' | 'limited_availability';
        
        if (status.baseline === 'high') {
            baselineStatus = 'widely_available';
        } else if (status.baseline === 'low') {
            baselineStatus = 'newly_available';
        } else {
            baselineStatus = 'limited_availability';
        }

        return {
            status: baselineStatus,
            baseline_date: status.baseline_low_date,
            low_date: status.baseline_low_date,
            high_date: status.baseline_high_date,
            support: status.support || {}
        };
    }

    getFeatureStatus(featureId: string): BaselineStatus | null {
        if (!this.isInitialized) {
            return null;
        }

        if (this.bcdCache.has(featureId)) {
            return this.bcdCache.get(featureId)!;
        }

        try {
            const feature = this.webFeaturesData[featureId];
            if (feature && feature.status) {
                const baselineStatus = this.convertWebFeatureStatus(feature.status);
                this.bcdCache.set(featureId, baselineStatus);
                return baselineStatus;
            }
        } catch (error) {
            // Silently fail
        }

        return null;
    }

    getBCDStatus(bcdKey: string): BaselineStatus | null {
        if (!this.isInitialized) {
            return null;
        }

        if (this.bcdCache.has(bcdKey)) {
            return this.bcdCache.get(bcdKey)!;
        }

        try {
            const bcdData = this.getBCDData(bcdKey);
            if (bcdData) {
                const baselineStatus = this.convertBCDToBaselineStatus(bcdData);
                this.bcdCache.set(bcdKey, baselineStatus);
                return baselineStatus;
            }
        } catch (error) {
            // Silently fail
        }

        return null;
    }

    mapCSSPropertyToBCD(property: string, value?: string): string {
        const baseKey = `css.properties.${property}`;
        
        if (value) {
            const valueKey = `${baseKey}.${value.replace(/-/g, '_')}`;
            if (this.getBCDData(valueKey)) {
                return valueKey;
            }
        }
        
        return baseKey;
    }

    mapJSAPIToBCD(apiName: string): string {
        const possibleKeys = [
            `api.${apiName}`,
            `javascript.builtins.${apiName}`,
            `api.Window.${apiName}`,
            `api.${apiName}.${apiName}`
        ];
        
        for (const key of possibleKeys) {
            if (this.getBCDData(key)) {
                return key;
            }
        }
        
        return `api.${apiName}`;
    }

    mapHTMLElementToBCD(element: string, attribute?: string): string {
        const baseKey = `html.elements.${element}`;
        
        if (attribute) {
            const possibleKeys = [
                `${baseKey}.${attribute}`,
                `html.global_attributes.${attribute}`,
                `${baseKey}.${attribute.replace(/-/g, '_')}`
            ];
            
            for (const key of possibleKeys) {
                if (this.getBCDData(key)) {
                    return key;
                }
            }
            
            return `${baseKey}.${attribute}`;
        }
        
        return baseKey;
    }

    getFeatureDetails(featureId: string): WebFeatureDetails | null {
        if (!this.isInitialized) {
            return null;
        }

        const feature = this.webFeaturesData[featureId] as any;
        if (!feature) {
            return null;
        }

        return {
            name: feature.name || featureId,
            description: feature.description || 'No description available',
            mdn_url: feature.mdn_url,
            spec_url: feature.spec,
            baseline: this.convertWebFeatureStatus(feature.status)
        };
    }

    async getAllFeatures(): Promise<WebFeatureDetails[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const features: WebFeatureDetails[] = [];
        
        for (const [id, feature] of Object.entries(this.webFeaturesData)) {
            const featureData = feature as any;
            features.push({
                name: featureData.name || id,
                description: featureData.description || featureData.name || id,
                mdn_url: featureData.mdn_url,
                spec_url: featureData.spec,
                baseline: this.convertWebFeatureStatus(featureData.status)
            });
        }

        return features.sort((a, b) => a.name.localeCompare(b.name));
    }

    clearCache(): void {
        this.bcdCache.clear();
    }

    isReady(): boolean {
        return this.isInitialized;
    }
}