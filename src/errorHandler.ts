import { AnalysisError } from '../src/types';

export enum ErrorType {
    PARSING_ERROR = 'parsing_error',
    TIMEOUT_ERROR = 'timeout_error',
    DATA_LOADING_ERROR = 'data_loading_error',
    CONFIGURATION_ERROR = 'configuration_error',
    FILE_SIZE_ERROR = 'file_size_error',
    UNKNOWN_ERROR = 'unknown_error'
}

export interface ErrorContext {
    fileName?: string;
    languageId?: string;
    fileSize?: number;
    operation?: string;
    additionalInfo?: Record<string, any>;
}

export interface ErrorHandlerConfig {
    enableLogging: boolean;
    logLevel: 'error' | 'warning' | 'info' | 'debug';
    maxLogEntries: number;
}

export class CLIErrorHandler {
    private static instance: CLIErrorHandler;
    private config: ErrorHandlerConfig;
    private errorLog: Array<{ timestamp: Date; type: ErrorType; message: string; context?: ErrorContext }> = [];

    private constructor() {
        this.config = {
            enableLogging: true,
            logLevel: 'warning',
            maxLogEntries: 1000
        };
    }

    static getInstance(): CLIErrorHandler {
        if (!CLIErrorHandler.instance) {
            CLIErrorHandler.instance = new CLIErrorHandler();
        }
        return CLIErrorHandler.instance;
    }

    /**
     * Handle parsing errors gracefully
     */
    handleParsingError(error: unknown, context: ErrorContext): AnalysisError {
        const errorMessage = this.extractErrorMessage(error);
        const analysisError: AnalysisError = {
            file: context.fileName || 'unknown',
            error: `Parsing failed: ${errorMessage}`,
            line: this.extractLineNumber(error),
            column: this.extractColumnNumber(error)
        };

        this.logError(ErrorType.PARSING_ERROR, errorMessage, context);
        return analysisError;
    }

    /**
     * Handle timeout errors
     */
    handleTimeoutError(context: ErrorContext): AnalysisError {
        const errorMessage = `Analysis timeout exceeded for large file`;
        const analysisError: AnalysisError = {
            file: context.fileName || 'unknown',
            error: errorMessage
        };

        this.logError(ErrorType.TIMEOUT_ERROR, errorMessage, context);
        return analysisError;
    }

    /**
     * Handle data loading errors
     */
    handleDataLoadingError(error: unknown, context: ErrorContext): AnalysisError {
        const errorMessage = this.extractErrorMessage(error);
        const analysisError: AnalysisError = {
            file: context.fileName || 'data-service',
            error: `Data loading failed: ${errorMessage}`
        };

        this.logError(ErrorType.DATA_LOADING_ERROR, errorMessage, context);
        return analysisError;
    }

    /**
     * Log error with context
     */
    private logError(type: ErrorType, message: string, context?: ErrorContext): void {
        if (!this.config.enableLogging) {
            return;
        }

        const logEntry = {
            timestamp: new Date(),
            type,
            message,
            context
        };

        this.errorLog.push(logEntry);
        
        if (this.errorLog.length > this.config.maxLogEntries) {
            this.errorLog = this.errorLog.slice(-this.config.maxLogEntries);
        }

        if (this.shouldLogLevel(type)) {
            const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
            console.error(`[${logEntry.timestamp.toISOString()}] ${type.toUpperCase()}: ${message}${contextStr}`);
        }
    }

    /**
     * Extract error message from unknown error type
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String((error as any).message);
        }
        return 'Unknown error occurred';
    }

    /**
     * Extract line number from parsing errors
     */
    private extractLineNumber(error: unknown): number | undefined {
        if (error instanceof Error) {
            const lineMatch = error.message.match(/line (\d+)/i);
            if (lineMatch) {
                return parseInt(lineMatch[1], 10);
            }
            
            if ('line' in error && typeof (error as any).line === 'number') {
                return (error as any).line;
            }
        }
        return undefined;
    }

    /**
     * Extract column number from parsing errors
     */
    private extractColumnNumber(error: unknown): number | undefined {
        if (error instanceof Error) {
            const columnMatch = error.message.match(/column (\d+)/i);
            if (columnMatch) {
                return parseInt(columnMatch[1], 10);
            }
            
            if ('column' in error && typeof (error as any).column === 'number') {
                return (error as any).column;
            }
        }
        return undefined;
    }

    /**
     * Check if error type should be logged based on log level
     */
    private shouldLogLevel(type: ErrorType): boolean {
        const logLevels: { [key: string]: ErrorType[] } = {
            'error': [ErrorType.DATA_LOADING_ERROR, ErrorType.CONFIGURATION_ERROR, ErrorType.UNKNOWN_ERROR],
            'warning': [ErrorType.TIMEOUT_ERROR, ErrorType.FILE_SIZE_ERROR, ErrorType.PARSING_ERROR],
            'info': [ErrorType.PARSING_ERROR],
            'debug': []
        };

        const currentLevelTypes = logLevels[this.config.logLevel] || [];
        return currentLevelTypes.includes(type);
    }
}