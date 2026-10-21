import type { Seed } from '@/lib/outreach';

// The untouched firms from the vault list 10-Outbound/lists/us-interior-design-wave1.md (built 2026-10-05 from
// Google Maps: public business data). Firms already emailed, dropped or in the 2026-10-06 pack are left out.
// Imported as 'new' prospects from Outreach → Prospects; the routine then checks each against the profile.
export const WAVE1: Seed[] = [
  { firm: 'Maya’s Design Studio', website: 'https://mayasdesignstudio.com/', instagram: 'mayasdesignstudio', email: 'maya@mayasdesignstudio.com', city: 'Austin', state: 'TX', rating: 5, reviews: 35 },
  { firm: 'LuPrado Interior Design & Remodeling', website: 'http://www.lupradodesign.com/', instagram: 'luprado.home', email: 'luciana@lupradodesign.com', city: 'Austin', state: 'TX', rating: 5, reviews: 17 },
  { firm: 'Etch Design Group', website: 'https://www.etchinteriordesign.com/', instagram: 'etchdesigngroup', city: 'Austin', state: 'TX', rating: 5, reviews: 45 },
  { firm: 'Reclamation Design Studio', website: 'https://reclamationatx.com/', instagram: 'reclamationdesignstudio', city: 'Austin', state: 'TX', rating: 5, reviews: 35 },
  { firm: 'Living Oak Interior Design', website: 'https://livingoak.com/', instagram: 'livingoakinteriordesign', city: 'Austin', state: 'TX', rating: 5, reviews: 18 },
  { firm: 'Sara Ray Interior Design', website: 'http://sararayinteriordesign.com/', instagram: 'sararay_interiordesign', city: 'Nashville', state: 'TN', rating: 5, reviews: 18 },
  { firm: 'Ellerslie Interiors', website: 'https://www.ellerslieinteriors.com/', instagram: 'ellerslieinteriors', city: 'Nashville', state: 'TN', rating: 4.8, reviews: 19 },
  { firm: 'Woodland House Design', website: 'http://woodlandhousedesign.com/', instagram: 'woodlandhousedesign', email: 'info@woodlandhousedesign.com', city: 'Nashville', state: 'TN', rating: 5, reviews: 6 },
  { firm: 'CG Studio Interiors', website: 'http://www.cgstudiointeriors.com/', instagram: 'cgstudiointeriors', email: 'info@cgstudiointeriors.com', city: 'Nashville', state: 'TN', rating: 5, reviews: 4 },
  { firm: 'Aisthesis Studio', website: 'http://www.aisthesisstudio.com/', instagram: 'aisthesis_studio_', email: 'hello@aisthesisstudio.com', city: 'Nashville', state: 'TN', note: 'LinkedIn: lydiaunderwood' },
  { firm: 'Living with Lolo', website: 'https://livingwithlolo.com/', instagram: 'livingwithloloaz', email: 'info@livingwithlolo.com', city: 'Scottsdale', state: 'AZ', rating: 5, reviews: 89, note: 'Biggest on the list: check team size (3 to 20)' },
  { firm: 'CeTerra Accents & Interiors', website: 'http://ceterrainteriordesign.com/', instagram: 'ceterra_accents_and_interiors', email: 'showroom@ceterrainteriordesign.com', city: 'Scottsdale', state: 'AZ', rating: 5, reviews: 74, note: 'Has a showroom: check it is full-service design, not retail' },
  { firm: 'Katherine Mueller Design', website: 'https://www.katherinemuellerdesign.com/', instagram: 'katherinemuellerdesign', email: 'studio@katherinemuellerdesign.com', city: 'Scottsdale', state: 'AZ', rating: 4.5, reviews: 14 },
  { firm: 'Vicki Bergelt Interior Design', website: 'http://www.scottsdaledesigner.com/', instagram: 'vbid', email: 'vicki@scottsdaledesigner.com', city: 'Scottsdale', state: 'AZ', rating: 5, reviews: 17 },
  { firm: 'Janet Brooks Design', website: 'http://janetbrooksdesign.com/', instagram: 'janetbrooksdesign', city: 'Scottsdale', state: 'AZ', rating: 4.8, reviews: 19 },
  { firm: 'Jaque Bethke Design', website: 'https://jaque.design/', instagram: 'jaquebethkedesign', city: 'Scottsdale', state: 'AZ', rating: 4.9, reviews: 15 },
  { firm: 'Friedman & Shields', website: 'http://www.friedmanandshields.com/', instagram: 'friedmanandshields', city: 'Scottsdale', state: 'AZ', rating: 4.7, reviews: 14, note: 'LinkedIn: friedmanandshieldsdesign' },
  { firm: 'Dettaglio Interior Design', website: 'http://dettagliodesign.com/', instagram: 'dettagliodesign', email: 'jeni@dettagliodesign.com', city: 'Scottsdale', state: 'AZ', rating: 5, reviews: 9 },
];
