/**
 * Karnataka 2011 Census district indicators (Module D — Sociological Intelligence).
 *
 * Sources:
 *   - Primary Census Abstract 2011, Office of the Registrar General & Census Commissioner, India.
 *   - Karnataka District-wise data: https://censusindia.gov.in/census.website/
 *
 * Only the 10 districts modelled in DRISHTI's synthetic dataset are included.
 * Population figures are approximate district-level totals from Census 2011.
 * Literacy and urbanisation figures are from the 2011 Primary Census Abstract.
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
  { district: 'Bengaluru City',    population: 9621551, literacyPct: 88.5, urbanizationPct: 98.0 },
  { district: 'Bengaluru Rural',   population: 990923,  literacyPct: 75.0, urbanizationPct: 20.0 },
  { district: 'Mysuru',            population: 3001127, literacyPct: 72.4, urbanizationPct: 38.0 },
  { district: 'Mangaluru',         population: 2089649, literacyPct: 83.8, urbanizationPct: 42.0 },
  { district: 'Hubballi-Dharwad',  population: 1791936, literacyPct: 74.8, urbanizationPct: 56.0 },
  { district: 'Belagavi',          population: 4779661, literacyPct: 67.1, urbanizationPct: 25.0 },
  { district: 'Kalaburagi',        population: 2564892, literacyPct: 58.9, urbanizationPct: 30.0 },
  { district: 'Shivamogga',        population: 1755396, literacyPct: 76.9, urbanizationPct: 36.0 },
  { district: 'Tumakuru',          population: 2681449, literacyPct: 73.4, urbanizationPct: 25.0 },
  { district: 'Ballari',           population: 2532383, literacyPct: 62.1, urbanizationPct: 38.0 },
];
