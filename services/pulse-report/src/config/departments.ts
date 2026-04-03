export interface DepartmentConfig {
  departmentId: string;
  name: string;
  contactEmail: string;
  slaHours: { critical: number; high: number; medium: number; low: number };
}

export const DEPARTMENT_ROUTING: Record<string, DepartmentConfig> = {
  water: {
    departmentId: 'PHD',
    name: 'Public Health & Water Dept',
    contactEmail: 'phd@jabalpur.gov.in',
    slaHours: { critical: 4, high: 12, medium: 48, low: 120 },
  },
  roads: {
    departmentId: 'PWD',
    name: 'Public Works Department',
    contactEmail: 'pwd@jabalpur.gov.in',
    slaHours: { critical: 8, high: 24, medium: 72, low: 168 },
  },
  electricity: {
    departmentId: 'MPEB',
    name: 'MP Electricity Board',
    contactEmail: 'mpeb@jabalpur.gov.in',
    slaHours: { critical: 2, high: 8, medium: 24, low: 72 },
  },
  sanitation: {
    departmentId: 'ULB',
    name: 'Urban Local Body',
    contactEmail: 'ulb@jabalpur.gov.in',
    slaHours: { critical: 4, high: 12, medium: 48, low: 120 },
  },
  'public-safety': {
    departmentId: 'POLICE',
    name: 'Jabalpur Police',
    contactEmail: 'police@jabalpur.gov.in',
    slaHours: { critical: 1, high: 4, medium: 12, low: 48 },
  },
  health: {
    departmentId: 'CMHO',
    name: 'Chief Medical & Health Officer',
    contactEmail: 'cmho@jabalpur.gov.in',
    slaHours: { critical: 2, high: 8, medium: 24, low: 72 },
  },
  education: {
    departmentId: 'DEO',
    name: 'District Education Office',
    contactEmail: 'deo@jabalpur.gov.in',
    slaHours: { critical: 8, high: 24, medium: 72, low: 168 },
  },
  environment: {
    departmentId: 'PCB',
    name: 'Pollution Control Board',
    contactEmail: 'pcb@jabalpur.gov.in',
    slaHours: { critical: 4, high: 12, medium: 48, low: 120 },
  },
  corruption: {
    departmentId: 'ACB',
    name: 'Anti-Corruption Bureau',
    contactEmail: 'acb@jabalpur.gov.in',
    slaHours: { critical: 2, high: 6, medium: 24, low: 72 },
  },
  other: {
    departmentId: 'CMSC',
    name: 'CM Service Centre',
    contactEmail: 'cmsc@jabalpur.gov.in',
    slaHours: { critical: 4, high: 24, medium: 72, low: 168 },
  },
};

export const GRIEVANCE_CATEGORIES = Object.keys(DEPARTMENT_ROUTING);
