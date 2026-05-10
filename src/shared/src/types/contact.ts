/**
 * Contact Types
 */

export type FieldKey =
  | 'full_name'
  | 'work_email'
  | 'personal_email'
  | 'work_phone'
  | 'cell_phone'
  | 'home_phone'
  | 'work_address'
  | 'work_address_street'
  | 'work_address_city'
  | 'work_address_state'
  | 'work_address_postal_code'
  | 'work_address_country'
  | 'home_address'
  | 'home_address_street'
  | 'home_address_city'
  | 'home_address_state'
  | 'home_address_postal_code'
  | 'home_address_country'
  | 'company'
  | 'job_title'
  | 'website'
  | 'birthday'
  | 'notes'
  | 'photo';

export interface Contact {
  fullName: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  personalEmail?: string;
  workPhone?: string;
  cellPhone?: string;
  homePhone?: string;
  workAddress?: string;
  workAddressStreet?: string;
  workAddressCity?: string;
  workAddressState?: string;
  workAddressPostalCode?: string;
  workAddressCountry?: string;
  homeAddress?: string;
  homeAddressStreet?: string;
  homeAddressCity?: string;
  homeAddressState?: string;
  homeAddressPostalCode?: string;
  homeAddressCountry?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  birthday?: string;
  notes?: string;
  photoBase64?: string;
}

