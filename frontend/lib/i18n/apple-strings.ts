// Apple-approved localized strings for "Sign in with Apple"
// These are Apple's official strings and must not be modified
// 
// Source: Apple Human Interface Guidelines - Sign in with Apple
// https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
// 
// Apple officially supports these locales for "Sign in with Apple":
// - English (en)
// - Spanish (es) 
// - French (fr)
// - German (de)
// - Italian (it)
// - Portuguese (pt)
// - Japanese (ja)
// - Korean (ko)
// - Chinese Simplified (zh-CN)
// - Chinese Traditional (zh-TW)
// - Russian (ru)
// - Arabic (ar)
// - Hebrew (he)
// - Hindi (hi)
// - Thai (th)
// - Turkish (tr)
// - Dutch (nl)
// - Swedish (sv)
// - Danish (da)
// - Norwegian (no)
// - Finnish (fi)
// - Polish (pl)
// - Czech (cs)
// - Slovak (sk)
// - Hungarian (hu)
// - Romanian (ro)
// - Bulgarian (bg)
// - Croatian (hr)
// - Slovenian (sl)
// - Estonian (et)
// - Latvian (lv)
// - Lithuanian (lt)
// - Maltese (mt)
// - Greek (el)
// - Ukrainian (uk)
// - Belarusian (be)
// - Macedonian (mk)
// - Albanian (sq)
// - Serbian (sr)
// - Bosnian (bs)
// - Montenegrin (me)
// - Icelandic (is)
// - Irish (ga)
// - Welsh (cy)
// - Basque (eu)
// - Catalan (ca)
// - Galician (gl)

interface SupportedLocale {
  code: string;
  text: string;
}

const APPLE_SIGN_IN_STRINGS: SupportedLocale[] = [
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

/**
 * Get Apple-approved "Sign in with Apple" text for the current locale
 * Falls back to English if locale is not supported
 */
export function getAppleSignInText(locale?: string): string {
  if (!locale) {
    // Try to get locale from browser
    if (typeof window !== 'undefined') {
      locale = navigator.language || 'en';
    } else {
      locale = 'en';
    }
  }

  // Create a Map for case-insensitive lookup
  const localeMap = new Map<string, string>();
  APPLE_SIGN_IN_STRINGS.forEach(item => {
    localeMap.set(item.code.toLowerCase(), item.text);
  });

  // Normalize locale code to lowercase
  const normalizedLocale = locale.toLowerCase().replace('_', '-');
  
  // Try exact match first (case-insensitive)
  const exactMatch = localeMap.get(normalizedLocale);
  if (exactMatch) {
    return exactMatch;
  }

  // Try language-only match (e.g., 'en-US' -> 'en')
  const languageOnly = normalizedLocale.split('-')[0];
  const languageMatch = localeMap.get(languageOnly);
  if (languageMatch) {
    return languageMatch;
  }

  // Fallback to English
  return 'Sign in with Apple';
}
