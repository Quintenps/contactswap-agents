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
  | 'home_address'
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
  homeAddress?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  birthday?: string;
  notes?: string;
  photoBase64?: string;
}

