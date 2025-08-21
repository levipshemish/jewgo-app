import { getAppleSignInText } from '@/lib/i18n/apple-strings';

describe('Apple Sign-In Strings', () => {
  describe('getAppleSignInText', () => {
    test('returns English text for undefined locale', () => {
      expect(getAppleSignInText(undefined)).toBe('Sign in with Apple');
    });

    test('returns English text for null locale', () => {
      expect(getAppleSignInText(null as any)).toBe('Sign in with Apple');
    });

    test('returns English text for empty string', () => {
      expect(getAppleSignInText('')).toBe('Sign in with Apple');
    });

    test('returns exact match for English', () => {
      expect(getAppleSignInText('en')).toBe('Sign in with Apple');
    });

    test('returns exact match for Spanish', () => {
      expect(getAppleSignInText('es')).toBe('Iniciar sesión con Apple');
    });

    test('returns exact match for French', () => {
      expect(getAppleSignInText('fr')).toBe('Se connecter avec Apple');
    });

    test('returns exact match for Hebrew', () => {
      expect(getAppleSignInText('he')).toBe('התחבר עם Apple');
    });

    test('returns exact match for Japanese', () => {
      expect(getAppleSignInText('ja')).toBe('Appleでサインイン');
    });

    test('returns exact match for Chinese Simplified', () => {
      expect(getAppleSignInText('zh-CN')).toBe('通过Apple登录');
    });

    test('returns exact match for Chinese Traditional', () => {
      expect(getAppleSignInText('zh-TW')).toBe('使用Apple登入');
    });

    test('returns exact match for Arabic', () => {
      expect(getAppleSignInText('ar')).toBe('تسجيل الدخول بـ Apple');
    });

    test('returns exact match for Korean', () => {
      expect(getAppleSignInText('ko')).toBe('Apple로 로그인');
    });

    test('returns exact match for Russian', () => {
      expect(getAppleSignInText('ru')).toBe('Войти через Apple');
    });

    test('returns exact match for German', () => {
      expect(getAppleSignInText('de')).toBe('Mit Apple anmelden');
    });

    test('returns exact match for Italian', () => {
      expect(getAppleSignInText('it')).toBe('Accedi con Apple');
    });

    test('returns exact match for Portuguese', () => {
      expect(getAppleSignInText('pt')).toBe('Entrar com Apple');
    });

    test('returns exact match for Hindi', () => {
      expect(getAppleSignInText('hi')).toBe('Apple के साथ साइन इन करें');
    });

    test('returns exact match for Thai', () => {
      expect(getAppleSignInText('th')).toBe('เข้าสู่ระบบด้วย Apple');
    });

    test('returns exact match for Turkish', () => {
      expect(getAppleSignInText('tr')).toBe('Apple ile Oturum Aç');
    });

    test('returns exact match for Dutch', () => {
      expect(getAppleSignInText('nl')).toBe('Inloggen met Apple');
    });

    test('returns exact match for Swedish', () => {
      expect(getAppleSignInText('sv')).toBe('Logga in med Apple');
    });

    test('returns exact match for Danish', () => {
      expect(getAppleSignInText('da')).toBe('Log ind med Apple');
    });

    test('returns exact match for Norwegian', () => {
      expect(getAppleSignInText('no')).toBe('Logg inn med Apple');
    });

    test('returns exact match for Finnish', () => {
      expect(getAppleSignInText('fi')).toBe('Kirjaudu sisään Applella');
    });

    test('returns exact match for Polish', () => {
      expect(getAppleSignInText('pl')).toBe('Zaloguj się przez Apple');
    });

    test('returns exact match for Czech', () => {
      expect(getAppleSignInText('cs')).toBe('Přihlásit se pomocí Apple');
    });

    test('returns exact match for Slovak', () => {
      expect(getAppleSignInText('sk')).toBe('Prihlásiť sa pomocou Apple');
    });

    test('returns exact match for Hungarian', () => {
      expect(getAppleSignInText('hu')).toBe('Bejelentkezés Apple-lel');
    });

    test('returns exact match for Romanian', () => {
      expect(getAppleSignInText('ro')).toBe('Conectare cu Apple');
    });

    test('returns exact match for Bulgarian', () => {
      expect(getAppleSignInText('bg')).toBe('Вход с Apple');
    });

    test('returns exact match for Croatian', () => {
      expect(getAppleSignInText('hr')).toBe('Prijava s Apple-om');
    });

    test('returns exact match for Slovenian', () => {
      expect(getAppleSignInText('sl')).toBe('Prijava z Apple');
    });

    test('returns exact match for Estonian', () => {
      expect(getAppleSignInText('et')).toBe('Logi sisse Apple\'iga');
    });

    test('returns exact match for Latvian', () => {
      expect(getAppleSignInText('lv')).toBe('Piesakieties ar Apple');
    });

    test('returns exact match for Lithuanian', () => {
      expect(getAppleSignInText('lt')).toBe('Prisijungti su Apple');
    });

    test('returns exact match for Maltese', () => {
      expect(getAppleSignInText('mt')).toBe('Idħol b\'Apple');
    });

    test('returns exact match for Greek', () => {
      expect(getAppleSignInText('el')).toBe('Σύνδεση με Apple');
    });

    test('returns exact match for Ukrainian', () => {
      expect(getAppleSignInText('uk')).toBe('Увійти через Apple');
    });

    test('returns exact match for Belarusian', () => {
      expect(getAppleSignInText('be')).toBe('Увайсці праз Apple');
    });

    test('returns exact match for Macedonian', () => {
      expect(getAppleSignInText('mk')).toBe('Најавете се со Apple');
    });

    test('returns exact match for Albanian', () => {
      expect(getAppleSignInText('sq')).toBe('Hyr me Apple');
    });

    test('returns exact match for Serbian', () => {
      expect(getAppleSignInText('sr')).toBe('Пријавите се са Apple-ом');
    });

    test('returns exact match for Bosnian', () => {
      expect(getAppleSignInText('bs')).toBe('Prijavite se s Apple-om');
    });

    test('returns exact match for Montenegrin', () => {
      expect(getAppleSignInText('me')).toBe('Prijavite se sa Apple-om');
    });

    test('returns exact match for Icelandic', () => {
      expect(getAppleSignInText('is')).toBe('Skráðu þig inn með Apple');
    });

    test('returns exact match for Irish', () => {
      expect(getAppleSignInText('ga')).toBe('Sínigh isteach le Apple');
    });

    test('returns exact match for Welsh', () => {
      expect(getAppleSignInText('cy')).toBe('Mewngofnodi gydag Apple');
    });

    test('returns exact match for Basque', () => {
      expect(getAppleSignInText('eu')).toBe('Saioa hasi Apple-rekin');
    });

    test('returns exact match for Catalan', () => {
      expect(getAppleSignInText('ca')).toBe('Inicia sessió amb Apple');
    });

    test('returns exact match for Galician', () => {
      expect(getAppleSignInText('gl')).toBe('Iniciar sesión con Apple');
    });

    describe('language-only normalization', () => {
      test('normalizes es-MX to es', () => {
        expect(getAppleSignInText('es-MX')).toBe('Iniciar sesión con Apple');
      });

      test('normalizes fr-CA to fr', () => {
        expect(getAppleSignInText('fr-CA')).toBe('Se connecter avec Apple');
      });

      test('normalizes en-US to en', () => {
        expect(getAppleSignInText('en-US')).toBe('Sign in with Apple');
      });

      test('normalizes en-GB to en', () => {
        expect(getAppleSignInText('en-GB')).toBe('Sign in with Apple');
      });

      test('normalizes zh-Hans to zh-CN', () => {
        expect(getAppleSignInText('zh-Hans')).toBe('Sign in with Apple');
      });

      test('normalizes zh-Hant to zh-TW', () => {
        expect(getAppleSignInText('zh-Hant')).toBe('Sign in with Apple');
      });

      test('normalizes ja-JP to ja', () => {
        expect(getAppleSignInText('ja-JP')).toBe('Appleでサインイン');
      });

      test('normalizes ko-KR to ko', () => {
        expect(getAppleSignInText('ko-KR')).toBe('Apple로 로그인');
      });

      test('normalizes ru-RU to ru', () => {
        expect(getAppleSignInText('ru-RU')).toBe('Войти через Apple');
      });

      test('normalizes de-DE to de', () => {
        expect(getAppleSignInText('de-DE')).toBe('Mit Apple anmelden');
      });

      test('normalizes it-IT to it', () => {
        expect(getAppleSignInText('it-IT')).toBe('Accedi con Apple');
      });

      test('normalizes pt-BR to pt', () => {
        expect(getAppleSignInText('pt-BR')).toBe('Entrar com Apple');
      });

      test('normalizes pt-PT to pt', () => {
        expect(getAppleSignInText('pt-PT')).toBe('Entrar com Apple');
      });
    });

    describe('case insensitivity', () => {
      test('handles uppercase locale codes', () => {
        expect(getAppleSignInText('EN')).toBe('Sign in with Apple');
        expect(getAppleSignInText('ES')).toBe('Iniciar sesión con Apple');
        expect(getAppleSignInText('FR')).toBe('Se connecter avec Apple');
      });

      test('handles mixed case locale codes', () => {
        expect(getAppleSignInText('En')).toBe('Sign in with Apple');
        expect(getAppleSignInText('Es')).toBe('Iniciar sesión con Apple');
        expect(getAppleSignInText('Fr')).toBe('Se connecter avec Apple');
      });
    });

    describe('fallback behavior', () => {
      test('falls back to English for unsupported locales', () => {
        expect(getAppleSignInText('xx')).toBe('Sign in with Apple');
        expect(getAppleSignInText('invalid')).toBe('Sign in with Apple');
        expect(getAppleSignInText('en-INVALID')).toBe('Sign in with Apple');
      });

      test('falls back to English for malformed locale codes', () => {
        expect(getAppleSignInText('en-')).toBe('Sign in with Apple');
        expect(getAppleSignInText('-en')).toBe('Sign in with Apple');
        expect(getAppleSignInText('en--US')).toBe('Sign in with Apple');
      });
    });

    describe('underscore handling', () => {
      test('handles underscore separator in locale codes', () => {
        expect(getAppleSignInText('en_US')).toBe('Sign in with Apple');
        expect(getAppleSignInText('es_MX')).toBe('Iniciar sesión con Apple');
        expect(getAppleSignInText('fr_CA')).toBe('Se connecter avec Apple');
      });
    });
  });
});
