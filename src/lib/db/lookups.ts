import type { CrimeType, District } from '../constants';

/**
 * Static lookup data for the official KSP FIR System schema (see the ER
 * diagram and docs/schema-mapping.md). Everything here is deterministic —
 * no RNG — so seeding it never disturbs the mulberry32 stream.
 *
 * District/unit codes are synthetic but follow the official CrimeNo format
 * (4-digit district + 4-digit unit). Bengaluru City uses 0443 to match the
 * worked example in the official ER document.
 */

export const STATE_KARNATAKA_ID = 1;

export const STATES = [
  { id: STATE_KARNATAKA_ID, name: 'Karnataka' },
  { id: 2, name: 'Maharashtra' },
  { id: 3, name: 'Tamil Nadu' },
] as const;

export const DISTRICT_CODES: Record<District, string> = {
  'Bengaluru City': '0443',
  'Bengaluru Rural': '0444',
  Mysuru: '0412',
  Mangaluru: '0421',
  'Hubballi-Dharwad': '0415',
  Belagavi: '0401',
  Kalaburagi: '0405',
  Shivamogga: '0417',
  Tumakuru: '0418',
  Ballari: '0403',
};

export const UNIT_TYPES = [
  { id: 1, name: 'State Police HQ', cityDistState: 'State', hierarchy: 1 },
  { id: 2, name: 'District Police Office', cityDistState: 'District', hierarchy: 2 },
  { id: 3, name: 'Circle Office', cityDistState: 'City', hierarchy: 3 },
  { id: 4, name: 'Police Station', cityDistState: 'City', hierarchy: 4 },
] as const;

export const RANKS = [
  { id: 1, name: 'Director General of Police', hierarchy: 1 },
  { id: 2, name: 'Additional DGP', hierarchy: 2 },
  { id: 3, name: 'Inspector General of Police', hierarchy: 3 },
  { id: 4, name: 'Deputy Inspector General', hierarchy: 4 },
  { id: 5, name: 'Superintendent of Police', hierarchy: 5 },
  { id: 6, name: 'Additional SP', hierarchy: 6 },
  { id: 7, name: 'Deputy SP', hierarchy: 7 },
  { id: 8, name: 'Police Inspector', hierarchy: 8 },
  { id: 9, name: 'Police Sub-Inspector', hierarchy: 9 },
  { id: 10, name: 'Assistant Sub-Inspector', hierarchy: 10 },
  { id: 11, name: 'Head Constable', hierarchy: 11 },
  { id: 12, name: 'Police Constable', hierarchy: 12 },
] as const;

export const DESIGNATIONS = [
  { id: 1, name: 'Director General of Police', sortOrder: 1 },
  { id: 2, name: 'District Superintendent', sortOrder: 2 },
  { id: 3, name: 'Station House Officer', sortOrder: 3 },
  { id: 4, name: 'Investigating Officer', sortOrder: 4 },
  { id: 5, name: 'Crime Analyst', sortOrder: 5 },
] as const;

/** Official case category codes — first digit of CrimeNo. */
export const CASE_CATEGORIES = [
  { id: 1, value: 'FIR' },
  { id: 3, value: 'UDR' },
  { id: 4, value: 'PAR' },
  { id: 8, value: 'Zero FIR' },
] as const;

export const GRAVITY_OFFENCES = [
  { id: 1, value: 'Heinous' },
  { id: 2, value: 'Non-Heinous' },
] as const;

/** Crime types that register as Heinous per KSP gravity classification. */
export const HEINOUS_CRIME_TYPES: readonly CrimeType[] = [
  'Murder',
  'Drug Trafficking',
  'Extortion',
];

/** Maps our FIR status strings to official CaseStatusMaster ids. */
export const CASE_STATUSES = [
  { id: 1, name: 'Open' },
  { id: 2, name: 'Under Investigation' },
  { id: 3, name: 'Solved' },
] as const;

export const GENDER_IDS: Record<string, number> = {
  Male: 1,
  Female: 2,
  Other: 3,
  Unknown: 0,
};

export const RELIGIONS = [
  { id: 1, name: 'Hindu' },
  { id: 2, name: 'Muslim' },
  { id: 3, name: 'Christian' },
  { id: 4, name: 'Jain' },
  { id: 5, name: 'Sikh' },
  { id: 6, name: 'Buddhist' },
  { id: 7, name: 'Others' },
  { id: 8, name: 'Not Stated' },
] as const;

/** Administrative categories (not community names) — synthetic data stays neutral. */
export const CASTE_CATEGORIES = [
  { id: 1, name: 'General' },
  { id: 2, name: 'OBC' },
  { id: 3, name: 'SC' },
  { id: 4, name: 'ST' },
  { id: 5, name: 'Not Stated' },
] as const;

export const OCCUPATION_MASTER = [
  { id: 1, name: 'Unemployed' },
  { id: 2, name: 'Driver' },
  { id: 3, name: 'Shop Worker' },
  { id: 4, name: 'Mechanic' },
  { id: 5, name: 'Delivery Agent' },
  { id: 6, name: 'Construction Worker' },
  { id: 7, name: 'Software Employee' },
  { id: 8, name: 'Street Vendor' },
  { id: 9, name: 'Electrician' },
  { id: 10, name: 'Student' },
  { id: 11, name: 'Broker' },
  { id: 12, name: 'Security Guard' },
  { id: 13, name: 'Farmer' },
  { id: 14, name: 'Government Employee' },
  { id: 15, name: 'Homemaker' },
  { id: 16, name: 'Teacher' },
  { id: 17, name: 'Business Owner' },
  { id: 18, name: 'Not Stated' },
] as const;

export const CRIME_HEADS = [
  { id: 1, groupName: 'Crimes Against Body' },
  { id: 2, groupName: 'Crimes Against Property' },
  { id: 3, groupName: 'Economic Offences' },
  { id: 4, groupName: 'Cyber Crimes' },
  { id: 5, groupName: 'Narcotic Offences' },
  { id: 6, groupName: 'Organised & Violent Crime' },
] as const;

/** Every seeded crime type maps to one official sub-head under a major head. */
export const CRIME_SUB_HEADS: ReadonlyArray<{
  id: number;
  crimeHeadId: number;
  name: CrimeType;
  seq: number;
}> = [
  { id: 1, crimeHeadId: 1, name: 'Murder', seq: 1 },
  { id: 2, crimeHeadId: 1, name: 'Assault', seq: 2 },
  { id: 3, crimeHeadId: 2, name: 'Theft', seq: 1 },
  { id: 4, crimeHeadId: 2, name: 'Burglary', seq: 2 },
  { id: 5, crimeHeadId: 2, name: 'Chain Snatching', seq: 3 },
  { id: 6, crimeHeadId: 2, name: 'Vehicle Theft', seq: 4 },
  { id: 7, crimeHeadId: 3, name: 'Fraud', seq: 1 },
  { id: 8, crimeHeadId: 4, name: 'Cybercrime', seq: 1 },
  { id: 9, crimeHeadId: 5, name: 'Drug Trafficking', seq: 1 },
  { id: 10, crimeHeadId: 6, name: 'Extortion', seq: 1 },
];

export const ACTS = [
  { code: 'BNS', description: 'Bharatiya Nyaya Sanhita, 2023', shortName: 'BNS' },
  { code: 'ITACT', description: 'Information Technology Act, 2000', shortName: 'IT Act' },
  { code: 'NDPS', description: 'Narcotic Drugs and Psychotropic Substances Act, 1985', shortName: 'NDPS Act' },
  { code: 'ARMS', description: 'Arms Act, 1959', shortName: 'Arms Act' },
] as const;

export interface SectionDef {
  actCode: string;
  sectionCode: string;
  description: string;
}

/**
 * Starter legal corpus (also the RAG-lite knowledge base). Operative wording
 * condensed from India Code (indiacode.nic.in); Track B task B1 replaces and
 * expands this from docs/kb/sections.csv with fully sourced text.
 */
export const SECTIONS: readonly SectionDef[] = [
  { actCode: 'BNS', sectionCode: '101', description: 'Murder — culpable homicide is murder if the act by which the death is caused is done with the intention of causing death, or with the intention of causing such bodily injury as the offender knows to be likely to cause the death of the person.' },
  { actCode: 'BNS', sectionCode: '103', description: 'Punishment for murder — whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.' },
  { actCode: 'BNS', sectionCode: '115', description: 'Voluntarily causing hurt — whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt, and does thereby cause hurt, is said voluntarily to cause hurt; punishable with imprisonment up to one year, or fine up to ten thousand rupees, or both.' },
  { actCode: 'BNS', sectionCode: '117', description: 'Voluntarily causing grievous hurt — whoever voluntarily causes hurt which is grievous (emasculation, permanent privation of sight or hearing, fracture, or hurt endangering life) shall be punished with imprisonment up to seven years and fine.' },
  { actCode: 'BNS', sectionCode: '118', description: 'Voluntarily causing hurt or grievous hurt by dangerous weapons or means — where hurt is caused by an instrument for shooting, stabbing or cutting, or by fire, poison or explosive substance, imprisonment may extend to three years (hurt) or ten years (grievous hurt), with fine.' },
  { actCode: 'BNS', sectionCode: '303', description: 'Theft — whoever, intending to take dishonestly any movable property out of the possession of any person without that person’s consent, moves that property, is said to commit theft; punishable with imprisonment up to three years, or fine, or both.' },
  { actCode: 'BNS', sectionCode: '304', description: 'Snatching — theft is snatching if, in order to commit theft, the offender suddenly or quickly or forcibly seizes or secures or grabs or takes away any movable property from any person; punishable with imprisonment up to three years and fine.' },
  { actCode: 'BNS', sectionCode: '305', description: 'Theft in a dwelling house, means of transportation or place of worship — whoever commits theft in any building, tent or vessel used as a human dwelling, or of any means of transport used for the transport of goods or passengers, shall be punished with imprisonment up to seven years and fine.' },
  { actCode: 'BNS', sectionCode: '308', description: 'Extortion — whoever intentionally puts any person in fear of any injury to that person or any other, and thereby dishonestly induces the person so put in fear to deliver any property or valuable security, commits extortion; punishable with imprisonment up to seven years, or fine, or both.' },
  { actCode: 'BNS', sectionCode: '316', description: 'Criminal breach of trust — whoever, being entrusted with property or with dominion over property, dishonestly misappropriates or converts it to his own use, commits criminal breach of trust; punishable with imprisonment up to five years, or fine, or both.' },
  { actCode: 'BNS', sectionCode: '318', description: 'Cheating — whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property or to consent to the retention of property, cheats; where there is dishonest inducement to deliver property, imprisonment may extend to seven years with fine.' },
  { actCode: 'BNS', sectionCode: '329', description: 'Criminal trespass and house-trespass — whoever enters into property in the possession of another with intent to commit an offence or to intimidate, insult or annoy the person in possession, commits criminal trespass; house-trespass is punishable with imprisonment up to one year, or fine, or both.' },
  { actCode: 'BNS', sectionCode: '331', description: 'House-breaking — punishment for house-breaking: imprisonment up to two years and fine; if house-breaking is committed after sunset and before sunrise (night house-breaking, typical burglary), imprisonment may extend to fourteen years.' },
  { actCode: 'BNS', sectionCode: '111', description: 'Organised crime — any continuing unlawful activity including kidnapping, extortion, land grabbing, contract killing, economic offence, cyber-crimes, trafficking, committed by any person as a member of an organised crime syndicate; punishable with imprisonment of not less than five years extending to life, and fine.' },
  { actCode: 'ITACT', sectionCode: '66', description: 'Computer-related offences — if any person dishonestly or fraudulently does any act referred to in section 43 (unauthorised access, data theft, virus introduction, damage), punishable with imprisonment up to three years or fine up to five lakh rupees or both.' },
  { actCode: 'ITACT', sectionCode: '66C', description: 'Identity theft — whoever, fraudulently or dishonestly makes use of the electronic signature, password or any other unique identification feature of any other person, shall be punished with imprisonment up to three years and fine up to one lakh rupees.' },
  { actCode: 'ITACT', sectionCode: '66D', description: 'Cheating by personation by using computer resource — whoever, by means of any communication device or computer resource cheats by personation (fake profiles, OTP fraud, phishing impersonation), shall be punished with imprisonment up to three years and fine up to one lakh rupees.' },
  { actCode: 'NDPS', sectionCode: '8', description: 'Prohibition of certain operations — no person shall produce, manufacture, possess, sell, purchase, transport, warehouse, use, consume, import or export any narcotic drug or psychotropic substance, except for medical or scientific purposes as provided by the Act.' },
  { actCode: 'NDPS', sectionCode: '20', description: 'Punishment for contravention in relation to cannabis — for possession, sale, transport of cannabis: small quantity up to one year; more than small but less than commercial quantity up to ten years; commercial quantity ten to twenty years rigorous imprisonment with fine.' },
  { actCode: 'NDPS', sectionCode: '21', description: 'Punishment for contravention in relation to manufactured drugs and preparations — graded by quantity: small quantity imprisonment up to one year; intermediate up to ten years; commercial quantity ten to twenty years rigorous imprisonment and fine of one to two lakh rupees.' },
  { actCode: 'NDPS', sectionCode: '29', description: 'Punishment for abetment and criminal conspiracy — whoever abets, or is a party to a criminal conspiracy to commit, an offence under this Chapter is punishable with the punishment provided for the offence, whether or not the offence is committed in consequence.' },
  { actCode: 'ARMS', sectionCode: '25', description: 'Punishment for illegal manufacture, sale, possession of arms — whoever manufactures, sells, transfers, or has in his possession any arms or ammunition in contravention of the Act shall be punishable with imprisonment of not less than seven years which may extend to life, and fine.' },
];

/**
 * Procedural SOP passages for the knowledge base (Module A6) — condensed
 * from BNSS 2023 and standing-order practice; Track B task B1 expands and
 * sources these alongside the section texts.
 */
export const SOP_SNIPPETS: ReadonlyArray<{ title: string; content: string }> = [
  { title: 'SOP — FIR registration', content: 'On receipt of information about a cognizable offence, the officer in charge shall register an FIR under BNSS Section 173 without preliminary verification for cognizable offences; a copy of the FIR shall be given to the informant free of cost, and refusal to register may be escalated to the Superintendent of Police.' },
  { title: 'SOP — Zero FIR', content: 'When information about a cognizable offence is received at a police station outside whose jurisdiction the offence occurred, a Zero FIR shall be registered and transferred to the jurisdictional police station; jurisdiction is never a ground to refuse registration.' },
  { title: 'SOP — Arrest procedure', content: 'Arrest must follow BNSS Chapter V: the officer shall inform the arrested person of grounds of arrest, prepare an arrest memo attested by a witness, notify a nominated relative, and produce the person before the magistrate within 24 hours excluding journey time.' },
  { title: 'SOP — Chargesheet timeline', content: 'The final report (chargesheet) under BNSS Section 193 shall be filed within 60 days of arrest for offences punishable up to 10 years and within 90 days for graver offences; failure entitles the accused to default bail.' },
  { title: 'SOP — Cybercrime first response', content: 'For cybercrime complaints: preserve digital evidence first — do not switch off the device; record hash values before imaging; direct the complainant to the National Cybercrime Reporting Portal (1930 helpline for financial fraud) and freeze mule accounts through the nodal officer within the golden hour.' },
  { title: 'SOP — NDPS seizure', content: 'Narcotics seizures must comply with NDPS Section 52A: inventory the contraband before a magistrate, draw representative samples in duplicate, and dispatch samples to the forensic laboratory within 72 hours; non-compliance jeopardises the prosecution.' },
  { title: 'SOP — Evidence chain of custody', content: 'Every physical or digital exhibit shall carry a chain-of-custody record: seizure memo with two witnesses, unique exhibit number, sealed packaging with signature of the seizing officer, and movement log entries for every transfer until court production.' },
  { title: 'SOP — Victim compensation', content: 'Victims of violent crime may be referred to the Karnataka Victim Compensation Scheme; the investigating officer shall inform eligible victims in writing and forward the recommendation through the District Legal Services Authority.' },
];

/** Sub-head → applicable act/sections; drives ActSectionAssociation seeding. */
export const CRIME_HEAD_ACT_SECTIONS: ReadonlyArray<{
  crimeSubHead: CrimeType;
  actCode: string;
  sectionCodes: string[];
}> = [
  { crimeSubHead: 'Murder', actCode: 'BNS', sectionCodes: ['101', '103'] },
  { crimeSubHead: 'Assault', actCode: 'BNS', sectionCodes: ['115', '117', '118'] },
  { crimeSubHead: 'Theft', actCode: 'BNS', sectionCodes: ['303', '305'] },
  { crimeSubHead: 'Burglary', actCode: 'BNS', sectionCodes: ['329', '331', '303'] },
  { crimeSubHead: 'Chain Snatching', actCode: 'BNS', sectionCodes: ['304', '303'] },
  { crimeSubHead: 'Vehicle Theft', actCode: 'BNS', sectionCodes: ['303', '305'] },
  { crimeSubHead: 'Fraud', actCode: 'BNS', sectionCodes: ['318', '316'] },
  { crimeSubHead: 'Cybercrime', actCode: 'ITACT', sectionCodes: ['66', '66C', '66D'] },
  { crimeSubHead: 'Drug Trafficking', actCode: 'NDPS', sectionCodes: ['8', '20', '21', '29'] },
  { crimeSubHead: 'Extortion', actCode: 'BNS', sectionCodes: ['308', '111'] },
];
