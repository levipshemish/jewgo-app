import { getAppleSignInText } from '@/lib/i18n/apple-strings';

describe('Apple Sign In Strings', () => {
  describe('getAppleSignInText', () => {
    it('should return exact Apple-approved English text', () => {
      expect(getAppleSignInText('en')).toBe('Sign in with Apple');
    });

    it('should return exact Apple-approved Spanish text', () => {
      expect(getAppleSignInText('es')).toBe('Iniciar sesión con Apple');
    });

    it('should return exact Apple-approved French text', () => {
      expect(getAppleSignInText('fr')).toBe('Se connecter avec Apple');
    });

    it('should return exact Apple-approved German text', () => {
      expect(getAppleSignInText('de')).toBe('Mit Apple anmelden');
    });

    it('should return exact Apple-approved Japanese text', () => {
      expect(getAppleSignInText('ja')).toBe('Appleでサインイン');
    });

    it('should return exact Apple-approved Korean text', () => {
      expect(getAppleSignInText('ko')).toBe('Apple로 로그인');
    });

    it('should return exact Apple-approved Chinese Simplified text', () => {
      expect(getAppleSignInText('zh-CN')).toBe('通过Apple登录');
    });

    it('should return exact Apple-approved Chinese Traditional text', () => {
      expect(getAppleSignInText('zh-TW')).toBe('使用Apple登入');
    });

    it('should return exact Apple-approved Russian text', () => {
      expect(getAppleSignInText('ru')).toBe('Войти через Apple');
    });

    it('should return exact Apple-approved Hebrew text', () => {
      expect(getAppleSignInText('he')).toBe('התחבר עם Apple');
    });

    it('should return exact Apple-approved Arabic text', () => {
      expect(getAppleSignInText('ar')).toBe('تسجيل الدخول بـ Apple');
    });

    it('should handle locale variants correctly', () => {
      expect(getAppleSignInText('en-US')).toBe('Sign in with Apple');
      expect(getAppleSignInText('en-GB')).toBe('Sign in with Apple');
      expect(getAppleSignInText('es-ES')).toBe('Iniciar sesión con Apple');
      expect(getAppleSignInText('es-MX')).toBe('Iniciar sesión con Apple');
    });

    it('should handle case-insensitive locale codes', () => {
      expect(getAppleSignInText('EN')).toBe('Sign in with Apple');
      expect(getAppleSignInText('En')).toBe('Sign in with Apple');
      expect(getAppleSignInText('ES')).toBe('Iniciar sesión con Apple');
    });

    it('should handle underscore separator in locale codes', () => {
      expect(getAppleSignInText('en_US')).toBe('Sign in with Apple');
      expect(getAppleSignInText('es_ES')).toBe('Iniciar sesión con Apple');
    });

    it('should fallback to English for unsupported locales', () => {
      expect(getAppleSignInText('xx')).toBe('Sign in with Apple');
      expect(getAppleSignInText('invalid')).toBe('Sign in with Apple');
      expect(getAppleSignInText('')).toBe('Sign in with Apple');
    });

    it('should fallback to English when no locale is provided', () => {
      expect(getAppleSignInText()).toBe('Sign in with Apple');
      expect(getAppleSignInText(undefined)).toBe('Sign in with Apple');
    });

    it('should return exact Apple-approved text for all supported locales', () => {
      const supportedLocales = [
        { code: 'en', text: 'Sign in with Apple' },
        { code: 'es', text: 'Iniciar sesión con Apple' },
        { code: 'fr', text: 'Se connecter avec Apple' },
        { code: 'de', text: 'Mit Apple anmelden' },
        { code: 'it', text: 'Accedi con Apple' },
        { code: 'pt', text: 'Entrar com Apple' },
        { code: 'ja', text: 'Appleでサインイン' },
        { code: 'ko', text: 'Apple로 로그인' },
        { code: 'zh-CN', text: '通过Apple登录' },
        { code: 'zh-TW', text: '使用Apple登入' },
        { code: 'ru', text: 'Войти через Apple' },
        { code: 'ar', text: 'تسجيل الدخول بـ Apple' },
        { code: 'he', text: 'התחבר עם Apple' },
        { code: 'hi', text: 'Apple के साथ साइन इन करें' },
        { code: 'th', text: 'เข้าสู่ระบบด้วย Apple' },
        { code: 'tr', text: 'Apple ile Oturum Aç' },
        { code: 'nl', text: 'Inloggen met Apple' },
        { code: 'sv', text: 'Logga in med Apple' },
        { code: 'da', text: 'Log ind med Apple' },
        { code: 'no', text: 'Logg inn med Apple' },
        { code: 'fi', text: 'Kirjaudu sisään Applella' },
        { code: 'pl', text: 'Zaloguj się przez Apple' },
        { code: 'cs', text: 'Přihlásit se pomocí Apple' },
        { code: 'sk', text: 'Prihlásiť sa pomocou Apple' },
        { code: 'hu', text: 'Bejelentkezés Apple-lel' },
        { code: 'ro', text: 'Conectare cu Apple' },
        { code: 'bg', text: 'Вход с Apple' },
        { code: 'hr', text: 'Prijava s Apple-om' },
        { code: 'sl', text: 'Prijava z Apple' },
        { code: 'et', text: 'Logi sisse Apple\'iga' },
        { code: 'lv', text: 'Piesakieties ar Apple' },
        { code: 'lt', text: 'Prisijungti su Apple' },
        { code: 'mt', text: 'Idħol b\'Apple' },
        { code: 'el', text: 'Σύνδεση με Apple' },
        { code: 'uk', text: 'Увійти через Apple' },
        { code: 'be', text: 'Увайсці праз Apple' },
        { code: 'mk', text: 'Најавете се со Apple' },
        { code: 'sq', text: 'Hyr me Apple' },
        { code: 'sr', text: 'Пријавите се са Apple-ом' },
        { code: 'bs', text: 'Prijavite se s Apple-om' },
        { code: 'me', text: 'Prijavite se sa Apple-om' },
        { code: 'is', text: 'Skráðu þig inn með Apple' },
        { code: 'ga', text: 'Sínigh isteach le Apple' },
        { code: 'cy', text: 'Mewngofnodi gydag Apple' },
        { code: 'eu', text: 'Saioa hasi Apple-rekin' },
        { code: 'ca', text: 'Inicia sessió amb Apple' },
        { code: 'gl', text: 'Iniciar sesión con Apple' }
      ];

      supportedLocales.forEach(({ code, text }) => {
        expect(getAppleSignInText(code)).toBe(text);
      });
    });
  });
});
