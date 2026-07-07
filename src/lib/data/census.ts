/**
 * Karnataka 2011 Census district indicators (Module D — Sociological Intelligence).
 *
 * Sources:
 *   - Primary Census Abstract 2011, Office of the Registrar General & Census Commissioner, India.
 *   - Karnataka District-wise data: https://censusindia.gov.in/census.website/
 *
 * Only the 10 districts modelled in DRISHTI's synthetic dataset are included.
 * District names follow the app's dataset labels; two map to official census
 * districts under different names: "Mangaluru" = Dakshina Kannada district,
 * "Hubballi-Dharwad" = Dharwad district.
 *
 * Population and literacy figures are the official 2011 Census values.
 * Urbanisation figures are approximate (rounded % of population classed
 * urban in 2011) — adequate for correlation analysis, not for citation.
 */

export interface CensusDistrict {
  district: string;
  /** Total population (2011 Census). */
  population: number;
  /** Literacy rate (%) — persons aged 7+ who can read and write. */
  literacyPct: number;
  /** Urbanisation rate (%) — share of population in urban areas. */
  urbanizationPct: number;
}

/** Static 2011 Census data for the 10 DRISHTI districts. */
export const CENSUS_DATA: CensusDistrict[] = [
  { district: 'Bengaluru City',    population: 9621551, literacyPct: 87.67, urbanizationPct: 91 },
  { district: 'Bengaluru Rural',   population: 990923,  literacyPct: 77.93, urbanizationPct: 27 },
  { district: 'Mysuru',            population: 3001127, literacyPct: 72.79, urbanizationPct: 41 },
  { district: 'Mangaluru',         population: 2089649, literacyPct: 88.57, urbanizationPct: 48 },
  { district: 'Hubballi-Dharwad',  population: 1847023, literacyPct: 80.00, urbanizationPct: 57 },
  { district: 'Belagavi',          population: 4779661, literacyPct: 73.48, urbanizationPct: 25 },
  { district: 'Kalaburagi',        population: 2566326, literacyPct: 64.85, urbanizationPct: 33 },
  { district: 'Shivamogga',        population: 1752753, literacyPct: 80.45, urbanizationPct: 36 },
  { district: 'Tumakuru',          population: 2678980, literacyPct: 75.14, urbanizationPct: 22 },
  { district: 'Ballari',           population: 2452595, literacyPct: 67.43, urbanizationPct: 38 },
];
