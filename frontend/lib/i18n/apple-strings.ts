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
// - Occitan (oc)
// - Breton (br)
// - Friulian (fur)
// - Sardinian (sc)
// - Venetian (vec)
// - Lombard (lmo)
// - Piedmontese (pms)
// - Ligurian (lij)
// - Emilian (eml)
// - Romagnol (rgn)
// - Neapolitan (nap)
// - Sicilian (scn)
// - Corsican (co)
// - Romansh (rm)
// - Ladino (lad)
// - Jbo (jbo)
// - Esperanto (eo)
// - Interlingua (ia)
// - Interlingue (ie)
// - Volapük (vo)
// - Novial (nov)
// - Lingua Franca Nova (lfn)
// - Toki Pona (tok)

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
  { code: 'gl', text: 'Iniciar sesión con Apple' },
  { code: 'oc', text: 'Se connectar amb Apple' },
  { code: 'br', text: 'Kevreañ gant Apple' },
  { code: 'fur', text: 'Jentre cun Apple' },
  { code: 'sc', text: 'Intra cun Apple' },
  { code: 'vec', text: 'Intra cun Apple' },
  { code: 'lmo', text: 'Intra cun Apple' },
  { code: 'pms', text: 'Intra cun Apple' },
  { code: 'lij', text: 'Intra cun Apple' },
  { code: 'eml', text: 'Intra cun Apple' },
  { code: 'rgn', text: 'Intra cun Apple' },
  { code: 'nap', text: 'Intra cun Apple' },
  { code: 'scn', text: 'Intra cun Apple' },
  { code: 'co', text: 'Intra cun Apple' },
  { code: 'rm', text: 'S\'annunziar cun Apple' },
  { code: 'lad', text: 'Entrar kon Apple' },
  { code: 'jbo', text: 'cu\'e Apple co\'e jvinu' },
  { code: 'eo', text: 'Ensaluti per Apple' },
  { code: 'ia', text: 'Aperir session con Apple' },
  { code: 'ie', text: 'Intrar con Apple' },
  { code: 'vo', text: 'Nunädön me Apple' },
  { code: 'nov', text: 'Intra kun Apple' },
  { code: 'lfn', text: 'Intra con Apple' },
  { code: 'tok', text: 'o open e sitelen tawa jan tan Apple' }
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

  // Normalize locale code
  const normalizedLocale = locale.toLowerCase().replace('_', '-');
  
  // Try exact match first
  const exactMatch = APPLE_SIGN_IN_STRINGS.find(
    item => item.code === normalizedLocale
  );
  if (exactMatch) return exactMatch.text;

  // Try language-only match (e.g., 'en-US' -> 'en')
  const languageOnly = normalizedLocale.split('-')[0];
  const languageMatch = APPLE_SIGN_IN_STRINGS.find(
    item => item.code === languageOnly
  );
  if (languageMatch) return languageMatch.text;

  // Fallback to English
  return 'Sign in with Apple';
}
