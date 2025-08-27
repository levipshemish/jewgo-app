/**
 * Structured logger utility for consistent logging across the application
 */

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private prefix: string;
  private logLevel: string;

  constructor(prefix: string = 'APP', logLevel: string = 'info') {
    this.prefix = prefix;
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug') && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info') && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn') && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('error', message, context));
    }
  }
}

// Create logger instances for different modules
export const authLogger = new Logger('AUTH', process.env.LOG_LEVEL || 'info');
export const oauthLogger = new Logger('OAUTH', process.env.LOG_LEVEL || 'info');
export const appLogger = new Logger('APP', process.env.LOG_LEVEL || 'info');
export const adminLogger = new Logger('ADMIN', process.env.LOG_LEVEL || 'info');

export default Logger;
