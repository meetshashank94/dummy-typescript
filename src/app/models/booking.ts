export interface Passenger {
  pnr: string;
  lastName: string;
  email: string;
  firstName: string;
  flightNumber: string;
  from: string;
  to: string;
  departure: string;
}

export type ServiceId = 'seat' | 'meal' | 'wheelchair' | 'baggage';

export interface ServiceOption {
  id: string;
  label: string;
  description: string;
  price: number;
}

export interface ValueAddedService {
  id: ServiceId;
  title: string;
  icon: string;
  summary: string;
  /** When true the passenger picks a single option, otherwise it is a yes/no add-on. */
  optional: boolean;
  options: ServiceOption[];
}

/** Map of serviceId -> selected optionId (or null when skipped). */
export type Selections = Partial<Record<ServiceId, string | null>>;

export interface BookingLookup {
  bookingReference: string;
  lastName: string;
  email: string;
}
