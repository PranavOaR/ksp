'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'kn';

const LANG_STORAGE_KEY = 'drishti-lang';

const en = {
  // Public navbar
  'nav.platform': 'Platform',
  'nav.modules': 'Modules',
  'nav.security': 'Security',
  'nav.signIn': 'Sign In',
  'nav.getStarted': 'Get Started',
  // Landing hero
  'landing.eyebrowStrong': 'Powered by AI',
  'landing.eyebrowRest': ': every answer backed by FIR evidence.',
  'landing.h1a': 'Stop',
  'landing.h1b': 'investigating',
  'landing.h1c': 'in the dark.',
  'landing.sub':
    'DRISHTI is the intelligence platform that shows what happened, who is connected, and what comes next. Clarity, backed by evidence.',
  'landing.ctaPrimary': 'Explore the intelligence →',
  'landing.ctaSecondary': 'See a live case file ⊙',
  'landing.finePrint': 'Synthetic demonstration data. Built for Karnataka State Police.',
  'landing.withDrishti': 'With DRISHTI',
  'landing.withoutDrishti': 'Without DRISHTI',
  'landing.footerCaps':
    'Conversational AI · Network Intelligence · Forecasting · Financial Analysis · Audit-Ready',
  'landing.footerNote':
    'Role-based access · Every query recorded in the audit trail · Secure sessions',
  // Login
  'login.title': 'Officer sign in',
  'login.subtitle': 'Access is role-based and every session is audit-logged.',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign in →',
  'login.signingIn': 'Signing in…',
  'login.demoLabel': 'Demo accounts · password',
  'login.footer': 'Synthetic demonstration environment · Karnataka State Police',
  // App chrome
  'chrome.ksp': 'Karnataka State Police',
  'chrome.signOut': 'Sign out',
  'chrome.signingOut': 'Signing out…',
  'chrome.goodMorning': 'Good morning',
  'chrome.goodAfternoon': 'Good afternoon',
  'chrome.goodEvening': 'Good evening',
  'chrome.sidebarNote1': 'Synthetic demonstration data only.',
  'chrome.sidebarNote2': 'Every access is recorded in the audit trail.',
  'nav.overview': 'Command Overview',
  'nav.copilot': 'Copilot',
  'nav.network': 'Network Intel',
  'nav.financial': 'Financial Intel',
  'nav.analytics': 'Analytics',
  'nav.offenders': 'Offender Risk',
  'nav.cases': 'Case Files',
  'nav.audit': 'Audit Trail',
  // Roles
  'role.Investigator': 'Investigator',
  'role.Analyst': 'Analyst',
  'role.Supervisor': 'Supervisor',
  'role.Administrator': 'Administrator',
  // Overview
  'overview.title': 'Command Overview',
  'overview.kpi.totalFirs': 'FIRs on record',
  'overview.kpi.solvedRate': 'Solved rate',
  'overview.kpi.repeatOffenders': 'Repeat offenders',
  'overview.kpi.highRiskOffenders': 'High-risk offenders',
  'overview.kpi.crimeRings': 'Crime rings detected',
  'overview.alerts.title': 'Early warning alerts',
  'overview.alerts.subtitle': 'Emerging hotspots this quarter (Module H2)',
  'overview.alerts.none': 'No emerging hotspots detected.',
  'overview.recent.title': 'Latest FIRs',
  'overview.recent.subtitle': 'Most recently registered cases',
  'overview.copilot.title': 'Ask the Copilot',
  'overview.copilot.subtitle': 'Natural-language access to the crime database (Module A)',
  'overview.copilot.open': 'Open the Copilot →',
  'overview.note.Investigator': 'Your active leads: ask the Copilot, then review the latest FIRs.',
  'overview.note.Analyst': 'Emerging patterns first — full trends and forecasts are in Analytics.',
  'overview.note.Supervisor':
    'District alerts and case flow at a glance; the audit trail is one click away.',
  'overview.note.Administrator': 'Full oversight: all modules, audit trail and access control.',
  // Shared page bits
  'common.getStartedCta': 'Ready to see it in action?',
  'common.openApp': 'Open DRISHTI →',
} as const;

export type MessageKey = keyof typeof en;

const kn: Record<MessageKey, string> = {
  'nav.platform': 'ವೇದಿಕೆ',
  'nav.modules': 'ಮಾಡ್ಯೂಲ್‌ಗಳು',
  'nav.security': 'ಭದ್ರತೆ',
  'nav.signIn': 'ಸೈನ್ ಇನ್',
  'nav.getStarted': 'ಪ್ರಾರಂಭಿಸಿ',
  'landing.eyebrowStrong': 'AI ಚಾಲಿತ',
  'landing.eyebrowRest': ' — ಪ್ರತಿ ಉತ್ತರಕ್ಕೂ FIR ಸಾಕ್ಷ್ಯದ ಆಧಾರ.',
  'landing.h1a': 'ಕತ್ತಲಲ್ಲಿ',
  'landing.h1b': 'ತನಿಖೆ',
  'landing.h1c': 'ಇನ್ನು ಸಾಕು.',
  'landing.sub':
    'ಏನಾಯಿತು, ಯಾರು ಸಂಪರ್ಕದಲ್ಲಿದ್ದಾರೆ, ಮುಂದೇನಾಗಬಹುದು — ಎಲ್ಲವನ್ನೂ ತೋರಿಸುವ ಗುಪ್ತಚರ ವೇದಿಕೆ DRISHTI. ಸಾಕ್ಷ್ಯ ಆಧಾರಿತ ಸ್ಪಷ್ಟತೆ.',
  'landing.ctaPrimary': 'ಗುಪ್ತಚರ ಅನ್ವೇಷಿಸಿ →',
  'landing.ctaSecondary': 'ನೇರ ಪ್ರಕರಣ ಕಡತ ನೋಡಿ ⊙',
  'landing.finePrint': 'ಸಂಶ್ಲೇಷಿತ ಪ್ರದರ್ಶನ ದತ್ತಾಂಶ. ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್‌ಗಾಗಿ ನಿರ್ಮಿತ.',
  'landing.withDrishti': 'DRISHTI ಸಹಿತ',
  'landing.withoutDrishti': 'DRISHTI ರಹಿತ',
  'landing.footerCaps':
    'ಸಂವಾದ AI · ಜಾಲ ಗುಪ್ತಚರ · ಮುನ್ಸೂಚನೆ · ಹಣಕಾಸು ವಿಶ್ಲೇಷಣೆ · ಲೆಕ್ಕಪರಿಶೋಧನೆ-ಸಿದ್ಧ',
  'landing.footerNote':
    'ಪಾತ್ರ ಆಧಾರಿತ ಪ್ರವೇಶ · ಪ್ರತಿ ಪ್ರಶ್ನೆಯೂ ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆಯಲ್ಲಿ · ಸುರಕ್ಷಿತ ಸೆಷನ್‌ಗಳು',
  'login.title': 'ಅಧಿಕಾರಿ ಸೈನ್ ಇನ್',
  'login.subtitle': 'ಪ್ರವೇಶ ಪಾತ್ರ ಆಧಾರಿತ; ಪ್ರತಿ ಸೆಷನ್ ದಾಖಲಾಗುತ್ತದೆ.',
  'login.username': 'ಬಳಕೆದಾರ ಹೆಸರು',
  'login.password': 'ಪಾಸ್‌ವರ್ಡ್',
  'login.submit': 'ಸೈನ್ ಇನ್ →',
  'login.signingIn': 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ…',
  'login.demoLabel': 'ಡೆಮೊ ಖಾತೆಗಳು · ಪಾಸ್‌ವರ್ಡ್',
  'login.footer': 'ಸಂಶ್ಲೇಷಿತ ಪ್ರದರ್ಶನ ಪರಿಸರ · ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್',
  'chrome.ksp': 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್',
  'chrome.signOut': 'ಸೈನ್ ಔಟ್',
  'chrome.signingOut': 'ಸೈನ್ ಔಟ್ ಆಗುತ್ತಿದೆ…',
  'chrome.goodMorning': 'ಶುಭೋದಯ',
  'chrome.goodAfternoon': 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
  'chrome.goodEvening': 'ಶುಭ ಸಂಜೆ',
  'chrome.sidebarNote1': 'ಸಂಶ್ಲೇಷಿತ ಪ್ರದರ್ಶನ ದತ್ತಾಂಶ ಮಾತ್ರ.',
  'chrome.sidebarNote2': 'ಪ್ರತಿ ಪ್ರವೇಶವೂ ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆಯಲ್ಲಿ ಸೇರುತ್ತದೆ.',
  'nav.overview': 'ಕಮಾಂಡ್ ಅವಲೋಕನ',
  'nav.copilot': 'ಕೋಪೈಲಟ್',
  'nav.network': 'ಜಾಲ ಗುಪ್ತಚರ',
  'nav.financial': 'ಹಣಕಾಸು ಗುಪ್ತಚರ',
  'nav.analytics': 'ವಿಶ್ಲೇಷಣೆ',
  'nav.offenders': 'ಅಪರಾಧಿ ಅಪಾಯ',
  'nav.cases': 'ಪ್ರಕರಣ ಕಡತಗಳು',
  'nav.audit': 'ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ',
  'role.Investigator': 'ತನಿಖಾಧಿಕಾರಿ',
  'role.Analyst': 'ವಿಶ್ಲೇಷಕ',
  'role.Supervisor': 'ಮೇಲ್ವಿಚಾರಕ',
  'role.Administrator': 'ನಿರ್ವಾಹಕ',
  'overview.title': 'ಕಮಾಂಡ್ ಅವಲೋಕನ',
  'overview.kpi.totalFirs': 'ದಾಖಲಿತ FIRಗಳು',
  'overview.kpi.solvedRate': 'ಪರಿಹಾರ ದರ',
  'overview.kpi.repeatOffenders': 'ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಗಳು',
  'overview.kpi.highRiskOffenders': 'ಹೆಚ್ಚಿನ ಅಪಾಯದ ಅಪರಾಧಿಗಳು',
  'overview.kpi.crimeRings': 'ಪತ್ತೆಯಾದ ಅಪರಾಧ ಜಾಲಗಳು',
  'overview.alerts.title': 'ಮುನ್ನೆಚ್ಚರಿಕೆ ಎಚ್ಚರಿಕೆಗಳು',
  'overview.alerts.subtitle': 'ಈ ತ್ರೈಮಾಸಿಕದ ಹೊಸ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು (ಮಾಡ್ಯೂಲ್ H2)',
  'overview.alerts.none': 'ಹೊಸ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು ಪತ್ತೆಯಾಗಿಲ್ಲ.',
  'overview.recent.title': 'ಇತ್ತೀಚಿನ FIRಗಳು',
  'overview.recent.subtitle': 'ಇತ್ತೀಚೆಗೆ ದಾಖಲಾದ ಪ್ರಕರಣಗಳು',
  'overview.copilot.title': 'ಕೋಪೈಲಟ್ ಕೇಳಿ',
  'overview.copilot.subtitle': 'ಅಪರಾಧ ದತ್ತಸಂಚಯಕ್ಕೆ ಸಹಜ ಭಾಷೆಯ ಪ್ರವೇಶ (ಮಾಡ್ಯೂಲ್ A)',
  'overview.copilot.open': 'ಕೋಪೈಲಟ್ ತೆರೆಯಿರಿ →',
  'overview.note.Investigator': 'ನಿಮ್ಮ ಸಕ್ರಿಯ ಸುಳಿವುಗಳು: ಕೋಪೈಲಟ್ ಕೇಳಿ, ನಂತರ ಇತ್ತೀಚಿನ FIRಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
  'overview.note.Analyst': 'ಮೊದಲು ಹೊಸ ಮಾದರಿಗಳು — ಪೂರ್ಣ ಪ್ರವೃತ್ತಿ ಮತ್ತು ಮುನ್ಸೂಚನೆಗಳು ವಿಶ್ಲೇಷಣೆಯಲ್ಲಿ.',
  'overview.note.Supervisor': 'ಜಿಲ್ಲಾ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಪ್ರಕರಣದ ಹರಿವು ಒಂದೇ ನೋಟದಲ್ಲಿ.',
  'overview.note.Administrator': 'ಪೂರ್ಣ ಮೇಲ್ವಿಚಾರಣೆ: ಎಲ್ಲಾ ಮಾಡ್ಯೂಲ್‌ಗಳು ಮತ್ತು ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ.',
  'common.getStartedCta': 'ಕಾರ್ಯದಲ್ಲಿ ನೋಡಲು ಸಿದ್ಧರೇ?',
  'common.openApp': 'DRISHTI ತೆರೆಯಿರಿ →',
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, kn };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (key) => en[key],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with 'en' so SSR and first client render match; load preference after mount
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'kn') setLangState('kn');
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (key) => MESSAGES[lang][key] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Bilingual content helper for page-local copy: pick(lang, {en, kn}). */
export function pick<T>(lang: Lang, content: { en: T; kn: T }): T {
  return content[lang];
}

/** The EN ⇄ ಕನ್ನಡ pill switch. */
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
      title={lang === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ' : 'Switch to English'}
      className={`rounded-full border border-[var(--border-1)] bg-[var(--surface-2)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] ${className}`}
    >
      {lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
    </button>
  );
}
