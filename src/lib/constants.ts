export const APP_NAME = 'DRISHTI';
export const APP_FULL_NAME = 'DRISHTI — KSP Crime Intelligence Copilot';

export const DISTRICTS = [
  'Bengaluru City',
  'Bengaluru Rural',
  'Mysuru',
  'Mangaluru',
  'Hubballi-Dharwad',
  'Belagavi',
  'Kalaburagi',
  'Shivamogga',
  'Tumakuru',
  'Ballari',
] as const;

export type District = (typeof DISTRICTS)[number];

export const CRIME_TYPES = [
  'Theft',
  'Burglary',
  'Cybercrime',
  'Murder',
  'Assault',
  'Chain Snatching',
  'Vehicle Theft',
  'Fraud',
  'Drug Trafficking',
  'Extortion',
] as const;

export type CrimeType = (typeof CRIME_TYPES)[number];

export const FIR_STATUSES = ['Open', 'Under Investigation', 'Solved'] as const;

export type FirStatus = (typeof FIR_STATUSES)[number];

export const MODUS_OPERANDI = [
  'Night-time break-in via rear entry',
  'Two-wheeler drive-by snatching',
  'Phishing link via SMS',
  'OTP fraud impersonating bank staff',
  'Lock-picking of parked vehicles',
  'Daytime entry posing as service staff',
  'Threat calls demanding payment',
  'Fake job offer advance-fee scam',
  'Knife-point street robbery',
  'Courier parcel scam',
] as const;

export const USER_ROLES = [
  'Investigator',
  'Analyst',
  'Supervisor',
  'Administrator',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Approximate district HQ coordinates used for map/heat visualisation. */
export const DISTRICT_COORDS: Record<District, { lat: number; lon: number }> = {
  'Bengaluru City': { lat: 12.9716, lon: 77.5946 },
  'Bengaluru Rural': { lat: 13.2846, lon: 77.6096 },
  Mysuru: { lat: 12.2958, lon: 76.6394 },
  Mangaluru: { lat: 12.9141, lon: 74.856 },
  'Hubballi-Dharwad': { lat: 15.3647, lon: 75.124 },
  Belagavi: { lat: 15.8497, lon: 74.4977 },
  Kalaburagi: { lat: 17.3297, lon: 76.8343 },
  Shivamogga: { lat: 13.9299, lon: 75.5681 },
  Tumakuru: { lat: 13.3379, lon: 77.1173 },
  Ballari: { lat: 15.1394, lon: 76.9214 },
};

export const RISK_THRESHOLDS = { HIGH: 65, MEDIUM: 35 } as const;

export const DATASET_START = '2024-01-01';
export const DATASET_END = '2026-06-30';
