import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  BookingLookup,
  Passenger,
  Selections,
  ServiceId,
  ValueAddedService,
} from '../models/booking';

/** Static catalog of value added services offered during the guided flow. */
const CATALOG: ValueAddedService[] = [
  {
    id: 'seat',
    title: 'Seat selection',
    icon: 'airline_seat_recline_normal',
    summary: 'Choose where you sit on board.',
    optional: true,
    options: [
      { id: 'window', label: 'Window seat', description: 'Great views, lean-to rest.', price: 12 },
      { id: 'aisle', label: 'Aisle seat', description: 'Easy access to the cabin.', price: 12 },
      {
        id: 'extra-legroom',
        label: 'Extra legroom',
        description: 'Front-row / exit-row space.',
        price: 28,
      },
      {
        id: 'standard',
        label: 'Standard (auto-assign)',
        description: 'We pick a free seat for you.',
        price: 0,
      },
    ],
  },
  {
    id: 'meal',
    title: 'In-flight meal',
    icon: 'restaurant',
    summary: 'Pre-order a meal for your journey.',
    optional: true,
    options: [
      { id: 'veg', label: 'Vegetarian', description: 'Seasonal vegetarian plate.', price: 9 },
      { id: 'non-veg', label: 'Non-vegetarian', description: 'Chicken or fish main.', price: 11 },
      { id: 'vegan', label: 'Vegan', description: 'Plant-based menu.', price: 10 },
      { id: 'none', label: 'No meal', description: 'Skip catering for this leg.', price: 0 },
    ],
  },
  {
    id: 'wheelchair',
    title: 'Wheelchair support',
    icon: 'accessible',
    summary: 'Request mobility assistance at the airport.',
    optional: false,
    options: [
      {
        id: 'to-gate',
        label: 'Assistance to the gate',
        description: 'Help from check-in to boarding.',
        price: 0,
      },
      {
        id: 'to-seat',
        label: 'Assistance to the seat',
        description: 'Onward help all the way to your seat.',
        price: 0,
      },
    ],
  },
  {
    id: 'baggage',
    title: 'Extra baggage',
    icon: 'luggage',
    summary: 'Add checked baggage allowance.',
    optional: true,
    options: [
      { id: '10kg', label: '+10 kg', description: 'One extra checked bag.', price: 25 },
      { id: '20kg', label: '+20 kg', description: 'Two extra checked bags.', price: 45 },
      { id: '32kg', label: '+32 kg', description: 'Maximum extra allowance.', price: 65 },
      { id: 'none', label: 'No extra baggage', description: 'Cabin bag only.', price: 0 },
    ],
  },
];

/** In-memory "reservation system". Any booking reference resolves to a demo passenger. */
const KNOWN_BOOKINGS: Record<string, Omit<Passenger, 'pnr' | 'lastName' | 'email'>> = {
  ABC123: {
    firstName: 'Alex',
    flightNumber: 'VA204',
    from: 'DEL',
    to: 'LHR',
    departure: '2026-08-14T09:30:00',
  },
};

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly passengerSubject = new BehaviorSubject<Passenger | null>(null);
  private readonly selectionsSubject = new BehaviorSubject<Selections>({});

  readonly passenger$: Observable<Passenger | null> = this.passengerSubject.asObservable();
  readonly selections$: Observable<Selections> = this.selectionsSubject.asObservable();

  /** Total price of the currently selected add-ons, derived reactively from selections. */
  readonly total$: Observable<number> = this.selections$.pipe(
    map((selections) => this.computeTotal(selections)),
  );

  getServices(): ValueAddedService[] {
    return CATALOG;
  }

  getService(id: ServiceId): ValueAddedService | undefined {
    return CATALOG.find((service) => service.id === id);
  }

  /**
   * Simulates an async lookup against the reservation system.
   * Emits the resolved passenger or errors when the booking cannot be found.
   */
  lookup(form: BookingLookup): Observable<Passenger> {
    const reference = form.bookingReference.trim().toUpperCase();
    const record = KNOWN_BOOKINGS[reference] ?? {
      firstName: 'Guest',
      flightNumber: 'VA100',
      from: 'BLR',
      to: 'SIN',
      departure: '2026-09-02T18:45:00',
    };

    if (reference.length < 5) {
      return throwError(() => new Error('Booking reference must be at least 5 characters.')).pipe(
        delay(600),
      );
    }

    const passenger: Passenger = {
      pnr: reference,
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      ...record,
    };

    return of(passenger).pipe(delay(600));
  }

  setPassenger(passenger: Passenger): void {
    this.passengerSubject.next(passenger);
    this.selectionsSubject.next({});
  }

  select(serviceId: ServiceId, optionId: string | null): void {
    this.selectionsSubject.next({
      ...this.selectionsSubject.value,
      [serviceId]: optionId,
    });
  }

  getSelection(serviceId: ServiceId): string | null | undefined {
    return this.selectionsSubject.value[serviceId];
  }

  reset(): void {
    this.passengerSubject.next(null);
    this.selectionsSubject.next({});
  }

  private computeTotal(selections: Selections): number {
    return CATALOG.reduce((total, service) => {
      const optionId = selections[service.id];
      if (!optionId) {
        return total;
      }
      const option = service.options.find((candidate) => candidate.id === optionId);
      return total + (option?.price ?? 0);
    }, 0);
  }
}
