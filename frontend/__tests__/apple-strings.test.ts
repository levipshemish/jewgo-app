import { getAppleSignInText } from '@/lib/i18n/apple-strings';

describe('Apple Sign-In Strings', () => {
  test('returns correct English text', () => {
    expect(getAppleSignInText('en')).toBe('Sign in with Apple');
    expect(getAppleSignInText('en-US')).toBe('Sign in with Apple');
    expect(getAppleSignInText('en-GB')).toBe('Sign in with Apple');
  });

  test('returns correct Spanish text', () => {
    expect(getAppleSignInText('es')).toBe('Iniciar sesión con Apple');
    expect(getAppleSignInText('es-MX')).toBe('Iniciar sesión con Apple');
    expect(getAppleSignInText('es-ES')).toBe('Iniciar sesión con Apple');
  });

  test('returns correct French text', () => {
    expect(getAppleSignInText('fr')).toBe('Se connecter avec Apple');
    expect(getAppleSignInText('fr-CA')).toBe('Se connecter avec Apple');
    expect(getAppleSignInText('fr-FR')).toBe('Se connecter avec Apple');
  });

  test('returns correct Hebrew text', () => {
    expect(getAppleSignInText('he')).toBe('התחבר עם Apple');
    expect(getAppleSignInText('he-IL')).toBe('התחבר עם Apple');
  });

  test('returns correct Japanese text', () => {
    expect(getAppleSignInText('ja')).toBe('Appleでサインイン');
    expect(getAppleSignInText('ja-JP')).toBe('Appleでサインイン');
  });

  test('handles language-only fallbacks correctly', () => {
    // Test that regional variants fall back to language-only
    expect(getAppleSignInText('es-MX')).toBe('Iniciar sesión con Apple');
    expect(getAppleSignInText('fr-CA')).toBe('Se connecter avec Apple');
    expect(getAppleSignInText('en-AU')).toBe('Sign in with Apple');
  });

  test('falls back to English for unsupported locales', () => {
    expect(getAppleSignInText('xx')).toBe('Sign in with Apple');
    expect(getAppleSignInText('xx-XX')).toBe('Sign in with Apple');
    expect(getAppleSignInText('invalid')).toBe('Sign in with Apple');
  });

  test('handles case-insensitive locale codes', () => {
    expect(getAppleSignInText('EN')).toBe('Sign in with Apple');
    expect(getAppleSignInText('Es')).toBe('Iniciar sesión con Apple');
    expect(getAppleSignInText('FR')).toBe('Se connecter avec Apple');
  });

  test('handles underscore separator in locale codes', () => {
    expect(getAppleSignInText('en_US')).toBe('Sign in with Apple');
    expect(getAppleSignInText('es_MX')).toBe('Iniciar sesión con Apple');
    expect(getAppleSignInText('fr_CA')).toBe('Se connecter avec Apple');
  });

  test('returns English when no locale provided', () => {
    expect(getAppleSignInText()).toBe('Sign in with Apple');
    expect(getAppleSignInText('')).toBe('Sign in with Apple');
  });

  test('handles null and undefined gracefully', () => {
    expect(getAppleSignInText(null as any)).toBe('Sign in with Apple');
    expect(getAppleSignInText(undefined as any)).toBe('Sign in with Apple');
  });

  test('validates exact string matches for all supported locales', () => {
    const testCases = [
      { locale: 'en', expected: 'Sign in with Apple' },
      { locale: 'es', expected: 'Iniciar sesión con Apple' },
      { locale: 'fr', expected: 'Se connecter avec Apple' },
      { locale: 'de', expected: 'Mit Apple anmelden' },
      { locale: 'it', expected: 'Accedi con Apple' },
      { locale: 'pt', expected: 'Entrar com Apple' },
      { locale: 'ja', expected: 'Appleでサインイン' },
      { locale: 'ko', expected: 'Apple로 로그인' },
      { locale: 'zh-CN', expected: '通过Apple登录' },
      { locale: 'zh-TW', expected: '使用Apple登入' },
      { locale: 'ru', expected: 'Войти через Apple' },
      { locale: 'ar', expected: 'تسجيل الدخول بـ Apple' },
      { locale: 'he', expected: 'התחבר עם Apple' },
      { locale: 'hi', expected: 'Apple के साथ साइन इन करें' },
      { locale: 'th', expected: 'เข้าสู่ระบบด้วย Apple' },
      { locale: 'tr', expected: 'Apple ile Oturum Aç' },
      { locale: 'nl', expected: 'Inloggen met Apple' },
      { locale: 'sv', expected: 'Logga in med Apple' },
      { locale: 'da', expected: 'Log ind med Apple' },
      { locale: 'no', expected: 'Logg inn med Apple' },
      { locale: 'fi', expected: 'Kirjaudu sisään Applella' },
      { locale: 'pl', expected: 'Zaloguj się przez Apple' },
      { locale: 'cs', expected: 'Přihlásit se pomocí Apple' },
      { locale: 'sk', expected: 'Prihlásiť sa pomocou Apple' },
      { locale: 'hu', expected: 'Bejelentkezés Apple-lel' },
      { locale: 'ro', expected: 'Conectare cu Apple' },
      { locale: 'bg', expected: 'Вход с Apple' },
      { locale: 'hr', expected: 'Prijava s Apple-om' },
      { locale: 'sl', expected: 'Prijava z Apple' },
      { locale: 'et', expected: 'Logi sisse Apple\'iga' },
      { locale: 'lv', expected: 'Piesakieties ar Apple' },
      { locale: 'lt', expected: 'Prisijungti su Apple' },
      { locale: 'mt', expected: 'Idħol b\'Apple' },
      { locale: 'el', expected: 'Σύνδεση με Apple' },
      { locale: 'uk', expected: 'Увійти через Apple' },
      { locale: 'be', expected: 'Увайсці праз Apple' },
      { locale: 'mk', expected: 'Најавете се со Apple' },
      { locale: 'sq', expected: 'Hyr me Apple' },
      { locale: 'sr', expected: 'Пријавите се са Apple-ом' },
      { locale: 'bs', expected: 'Prijavite se s Apple-om' },
      { locale: 'me', expected: 'Prijavite se sa Apple-om' },
      { locale: 'is', expected: 'Skráðu þig inn með Apple' },
      { locale: 'ga', expected: 'Sínigh isteach le Apple' },
      { locale: 'cy', expected: 'Mewngofnodi gydag Apple' },
      { locale: 'eu', expected: 'Saioa hasi Apple-rekin' },
      { locale: 'ca', expected: 'Inicia sessió amb Apple' },
      { locale: 'gl', expected: 'Iniciar sesión con Apple' }
    ];

    testCases.forEach(({ locale, expected }) => {
      expect(getAppleSignInText(locale)).toBe(expected);
    });
  });
});
