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
  'nav.sociology': 'Sociological Intel',
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
  // Copilot page
  'copilot.title': 'Intelligence Copilot',
  'copilot.subtitle': 'Ask in English or ಕನ್ನಡ — typed or spoken. Follow-ups refine the previous question.',
  'copilot.exportCsv': '⬇ CSV',
  'copilot.exportPdf': '⬇ PDF',
  'copilot.emptyPrompt': 'Start with one of these, or tap the mic:',
  'copilot.analysing': 'Analysing…',
  'copilot.inputPlaceholder': 'e.g. "Show theft cases in Mysuru" … then "Only solved cases"',
  'copilot.listening': 'Listening…',
  'copilot.askButton': 'Ask',
  'copilot.readAloud': '🔊 Read answers aloud',
  'copilot.noKannadaVoice': 'No Kannada text-to-speech voice is installed in this browser, so Kannada answers can\'t be read aloud. On macOS: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → add Kannada. English read-aloud still works.',
  'copilot.voiceNeedsChrome': 'Voice input needs Chrome or Edge',
  'copilot.stopListening': 'Stop listening',
  'copilot.confidence': '% confidence',
  'copilot.response.fir': 'FIR',
  'copilot.response.type': 'Type',
  'copilot.response.district': 'District',
  'copilot.response.occurred': 'Occurred',
  'copilot.response.status': 'Status',
  'copilot.response.showingOf': 'Showing 8 of',
  'copilot.response.matchingFirs': 'matching FIRs.',
  'copilot.response.risk': 'Risk',
  'copilot.response.evidence': 'Evidence:',
  'copilot.response.showReasoning': 'Show reasoning trail',
  'copilot.response.hideReasoning': 'Hide reasoning trail',
  'copilot.response.refinement': 'Interpreted as a refinement of the previous question',
  'copilot.response.executedQuery': 'Executed structured query against the FIR database',
  // Analytics page
  'analytics.title': 'Crime Pattern & Trend Analytics',
  'analytics.subtitle': 'Temporal, geographic and hotspot intelligence with a 3-month forecast (Modules C & H)',
  'analytics.loading': 'Computing analytics…',
  'analytics.monthly.title': 'Monthly registered FIRs — history and forecast',
  'analytics.monthly.subtitle': 'Dashed segment is a least-squares projection (H1)',
  'analytics.byCrimeType.title': 'By crime type',
  'analytics.byCrimeType.subtitle': 'Distribution across offence categories (C4 input)',
  'analytics.byDistrict.title': 'By district',
  'analytics.byDistrict.subtitle': 'Geographic distribution (C2)',
  'analytics.byHour.title': 'Hour-of-day pattern',
  'analytics.byHour.subtitle': 'When crimes occur (C1) — note the night-hour concentration',
  'analytics.hotspots.title': 'Hotspot intensity',
  'analytics.hotspots.subtitle': 'Relative incident volume by district; amber = emerging cluster (C3, H3)',
  'analytics.hotspots.emerging': '⚠ emerging',
  'analytics.hotspots.firs': 'FIRs',
  // Network page
  'network.title': 'Criminal Network Intelligence',
  'network.subtitle': 'Organized crime rings detected from repeat co-offending, with entity-relationship exploration (Module B)',
  'network.loading': 'Detecting criminal networks…',
  'network.rings.title': 'Detected crime rings',
  'network.rings.subtitle': 'People repeatedly co-accused across FIRs',
  'network.rings.members': 'members',
  'network.rings.jointCases': 'joint cases',
  'network.explorer.title': 'Entity relationship explorer',
  'network.explorer.subtitle': 'Select a person from a crime ring to expand their network',
  'network.explorer.hops': 'Hops:',
  'network.explorer.loadingGraph': 'Expanding network…',
  'network.explorer.noConnections': 'No connections found.',
  'network.explorer.pickSuspect': '⬡ Pick a suspect to visualize their network',
  'network.explorer.connectedTo': 'Entities connected to',
  'network.explorer.hopExpansion': 'Breadth-first expansion,',
  'network.explorer.hop': 'hop',
  'network.explorer.entitiesNote': '— persons, FIRs, phones, vehicles, accounts',
  // Financial page
  'financial.title': 'Financial Crime Intelligence',
  'financial.subtitle': 'Transaction link analysis, money trail visualization and circular-transfer detection (Module G)',
  'financial.loading': 'Tracing financial flows…',
  'financial.kpi.transactions': 'Transactions analysed',
  'financial.kpi.rings': 'Circular transfer rings',
  'financial.kpi.flaggedVolume': 'Volume in flagged rings',
  'financial.rings.title': 'Suspicious rings',
  'financial.rings.subtitle': 'Funds returning to their origin through 3+ accounts — a layering indicator (G3)',
  'financial.rings.showAll': 'Show full transaction network',
  'financial.rings.accounts': 'accounts',
  'financial.rings.backToOrigin': '→ back to origin',
  'financial.rings.none': 'No circular flows detected.',
  'financial.trail.titleAll': 'Money trail — significant flows',
  'financial.trail.subtitle': 'Accounts as nodes, transfers as links; hover to isolate (G2)',
  'financial.trail.noFlows': 'No significant flows to display.',
  'financial.highValue.title': 'High-value transfers',
  'financial.highValue.subtitle': 'Individual transactions above ₹1,00,000 (G1) — top',
  'financial.highValue.from': 'From',
  'financial.highValue.to': 'To',
  'financial.highValue.amount': 'Amount',
  'financial.highValue.date': 'Date',
  // Offenders page
  'offenders.title': 'Offender Risk Register',
  'offenders.subtitle': 'Repeat offenders ranked by explainable risk score: prior offenses, network influence, recency, versatility (Module E)',
  'offenders.loading': 'Scoring offender risk…',
  'offenders.filter.all': 'All',
  'offenders.filter.high': 'High',
  'offenders.filter.medium': 'Medium',
  'offenders.filter.low': 'Low',
  'offenders.offenders': 'offenders',
  'offenders.table.name': 'Name',
  'offenders.table.profile': 'Profile',
  'offenders.table.cases': 'Cases',
  'offenders.table.crimeTypes': 'Crime types',
  'offenders.table.associates': 'Associates',
  'offenders.table.lastActive': 'Last active',
  'offenders.table.riskScore': 'Risk score',
  'offenders.table.category': 'Category',
  'offenders.networkLink': 'Network Intel',
  'offenders.networkNote': 'Explore an offender\'s connections in',
  // Cases page
  'cases.title': 'Case Files',
  'cases.loading': 'Loading case files…',
  'cases.newCase': '+ New Case File',
  'cases.bulkImport': '⬆ Bulk import',
  'cases.empty.title': 'No case files yet',
  'cases.empty.body': 'This is the Live workspace — it holds your unit\'s own records and starts empty. Register your first case file or bulk-import from CSV, and every intelligence module (Copilot, networks, hotspots, forecasts) will compute from your real data.',
  'cases.empty.cta': '+ Register first case file',
  'cases.table.firNumber': 'FIR number',
  'cases.table.crimeType': 'Crime type',
  'cases.table.district': 'District',
  'cases.table.station': 'Police station',
  'cases.table.occurred': 'Occurred',
  'cases.table.status': 'Status',
  'cases.pagination.previous': '← Previous',
  'cases.pagination.next': 'Next →',
  'cases.pagination.pageOf': 'of',
  'cases.pagination.page': 'Page',
  // Audit page
  'audit.title': 'Audit Trail',
  'audit.subtitle': 'Every query, view and export is logged with the acting role (Module J2 — 100% auditability)',
  'audit.loading': 'Loading audit trail…',
  'audit.recentEvents': 'most recent events',
  'audit.table.time': 'Time (UTC)',
  'audit.table.role': 'Role',
  'audit.table.action': 'Action',
  'audit.table.detail': 'Detail',
  'audit.action.chat_query': 'Copilot query',
  'audit.action.view_analytics': 'Viewed analytics',
  'audit.action.view_offenders': 'Viewed offender register',
  'audit.action.explore_network': 'Explored network',
  'audit.action.view_crime_rings': 'Viewed crime rings',
  'audit.action.view_overview': 'Viewed overview',
  'audit.action.list_cases': 'Listed cases',
  'audit.action.view_case': 'Opened case file',
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
  'nav.sociology': 'ಸಮಾಜಶಾಸ್ತ್ರೀಯ ಗುಪ್ತಚರ',
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
  // Copilot page
  'copilot.title': 'ಗುಪ್ತಚರ ಕೋಪೈಲಟ್',
  'copilot.subtitle': 'ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ — ಟೈಪ್ ಅಥವಾ ಮಾತಿನ ಮೂಲಕ. ಮುಂದಿನ ಪ್ರಶ್ನೆಗಳು ಹಿಂದಿನ ಉತ್ತರವನ್ನು ಪರಿಷ್ಕರಿಸುತ್ತವೆ.',
  'copilot.exportCsv': '⬇ CSV',
  'copilot.exportPdf': '⬇ PDF',
  'copilot.emptyPrompt': 'ಈ ಉದಾಹರಣೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ, ಅಥವಾ ಮೈಕ್ ಒತ್ತಿ:',
  'copilot.analysing': 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ…',
  'copilot.inputPlaceholder': 'ಉದಾ. "ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ" … ನಂತರ "ಪರಿಹರಿಸಲಾದ ಪ್ರಕರಣಗಳು ಮಾತ್ರ"',
  'copilot.listening': 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ…',
  'copilot.askButton': 'ಕೇಳಿ',
  'copilot.readAloud': '🔊 ಉತ್ತರವನ್ನು ಕೇಳಿ',
  'copilot.noKannadaVoice': 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಸ್ಥಾಪಿತವಾಗಿಲ್ಲ, ಆದ್ದರಿಂದ ಕನ್ನಡ ಉತ್ತರಗಳನ್ನು ಓದಲು ಸಾಧ್ಯವಿಲ್ಲ. macOS ನಲ್ಲಿ: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → Add Kannada. ಇಂಗ್ಲಿಷ್ ಧ್ವನಿಯಲ್ಲಿ ಓದಬಹುದು.',
  'copilot.voiceNeedsChrome': 'ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗೆ Chrome ಅಥವಾ Edge ಬೇಕು',
  'copilot.stopListening': 'ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
  'copilot.confidence': '% ವಿಶ್ವಾಸ ಮಟ್ಟ',
  'copilot.response.fir': 'FIR',
  'copilot.response.type': 'ಪ್ರಕಾರ',
  'copilot.response.district': 'ಜಿಲ್ಲೆ',
  'copilot.response.occurred': 'ನಡೆದ ದಿನಾಂಕ',
  'copilot.response.status': 'ಸ್ಥಿತಿ',
  'copilot.response.showingOf': '8 ತೋರಿಸಲಾಗುತ್ತಿದೆ,',
  'copilot.response.matchingFirs': 'ಸರಿಸಮಾನವಾಗಿರುವ FIRಗಳು.',
  'copilot.response.risk': 'ಅಪಾಯ',
  'copilot.response.evidence': 'ಸಾಕ್ಷ್ಯ:',
  'copilot.response.showReasoning': 'ತಾರ್ಕಿಕ ಹಾದಿಯನ್ನು ತೋರಿಸಿ',
  'copilot.response.hideReasoning': 'ತಾರ್ಕಿಕ ಮಾರ್ಗವನ್ನು ಮರೆಮಾಡಿ',
  'copilot.response.refinement': 'ಹಿಂದಿನ ಪ್ರಶ್ನೆಯ ಪರಿಷ್ಕರಣೆಯಾಗಿ ಅರ್ಥೈಸಲಾಗಿದೆ',
  'copilot.response.executedQuery': 'FIR database ನಲ್ಲಿ ಪ್ರಶ್ನೆಯನ್ನು ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ',
  // Analytics page
  'analytics.title': 'ಅಪರಾಧ ಮಾದರಿ ಮತ್ತು ಪ್ರವೃತ್ತಿ ವಿಶ್ಲೇಷಣೆ',
  'analytics.subtitle': 'ಕಾಲಿಕ, ಭೌಗೋಳಿಕ ಮತ್ತು ಹಾಟ್‌ಸ್ಪಾಟ್ ಗುಪ್ತಚರ ವಿಶ್ಲೇಷಣೆಯೊಂದಿಗೆ 3 ತಿಂಗಳ ಮುನ್ಸೂಚನೆ (ಮಾಡ್ಯೂಲ್ C ಮತ್ತು H)',
  'analytics.loading': 'ವಿಶ್ಲೇಷಣೆ ನಡೆಯುತ್ತಿದೆ…',
  'analytics.monthly.title': 'ಮಾಸಿಕ ದಾಖಲಾದ FIRಗಳು — ಇತಿಹಾಸ ಮತ್ತು ಮುನ್ಸೂಚನೆ',
  'analytics.monthly.subtitle': 'ವಿರಾಮ ಗೆರೆಯು ಕನಿಷ್ಠ-ಚದರ ಪ್ರಕ್ಷೇಪಣವಾಗಿದೆ (H1)',
  'analytics.byCrimeType.title': 'ಅಪರಾಧದ ಪ್ರಕಾರ',
  'analytics.byCrimeType.subtitle': 'ಅಪರಾಧ ವರ್ಗಗಳ ವಿತರಣೆ (C4 ಇನ್‌ಪುಟ್)',
  'analytics.byDistrict.title': 'ಜಿಲ್ಲೆಯ ಪ್ರಕಾರ',
  'analytics.byDistrict.subtitle': 'ಭೌಗೋಳಿಕ ವಿತರಣೆ (C2)',
  'analytics.byHour.title': 'ದಿನದ ಗಂಟೆ ಮಾದರಿ',
  'analytics.byHour.subtitle': 'ಅಪರಾಧ ನಡೆಯುವ ಸಮಯ (C1) — ರಾತ್ರಿ ಗಂಟೆಯ ಕೇಂದ್ರೀಕರಣ ಗಮನಿಸಿ',
  'analytics.hotspots.title': 'ಹಾಟ್‌ಸ್ಪಾಟ್ ತೀವ್ರತೆ',
  'analytics.hotspots.subtitle': 'ಜಿಲ್ಲೆವಾರು ಸಾಪೇಕ್ಷ ಘಟನೆ ಪ್ರಮಾಣ; ಅಂಬರ್ = ಹೊಸ ಗುಂಪು (C3, H3)',
  'analytics.hotspots.emerging': '⚠ ಹೊಸದಾಗಿ ಉದ್ಭವಿಸುತ್ತಿದೆ',
  'analytics.hotspots.firs': 'FIRಗಳು',
  // Network page
  'network.title': 'ಅಪರಾಧ ಜಾಲ ಗುಪ್ತಚರ ವಿಶ್ಲೇಷಣೆ',
  'network.subtitle': 'ಪುನರಾವರ್ತಿತ ಸಹ-ಅಪರಾಧಗಳಿಂದ ಪತ್ತೆಯಾದ ಸಂಘಟಿತ ಅಪರಾಧ ಜಾಲಗಳು ಮತ್ತು ಘಟಕ ಸಂಬಂಧ ಅನ್ವೇಷಣೆ (ಮಾಡ್ಯೂಲ್ B)',
  'network.loading': 'ಅಪರಾಧ ಜಾಲಗಳನ್ನು ಪತ್ತೆ ಮಾಡಲಾಗುತ್ತಿದೆ…',
  'network.rings.title': 'ಪತ್ತೆಯಾದ ಅಪರಾಧ ಜಾಲಗಳು',
  'network.rings.subtitle': 'FIRಗಳಲ್ಲಿ ಪದೇಪದೇ ಸಹ-ಆರೋಪಿಗಳಾಗಿರುವ ವ್ಯಕ್ತಿಗಳು',
  'network.rings.members': 'ಸಂಬಂಧಿತ ವ್ಯಕ್ತಿಗಳು',
  'network.rings.jointCases': 'ಜಂಟಿ ಪ್ರಕರಣಗಳು',
  'network.explorer.title': 'ಘಟಕ ಸಂಬಂಧ ಅನ್ವೇಷಕ',
  'network.explorer.subtitle': 'ಅಪರಾಧ ಜಾಲದ ಸದಸ್ಯರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಅವರ ಸಂಪರ್ಕ ಜಾಲವನ್ನು ವಿಸ್ತರಿಸಿ',
  'network.explorer.hops': 'ಹಂತಗಳು:',
  'network.explorer.loadingGraph': 'ಜಾಲ ವಿಸ್ತರಿಸಲಾಗುತ್ತಿದೆ…',
  'network.explorer.noConnections': 'ಯಾವುದೇ ಸಂಪರ್ಕ ಕಂಡುಬಂದಿಲ್ಲ.',
  'network.explorer.pickSuspect': '⬡ ಸಂದೇಹಿತನನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಅವರ ಸಂಪರ್ಕ ಜಾಲವನ್ನು ವೀಕ್ಷಿಸಿ',
  'network.explorer.connectedTo': 'ಸಂಪರ್ಕಿತ ಘಟಕಗಳು —',
  'network.explorer.hopExpansion': 'ಅಗಲ-ಮೊದಲ ವಿಸ್ತರಣೆ,',
  'network.explorer.hop': 'ಹಂತ',
  'network.explorer.entitiesNote': '— ವ್ಯಕ್ತಿಗಳು, FIRಗಳು, ಫೋನ್‌ಗಳು, ವಾಹನಗಳು, ಖಾತೆಗಳು',
  // Financial page
  'financial.title': 'ಹಣಕಾಸು ಅಪರಾಧ ಗುಪ್ತಚರ ವಿಶ್ಲೇಷಣೆ',
  'financial.subtitle': 'ವಹಿವಾಟು ಸಂಪರ್ಕ ವಿಶ್ಲೇಷಣೆ, ಹಣದ ಹಾದಿ ದೃಶ್ಯೀಕರಣ ಮತ್ತು ವೃತ್ತಾಕಾರದ ವರ್ಗಾವಣೆ ಪತ್ತೆ (ಮಾಡ್ಯೂಲ್ G)',
  'financial.loading': 'ಹಣಕಾಸಿನ ಹರಿವನ್ನು ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ…',
  'financial.kpi.transactions': 'ವಿಶ್ಲೇಷಿಸಿದ ವ್ಯವಹಾರಗಳು',
  'financial.kpi.rings': 'ವೃತ್ತಾಕಾರದ ವರ್ಗಾವಣೆ ಜಾಲಗಳು',
  'financial.kpi.flaggedVolume': 'ಗುರುತಿಸಲಾದ ಜಾಲಗಳಲ್ಲಿನ ವಹಿವಾಟಿನ ಪ್ರಮಾಣ',
  'financial.rings.title': 'ಶಂಕಾಸ್ಪದ ಜಾಲಗಳು',
  'financial.rings.subtitle': '3+ ಖಾತೆಗಳ ಮೂಲಕ ಮೂಲಕ್ಕೆ ಮರಳುವ ಹಣ — ಲೇಯರಿಂಗ್ ಸೂಚಕ (G3)',
  'financial.rings.showAll': 'ಸಂಪೂರ್ಣ ವ್ಯವಹಾರ ಜಾಲ ತೋರಿಸಿ',
  'financial.rings.accounts': 'ಖಾತೆಗಳು',
  'financial.rings.backToOrigin': '→ ಮೂಲಕ್ಕೆ ಮರಳಿ',
  'financial.rings.none': 'ಯಾವುದೇ ವೃತ್ತಾಕಾರ ಹರಿವು ಪತ್ತೆಯಾಗಿಲ್ಲ.',
  'financial.trail.titleAll': 'ಹಣದ ಮಾರ್ಗ — ಮಹತ್ವದ ಹರಿವುಗಳು',
  'financial.trail.subtitle': 'ಖಾತೆಗಳು ನೋಡ್‌ಗಳಾಗಿ, ವರ್ಗಾವಣೆಗಳು ಸಂಪರ್ಕಗಳಾಗಿ; ಪ್ರತ್ಯೇಕವಾಗಿ ನೋಡಲು ಹೋವರ್ ಮಾಡಿ (G2)',
  'financial.trail.noFlows': 'ತೋರಿಸಲು ಯಾವುದೇ ಗಮನಾರ್ಹ ಹರಿವುಗಳು ಇಲ್ಲ.',
  'financial.highValue.title': 'ಅಧಿಕ ಮೌಲ್ಯದ ವರ್ಗಾವಣೆಗಳು',
  'financial.highValue.subtitle': '₹1,00,000 ಮೇಲಿನ ಪ್ರತ್ಯೇಕ ವ್ಯವಹಾರಗಳು (G1) — ಉನ್ನತ',
  'financial.highValue.from': 'ಕಳುಹಿಸಿದವರು',
  'financial.highValue.to': 'ಸ್ವೀಕರಿಸಿದವರು',
  'financial.highValue.amount': 'ಮೊತ್ತ',
  'financial.highValue.date': 'ದಿನಾಂಕ',
  // Offenders page
  'offenders.title': 'ಅಪರಾಧಿ ಅಪಾಯ ನೋಂದಣಿ',
  'offenders.subtitle': 'ಮರುಅಪರಾಧಿಗಳ ಶ್ರೇಯಾಂಕ — ಹಿಂದಿನ ಅಪರಾಧಗಳು, ಜಾಲದ ಪ್ರಭಾವ, ಇತ್ತೀಚಿನತೆ ಮತ್ತು ಅಪರಾಧ ವೈವಿಧ್ಯತೆಯ ಆಧಾರದ ಮೇಲೆ (ಮಾಡ್ಯೂಲ್ E)',
  'offenders.loading': 'ಅಪರಾಧಿ ಅಪಾಯ ಅಂಕ ಲೆಕ್ಕಾಚಾರ ಮಾಡಲಾಗುತ್ತಿದೆ…',
  'offenders.filter.all': 'ಎಲ್ಲರೂ',
  'offenders.filter.high': 'ಹೆಚ್ಚಿನ ಅಪಾಯ',
  'offenders.filter.medium': 'ಮಧ್ಯಮ ಅಪಾಯ',
  'offenders.filter.low': 'ಕಡಿಮೆ ಅಪಾಯ',
  'offenders.offenders': 'ಅಪರಾಧಿಗಳು',
  'offenders.table.name': 'ಹೆಸರು',
  'offenders.table.profile': 'ಪ್ರೊಫೈಲ್',
  'offenders.table.cases': 'ಪ್ರಕರಣಗಳು',
  'offenders.table.crimeTypes': 'ಅಪರಾಧ ಪ್ರಕಾರಗಳು',
  'offenders.table.associates': 'ಸಹಚರರು',
  'offenders.table.lastActive': 'ಕೊನೆಯ ಚಟುವಟಿಕೆ',
  'offenders.table.riskScore': 'ಅಪಾಯ ಅಂಕ',
  'offenders.table.category': 'ವರ್ಗ',
  'offenders.networkLink': 'ಜಾಲ ಗುಪ್ತಚರ',
  'offenders.networkNote': 'ಅಪರಾಧಿಯ ಸಂಪರ್ಕಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
  // Cases page
  'cases.title': 'ಪ್ರಕರಣ ಕಡತಗಳು',
  'cases.loading': 'ಪಪ್ರಕರಣ ಕಡತಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ…',
  'cases.newCase': '+ ಹೊಸ ಪ್ರಕರಣ ಕಡತ',
  'cases.bulkImport': '⬆ ಬೃಹತ್ ಆಮದು',
  'cases.empty.title': 'ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಕರಣ ಕಡತ ಇಲ್ಲ',
  'cases.empty.body': 'ಇದು ಲೈವ್ ಕಾರ್ಯಕ್ಷೇತ್ರ — ನಿಮ್ಮ ಘಟಕದ ಸ್ವಂತ ದಾಖಲೆಗಳಿಗಾಗಿ ಇದನ್ನು ಬಳಸಲಾಗುತ್ತದೆ ಮತ್ತು ಇದು ಖಾಲಿ ಸ್ಥಿತಿಯಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಮೊದಲ ಪ್ರಕರಣ ಕಡತವನ್ನು ಸೇರಿಸಿ ಅಥವಾ CSV ಮೂಲಕ ಹಲವು ಕಡತಗಳನ್ನು ಆಮದು ಮಾಡಿ. ನಂತರ ಕೋಪೈಲಟ್, ಜಾಲಗಳು, ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು ಮತ್ತು ಮುನ್ಸೂಚನೆಗಳಂತಹ ಎಲ್ಲಾ ಗುಪ್ತಚರ ಘಟಕಗಳು ನಿಮ್ಮ ನೈಜ ದತ್ತಾಂಶದ ಆಧಾರದ ಮೇಲೆ ವಿಶ್ಲೇಷಣೆ ನಡೆಸುತ್ತವೆ.',
  'cases.empty.cta': '+ ಮೊದಲ ಪ್ರಕರಣ ಕಡತ ನೋಂದಣಿ ಮಾಡಿ',
  'cases.table.firNumber': 'FIR ಸಂಖ್ಯೆ',
  'cases.table.crimeType': 'ಅಪರಾಧ ಪ್ರಕಾರ',
  'cases.table.district': 'ಜಿಲ್ಲೆ',
  'cases.table.station': 'ಪೊಲೀಸ್ ಠಾಣೆ',
  'cases.table.occurred': 'ನಡೆದ ದಿನಾಂಕ',
  'cases.table.status': 'ಸ್ಥಿತಿ',
  'cases.pagination.previous': '← ಹಿಂದಿನ',
  'cases.pagination.next': 'ಮುಂದಿನ →',
  'cases.pagination.pageOf': 'ರಲ್ಲಿ',
  'cases.pagination.page': 'ಪುಟ',
  // Audit page
  'audit.title': 'ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ',
  'audit.subtitle': 'ಪ್ರತಿ ಪ್ರಶ್ನೆ, ವೀಕ್ಷಣೆ ಮತ್ತು ರಫ್ತು ಕಾರ್ಯವನ್ನು ನಿರ್ವಹಿಸಿದ ಪಾತ್ರದೊಂದಿಗೆ ದಾಖಲಿಸಲಾಗುತ್ತದೆ (ಮಾಡ್ಯೂಲ್ J2 — 100% ಲೆಕ್ಕಪರಿಶೋಧ್ಯತೆ)',
  'audit.loading': 'ಲೆಕ್ಕಪರಿಶೋಧನಾ ದಾಖಲೆ ತೆರೆಯಲಾಗುತ್ತಿದೆ…',
  'audit.recentEvents': 'ಇತ್ತೀಚಿನ ಘಟನೆಗಳು',
  'audit.table.time': 'ಸಮಯ (UTC)',
  'audit.table.role': 'ಪಾತ್ರ',
  'audit.table.action': 'ಕ್ರಿಯೆ',
  'audit.table.detail': 'ವಿವರ',
  'audit.action.chat_query': 'ಕೋಪೈಲಟ್ ಪ್ರಶ್ನೆ',
  'audit.action.view_analytics': 'ನೋಡಿರುವ ವಿಶ್ಲೇಷಣೆಗಳು',
  'audit.action.view_offenders': 'ನೋಡಿರುವ ಅಪರಾಧಿ ನೋಂದಣಿು',
  'audit.action.explore_network': 'ಅನ್ವೇಷಿಸಿರುವ ಜಾಲ',
  'audit.action.view_crime_rings': 'ನೋಡಿರುವ ಅಪರಾಧ ಜಾಲಗಳು',
  'audit.action.view_overview': 'ನೋಡಿರುವ ಅವಲೋಕನ',
  'audit.action.list_cases': 'ಪಟ್ಟಿ ಮಾಡಿರುವ ಪ್ರಕರಣಗಳು',
  'audit.action.view_case': 'ಪತೆರೆದಿರುವ ಪ್ರಕರಣ ಕಡತ',
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
