/**
 * Structured logging utility for the JewGo application
 * Provides consistent logging across the application with different log levels
 */

// Temporarily disable Sentry to fix module resolution issues
// import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    let formattedMessage = `[${timestamp}] ${levelName}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formattedMessage += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      formattedMessage += ` | Error: ${error.message}`;
      if (this.isDevelopment && error.stack) {
        formattedMessage += ` | Stack: ${error.stack}`;
      }
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context, error);

    switch (level) {
      case LogLevel.DEBUG:
        // console.debug(formattedMessage); // Debug logging disabled for production
        break;
      case LogLevel.INFO:
        // console.info(formattedMessage); // Info logging disabled for production
        break;
      case LogLevel.WARN:
        // console.warn(formattedMessage); // Warn logging disabled for production
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        // // console.error(formattedMessage);
        break;
    }

    // In production, you might want to send logs to a service like Sentry, LogRocket, etc.
    if (level >= LogLevel.ERROR && !this.isDevelopment) {
      this.sendToExternalService(level, message, context, error);
    }
  }

  private sendToExternalService(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    // Temporarily disabled Sentry to fix module resolution issues
    // Send to Sentry
    // if (typeof window !== 'undefined') {
    //   if (error) {
    //     Sentry.captureException(error, {
    //       level: LogLevel[level].toLowerCase() as any,
    //       extra: {
    //         message,
    //         context,
    //         timestamp: new Date().toISOString(),
    //         url: window.location.href,
    //         userAgent: navigator.userAgent,
    //       }
    //     });
    //   } else {
    //     Sentry.captureMessage(message, {
    //       level: LogLevel[level].toLowerCase() as any,
    //       extra: {
    //         context,
    //         timestamp: new Date().toISOString(),
    //         url: window.location.href,
    //         userAgent: navigator.userAgent,
    //       }
    //     });
    //   }
    // }
    
    // Simple console logging for now
    if (typeof window !== 'undefined') {
      const logData = {
        level: LogLevel[level],
        message,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      if (error) {
        console.error('Logger error:', { ...logData, error });
      } else {
        console.log('Logger message:', logData);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  // Convenience methods for common logging patterns
  logApiCall(endpoint: string, method: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${method} ${endpoint} - ${status} (${duration}ms)`;
    this.log(level, message, context);
  }

  logUserAction(action: string, userId?: string, context?: LogContext): void {
    const message = `User action: ${action}`;
    const fullContext = { ...context, userId };
    this.log(LogLevel.INFO, message, fullContext);
  }

  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    this.log(level, message, context);
  }

  logSecurity(event: string, context?: LogContext): void {
    const message = `Security event: ${event}`;
    this.log(LogLevel.WARN, message, context);
  }
}

// Create default logger instance
const defaultLogger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => defaultLogger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => defaultLogger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => defaultLogger.warn(message, context);
export const logError = (message: string, context?: LogContext, error?: Error) => defaultLogger.error(message, context, error);
export const logFatal = (message: string, context?: LogContext, error?: Error) => defaultLogger.fatal(message, context, error);

// Export convenience methods
export const logApiCall = (endpoint: string, method: string, status: number, duration: number, context?: LogContext) => 
  defaultLogger.logApiCall(endpoint, method, status, duration, context);
export const logUserAction = (action: string, userId?: string, context?: LogContext) => 
  defaultLogger.logUserAction(action, userId, context);
export const logPerformance = (operation: string, duration: number, context?: LogContext) => 
  defaultLogger.logPerformance(operation, duration, context);
export const logSecurity = (event: string, context?: LogContext) => 
  defaultLogger.logSecurity(event, context);

// Export the logger class and default instance
export { Logger };
export default defaultLogger;
