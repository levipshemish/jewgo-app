import Logger, { appLogger } from '@/lib/utils/logger';

describe('Logger', () => {
  test('appLogger methods do not throw', () => {
    expect(() => appLogger.debug('debug')).not.toThrow();
    expect(() => appLogger.info('info')).not.toThrow();
    expect(() => appLogger.warn('warn')).not.toThrow();
    expect(() => appLogger.error('error')).not.toThrow();
  });

  test('custom logger respects API', () => {
    const logger = new Logger('TEST', 'debug' as any);
    expect(() => logger.debug('hello', { a: 1 })).not.toThrow();
    expect(() => logger.info('hello', { a: 1 })).not.toThrow();
    expect(() => logger.warn('hello', { a: 1 })).not.toThrow();
    expect(() => logger.error('hello', { a: 1 })).not.toThrow();
  });

  test('logs in development for debug/info/warn branches', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const logger = new Logger('TEST', 'debug' as any);
    expect(() => logger.debug('dev debug')).not.toThrow();
    expect(() => logger.info('dev info')).not.toThrow();
    expect(() => logger.warn('dev warn')).not.toThrow();
    process.env.NODE_ENV = prevEnv;
  });
});
