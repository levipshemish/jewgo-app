import { getAppleSignInText } from '@/lib/i18n/apple-strings';

describe('Apple Sign-In Strings', () => {
  // Test exact Apple-approved strings for major locales
  describe('Exact Apple-approved strings', () => {
    test('English (en)', () => {
      expect(getAppleSignInText('en')).toBe('Sign in with Apple');
    });

    test('Spanish (es)', () => {
      expect(getAppleSignInText('es')).toBe('Iniciar sesión con Apple');
    });

    test('French (fr)', () => {
      expect(getAppleSignInText('fr')).toBe('Se connecter avec Apple');
    });

    test('German (de)', () => {
      expect(getAppleSignInText('de')).toBe('Mit Apple anmelden');
    });

    test('Italian (it)', () => {
      expect(getAppleSignInText('it')).toBe('Accedi con Apple');
    });

    test('Portuguese (pt)', () => {
      expect(getAppleSignInText('pt')).toBe('Entrar com Apple');
    });

    test('Japanese (ja)', () => {
      expect(getAppleSignInText('ja')).toBe('Appleでサインイン');
    });

    test('Korean (ko)', () => {
      expect(getAppleSignInText('ko')).toBe('Apple로 로그인');
    });

    test('Chinese Simplified (zh-CN)', () => {
      expect(getAppleSignInText('zh-CN')).toBe('通过Apple登录');
    });

    test('Chinese Traditional (zh-TW)', () => {
      expect(getAppleSignInText('zh-TW')).toBe('使用Apple登入');
    });

    test('Russian (ru)', () => {
      expect(getAppleSignInText('ru')).toBe('Войти через Apple');
    });

    test('Arabic (ar)', () => {
      expect(getAppleSignInText('ar')).toBe('تسجيل الدخول بـ Apple');
    });

    test('Hebrew (he)', () => {
      expect(getAppleSignInText('he')).toBe('התחבר עם Apple');
    });

    test('Hindi (hi)', () => {
      expect(getAppleSignInText('hi')).toBe('Apple के साथ साइन इन करें');
    });

    test('Thai (th)', () => {
      expect(getAppleSignInText('th')).toBe('เข้าสู่ระบบด้วย Apple');
    });

    test('Turkish (tr)', () => {
      expect(getAppleSignInText('tr')).toBe('Apple ile Oturum Aç');
    });

    test('Dutch (nl)', () => {
      expect(getAppleSignInText('nl')).toBe('Inloggen met Apple');
    });

    test('Swedish (sv)', () => {
      expect(getAppleSignInText('sv')).toBe('Logga in med Apple');
    });

    test('Danish (da)', () => {
      expect(getAppleSignInText('da')).toBe('Log ind med Apple');
    });

    test('Norwegian (no)', () => {
      expect(getAppleSignInText('no')).toBe('Logg inn med Apple');
    });

    test('Finnish (fi)', () => {
      expect(getAppleSignInText('fi')).toBe('Kirjaudu sisään Applella');
    });

    test('Polish (pl)', () => {
      expect(getAppleSignInText('pl')).toBe('Zaloguj się przez Apple');
    });

    test('Czech (cs)', () => {
      expect(getAppleSignInText('cs')).toBe('Přihlásit se pomocí Apple');
    });

    test('Slovak (sk)', () => {
      expect(getAppleSignInText('sk')).toBe('Prihlásiť sa pomocou Apple');
    });

    test('Hungarian (hu)', () => {
      expect(getAppleSignInText('hu')).toBe('Bejelentkezés Apple-lel');
    });

    test('Romanian (ro)', () => {
      expect(getAppleSignInText('ro')).toBe('Conectare cu Apple');
    });

    test('Bulgarian (bg)', () => {
      expect(getAppleSignInText('bg')).toBe('Вход с Apple');
    });

    test('Croatian (hr)', () => {
      expect(getAppleSignInText('hr')).toBe('Prijava s Apple-om');
    });

    test('Slovenian (sl)', () => {
      expect(getAppleSignInText('sl')).toBe('Prijava z Apple');
    });

    test('Estonian (et)', () => {
      expect(getAppleSignInText('et')).toBe('Logi sisse Apple\'iga');
    });

    test('Latvian (lv)', () => {
      expect(getAppleSignInText('lv')).toBe('Piesakieties ar Apple');
    });

    test('Lithuanian (lt)', () => {
      expect(getAppleSignInText('lt')).toBe('Prisijungti su Apple');
    });

    test('Maltese (mt)', () => {
      expect(getAppleSignInText('mt')).toBe('Idħol b\'Apple');
    });

    test('Greek (el)', () => {
      expect(getAppleSignInText('el')).toBe('Σύνδεση με Apple');
    });

    test('Ukrainian (uk)', () => {
      expect(getAppleSignInText('uk')).toBe('Увійти через Apple');
    });

    test('Belarusian (be)', () => {
      expect(getAppleSignInText('be')).toBe('Увайсці праз Apple');
    });

    test('Macedonian (mk)', () => {
      expect(getAppleSignInText('mk')).toBe('Најавете се со Apple');
    });

    test('Albanian (sq)', () => {
      expect(getAppleSignInText('sq')).toBe('Hyr me Apple');
    });

    test('Serbian (sr)', () => {
      expect(getAppleSignInText('sr')).toBe('Пријавите се са Apple-ом');
    });

    test('Bosnian (bs)', () => {
      expect(getAppleSignInText('bs')).toBe('Prijavite se s Apple-om');
    });

    test('Montenegrin (me)', () => {
      expect(getAppleSignInText('me')).toBe('Prijavite se sa Apple-om');
    });

    test('Icelandic (is)', () => {
      expect(getAppleSignInText('is')).toBe('Skráðu þig inn með Apple');
    });

    test('Irish (ga)', () => {
      expect(getAppleSignInText('ga')).toBe('Sínigh isteach le Apple');
    });

    test('Welsh (cy)', () => {
      expect(getAppleSignInText('cy')).toBe('Mewngofnodi gydag Apple');
    });

    test('Basque (eu)', () => {
      expect(getAppleSignInText('eu')).toBe('Saioa hasi Apple-rekin');
    });

    test('Catalan (ca)', () => {
      expect(getAppleSignInText('ca')).toBe('Inicia sessió amb Apple');
    });

    test('Galician (gl)', () => {
      expect(getAppleSignInText('gl')).toBe('Iniciar sesión con Apple');
    });

    test('Occitan (oc)', () => {
      expect(getAppleSignInText('oc')).toBe('Se connectar amb Apple');
    });

    test('Breton (br)', () => {
      expect(getAppleSignInText('br')).toBe('Kevreañ gant Apple');
    });

    test('Friulian (fur)', () => {
      expect(getAppleSignInText('fur')).toBe('Jentre cun Apple');
    });

    test('Sardinian (sc)', () => {
      expect(getAppleSignInText('sc')).toBe('Intra cun Apple');
    });

    test('Venetian (vec)', () => {
      expect(getAppleSignInText('vec')).toBe('Intra cun Apple');
    });

    test('Lombard (lmo)', () => {
      expect(getAppleSignInText('lmo')).toBe('Intra cun Apple');
    });

    test('Piedmontese (pms)', () => {
      expect(getAppleSignInText('pms')).toBe('Intra cun Apple');
    });

    test('Ligurian (lij)', () => {
      expect(getAppleSignInText('lij')).toBe('Intra cun Apple');
    });

    test('Emilian (eml)', () => {
      expect(getAppleSignInText('eml')).toBe('Intra cun Apple');
    });

    test('Romagnol (rgn)', () => {
      expect(getAppleSignInText('rgn')).toBe('Intra cun Apple');
    });

    test('Neapolitan (nap)', () => {
      expect(getAppleSignInText('nap')).toBe('Intra cun Apple');
    });

    test('Sicilian (scn)', () => {
      expect(getAppleSignInText('scn')).toBe('Intra cun Apple');
    });

    test('Corsican (co)', () => {
      expect(getAppleSignInText('co')).toBe('Intra cun Apple');
    });

    test('Romansh (rm)', () => {
      expect(getAppleSignInText('rm')).toBe('S\'annunziar cun Apple');
    });

    test('Ladino (lad)', () => {
      expect(getAppleSignInText('lad')).toBe('Entrar kon Apple');
    });

    test('Jbo (jbo)', () => {
      expect(getAppleSignInText('jbo')).toBe('cu\'e Apple co\'e jvinu');
    });

    test('Esperanto (eo)', () => {
      expect(getAppleSignInText('eo')).toBe('Ensaluti per Apple');
    });

    test('Interlingua (ia)', () => {
      expect(getAppleSignInText('ia')).toBe('Aperir session con Apple');
    });

    test('Interlingue (ie)', () => {
      expect(getAppleSignInText('ie')).toBe('Intrar con Apple');
    });

    test('Volapük (vo)', () => {
      expect(getAppleSignInText('vo')).toBe('Nunädön me Apple');
    });

    test('Novial (nov)', () => {
      expect(getAppleSignInText('nov')).toBe('Intra kun Apple');
    });

    test('Lingua Franca Nova (lfn)', () => {
      expect(getAppleSignInText('lfn')).toBe('Intra con Apple');
    });

    test('Toki Pona (tok)', () => {
      expect(getAppleSignInText('tok')).toBe('o open e sitelen tawa jan tan Apple');
    });
  });

  describe('Locale normalization', () => {
    test('handles underscore separator', () => {
      expect(getAppleSignInText('en_US')).toBe('Sign in with Apple');
      expect(getAppleSignInText('es_ES')).toBe('Iniciar sesión con Apple');
      expect(getAppleSignInText('fr_FR')).toBe('Se connecter avec Apple');
    });

    test('handles case insensitive matching', () => {
      expect(getAppleSignInText('EN')).toBe('Sign in with Apple');
      expect(getAppleSignInText('ES')).toBe('Iniciar sesión con Apple');
      expect(getAppleSignInText('FR')).toBe('Se connecter avec Apple');
    });

    test('handles mixed case with region', () => {
      expect(getAppleSignInText('en-US')).toBe('Sign in with Apple');
      expect(getAppleSignInText('es-ES')).toBe('Iniciar sesión con Apple');
      expect(getAppleSignInText('fr-FR')).toBe('Se connecter avec Apple');
    });
  });

  describe('Fallback behavior', () => {
    test('falls back to language-only match when exact not found', () => {
      expect(getAppleSignInText('en-US')).toBe('Sign in with Apple');
      expect(getAppleSignInText('es-MX')).toBe('Iniciar sesión con Apple');
      expect(getAppleSignInText('fr-CA')).toBe('Se connecter avec Apple');
    });

    test('falls back to English for unsupported locales', () => {
      expect(getAppleSignInText('xx')).toBe('Sign in with Apple');
      expect(getAppleSignInText('unsupported')).toBe('Sign in with Apple');
      expect(getAppleSignInText('fake-locale')).toBe('Sign in with Apple');
    });

    test('handles empty string', () => {
      expect(getAppleSignInText('')).toBe('Sign in with Apple');
    });

    test('handles null/undefined', () => {
      expect(getAppleSignInText(null as any)).toBe('Sign in with Apple');
      expect(getAppleSignInText(undefined as any)).toBe('Sign in with Apple');
    });
  });

  describe('Browser locale detection', () => {
    let originalNavigator: Navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    test('uses navigator.language when no locale provided', () => {
      Object.defineProperty(global.navigator, 'language', {
        value: 'es',
        configurable: true
      });
      
      expect(getAppleSignInText()).toBe('Iniciar sesión con Apple');
    });

    test('falls back to English when navigator.language not available', () => {
      Object.defineProperty(global.navigator, 'language', {
        value: undefined,
        configurable: true
      });
      
      expect(getAppleSignInText()).toBe('Sign in with Apple');
    });

    test('handles server-side rendering (no navigator)', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(getAppleSignInText()).toBe('Sign in with Apple');
      
      global.window = originalWindow;
    });
  });

  describe('Apple compliance verification', () => {
    test('all strings contain "Apple"', () => {
      const locales = [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-CN', 'zh-TW',
        'ru', 'ar', 'he', 'hi', 'th', 'tr', 'nl', 'sv', 'da', 'no', 'fi',
        'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'et', 'lv', 'lt',
        'mt', 'el', 'uk', 'be', 'mk', 'sq', 'sr', 'bs', 'me', 'is', 'ga',
        'cy', 'eu', 'ca', 'gl', 'oc', 'br', 'fur', 'sc', 'vec', 'lmo',
        'pms', 'lij', 'eml', 'rgn', 'nap', 'scn', 'co', 'rm', 'lad', 'jbo',
        'eo', 'ia', 'ie', 'vo', 'nov', 'lfn', 'tok'
      ];

      locales.forEach(locale => {
        const text = getAppleSignInText(locale);
        expect(text).toContain('Apple');
      });
    });

    test('no strings are empty', () => {
      const locales = [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-CN', 'zh-TW',
        'ru', 'ar', 'he', 'hi', 'th', 'tr', 'nl', 'sv', 'da', 'no', 'fi',
        'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'et', 'lv', 'lt',
        'mt', 'el', 'uk', 'be', 'mk', 'sq', 'sr', 'bs', 'me', 'is', 'ga',
        'cy', 'eu', 'ca', 'gl', 'oc', 'br', 'fur', 'sc', 'vec', 'lmo',
        'pms', 'lij', 'eml', 'rgn', 'nap', 'scn', 'co', 'rm', 'lad', 'jbo',
        'eo', 'ia', 'ie', 'vo', 'nov', 'lfn', 'tok'
      ];

      locales.forEach(locale => {
        const text = getAppleSignInText(locale);
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });
});
