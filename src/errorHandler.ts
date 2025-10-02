export interface ErrorType {
    code: string;
    message: string;
}

export class CLIErrorHandler {
    static handleError(error: any, context?: string): void {
        console.error(`Error${context ? ` in ${context}` : ''}:`, error.message || error);
    }
}