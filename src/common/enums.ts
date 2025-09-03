// this is the existing enum for Patient Status

export enum PatientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCHARGED = 'discharged',
}

// this new enum for Visit Type
export enum VisitType {
  HOME = 'home',
  CLINIC = 'clinic',
}

// this new enum for Payment Status (for filtering)
export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partiallyPaid',
  FULLY_PAID = 'fullyPaid',
}