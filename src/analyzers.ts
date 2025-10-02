import { DetectedFeature } from './types';
import { CompatibilityDataService } from './services/compatibilityService';

// Mock VS Code types for CLI usage
interface MockRange {
    start: { line: number; character: number };
    end: { line: number; character: number };
}

interface MockDocument {
    fileName: string;
    languageId: string;
    getText: () => string;
    uri: { fsPath: string };
}

export class CLICSSAnalyzer {
    constructor(private compatibilityService: CompatibilityDataService) {}

    async analyze(content: string, document: MockDocument): Promise<DetectedFeature[]> {
        const features: DetectedFeature[] = [];
        
        try {
            // Simple CSS property detection
            const cssPropertyRegex = /([a-z-]+)\s*:/g;
            let match;
            
            while ((match = cssPropertyRegex.exec(content)) !== null) {
                const property = match[1];
                const line = content.substring(0, match.index).split('\n').length - 1;
                const character = match.index - content.lastIndexOf('\n', match.index) - 1;
                
                // Skip common properties that are widely supported
                if (['color', 'background', 'margin', 'padding', 'width', 'height'].includes(property)) {
                    continue;
                }
                
                const bcdKey = this.compatibilityService.mapCSSPropertyToBCD(property);
                const baselineStatus = this.compatibilityService.getBCDStatus(bcdKey);
                if (!baselineStatus) continue;
                const featureDetails = {
                    name: property,
                    type: 'css' as const,
                    line,
                    column: character,
                    baselineStatus
                };
                if (featureDetails) {
                    features.push({
                        ...featureDetails,
                        range: {
                            start: { line, character },
                            end: { line, character: character + property.length }
                        } as any,
                        filePath: document.fileName
                    } as DetectedFeature);
                }
            }
        } catch (error) {
            // Ignore parsing errors for CLI
        }
        
        return features;
    }
}

export class CLIJavaScriptAnalyzer {
    constructor(private compatibilityService: CompatibilityDataService) {}

    async analyze(content: string, document: MockDocument): Promise<DetectedFeature[]> {
        const features: DetectedFeature[] = [];
        
        try {
            // Simple JavaScript API detection
            const jsApiRegex = /\b(fetch|Promise|async|await|const|let|Map|Set|WeakMap|WeakSet)\b/g;
            let match;
            
            while ((match = jsApiRegex.exec(content)) !== null) {
                const api = match[1];
                const line = content.substring(0, match.index).split('\n').length - 1;
                const character = match.index - content.lastIndexOf('\n', match.index) - 1;
                
                const bcdKey = this.compatibilityService.mapJSAPIToBCD(api);
                const baselineStatus = this.compatibilityService.getBCDStatus(bcdKey);
                if (!baselineStatus) continue;
                const featureDetails = {
                    name: api,
                    type: 'javascript' as const,
                    line,
                    column: character,
                    baselineStatus
                };
                if (featureDetails) {
                    features.push({
                        ...featureDetails,
                        range: {
                            start: { line, character },
                            end: { line, character: character + api.length }
                        } as any,
                        filePath: document.fileName
                    } as DetectedFeature);
                }
            }
        } catch (error) {
            // Ignore parsing errors for CLI
        }
        
        return features;
    }
}

export class CLIHTMLAnalyzer {
    constructor(private compatibilityService: CompatibilityDataService) {}

    async analyze(content: string, document: MockDocument): Promise<DetectedFeature[]> {
        const features: DetectedFeature[] = [];
        
        try {
            // Simple HTML element detection
            const htmlElementRegex = /<([a-z][a-z0-9-]*)/gi;
            let match;
            
            while ((match = htmlElementRegex.exec(content)) !== null) {
                const element = match[1].toLowerCase();
                const line = content.substring(0, match.index).split('\n').length - 1;
                const character = match.index - content.lastIndexOf('\n', match.index) - 1;
                
                // Skip common elements
                if (['div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element)) {
                    continue;
                }
                
                const bcdKey = this.compatibilityService.mapHTMLElementToBCD(element);
                const baselineStatus = this.compatibilityService.getBCDStatus(bcdKey);
                if (!baselineStatus) continue;
                const featureDetails = {
                    name: element,
                    type: 'html' as const,
                    line,
                    column: character,
                    baselineStatus
                };
                if (featureDetails) {
                    features.push({
                        ...featureDetails,
                        range: {
                            start: { line, character },
                            end: { line, character: character + element.length }
                        } as any,
                        filePath: document.fileName
                    } as DetectedFeature);
                }
            }
        } catch (error) {
            // Ignore parsing errors for CLI
        }
        
        return features;
    }
}