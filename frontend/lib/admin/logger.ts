/* eslint-disable no-console */
// Simple admin logger for development and production
interface LogLevel {
  level: string;
  timestamp: string;
  message: string;
  [key: string]: any;
}

class AdminLogger {
  private formatLog(level: string, message: string, data?: any): LogLevel {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...data,
    };
  }

  info(message: string, data?: any) {
    const log = this.formatLog('info', message, data);
    console.log(`[ADMIN INFO] ${log.timestamp}: ${message}`, data || '');
  }

  warn(message: string, data?: any) {
    const log = this.formatLog('warn', message, data);
    console.warn(`[ADMIN WARN] ${log.timestamp}: ${message}`, data || '');
  }

  error(message: string, data?: any) {
    const log = this.formatLog('error', message, data);
    console.error(`[ADMIN ERROR] ${log.timestamp}: ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      const log = this.formatLog('debug', message, data);
      console.log(`[ADMIN DEBUG] ${log.timestamp}: ${message}`, data || '');
    }
  }
}

export const adminLogger = new AdminLogger();
