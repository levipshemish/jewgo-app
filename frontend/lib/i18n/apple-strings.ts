// Apple-approved localized strings for "Apple" (simplified button text)
// These are simplified versions for cleaner UI
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
  { code: 'en', text: 'Apple' },
  { code: 'es', text: 'Apple' },
  { code: 'fr', text: 'Apple' },
  { code: 'de', text: 'Apple' },
  { code: 'it', text: 'Apple' },
  { code: 'pt', text: 'Apple' },
  { code: 'ja', text: 'Apple' },
  { code: 'ko', text: 'Apple' },
  { code: 'zh-CN', text: 'Apple' },
  { code: 'zh-TW', text: 'Apple' },
  { code: 'ru', text: 'Apple' },
  { code: 'ar', text: 'Apple' },
  { code: 'he', text: 'Apple' },
  { code: 'hi', text: 'Apple' },
  { code: 'th', text: 'Apple' },
  { code: 'tr', text: 'Apple' },
  { code: 'nl', text: 'Apple' },
  { code: 'sv', text: 'Apple' },
  { code: 'da', text: 'Apple' },
  { code: 'no', text: 'Apple' },
  { code: 'fi', text: 'Apple' },
  { code: 'pl', text: 'Apple' },
  { code: 'cs', text: 'Apple' },
  { code: 'sk', text: 'Apple' },
  { code: 'hu', text: 'Apple' },
  { code: 'ro', text: 'Apple' },
  { code: 'bg', text: 'Apple' },
  { code: 'hr', text: 'Apple' },
  { code: 'sl', text: 'Apple' },
  { code: 'et', text: 'Apple' },
  { code: 'lv', text: 'Apple' },
  { code: 'lt', text: 'Apple' },
  { code: 'mt', text: 'Apple' },
  { code: 'el', text: 'Apple' },
  { code: 'uk', text: 'Apple' },
  { code: 'be', text: 'Apple' },
  { code: 'mk', text: 'Apple' },
  { code: 'sq', text: 'Apple' },
  { code: 'sr', text: 'Apple' },
  { code: 'bs', text: 'Apple' },
  { code: 'me', text: 'Apple' },
  { code: 'is', text: 'Apple' },
  { code: 'ga', text: 'Apple' },
  { code: 'cy', text: 'Apple' },
  { code: 'eu', text: 'Apple' },
  { code: 'ca', text: 'Apple' },
  { code: 'gl', text: 'Apple' }
];

/**
 * Get Apple button text for the current locale
 * Falls back to "Apple" if locale is not supported
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

  // Fallback to "Apple"
  return 'Apple';
}
