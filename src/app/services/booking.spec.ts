import { fakeAsync, tick } from '@angular/core/testing';
import { BookingService } from './booking';
import { Passenger } from '../models/booking';

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(() => {
    service = new BookingService();
  });

  it('should expose the full service catalog', () => {
    const services = service.getServices();
    expect(services.map((s) => s.id)).toEqual(['seat', 'meal', 'wheelchair', 'baggage']);
  });

  it('should resolve a known booking reference to the seeded itinerary', fakeAsync(() => {
    let result: Passenger | undefined;
    service
      .lookup({ bookingReference: 'abc123', lastName: 'Smith', email: 'a@b.com' })
      .subscribe((pax) => (result = pax));

    tick(600);

    expect(result).toBeTruthy();
    expect(result!.pnr).toBe('ABC123');
    expect(result!.lastName).toBe('Smith');
    expect(result!.flightNumber).toBe('VA204');
    expect(result!.from).toBe('DEL');
  }));

  it('should fall back to a demo passenger for unknown references', fakeAsync(() => {
    let result: Passenger | undefined;
    service
      .lookup({ bookingReference: 'ZZZ999', lastName: 'Doe', email: 'd@e.com' })
      .subscribe((pax) => (result = pax));

    tick(600);

    expect(result!.pnr).toBe('ZZZ999');
    expect(result!.firstName).toBe('Guest');
  }));

  it('should error when the reference is too short', fakeAsync(() => {
    let error: Error | undefined;
    service
      .lookup({ bookingReference: 'AB', lastName: 'Doe', email: 'd@e.com' })
      .subscribe({ error: (err: Error) => (error = err) });

    tick(600);

    expect(error).toBeTruthy();
    expect(error!.message).toContain('at least 5 characters');
  }));

  it('should record selections and expose them via selections$', () => {
    let selections: Record<string, string | null | undefined> = {};
    service.selections$.subscribe((value) => (selections = value));

    service.select('seat', 'window');
    service.select('baggage', '20kg');

    expect(selections['seat']).toBe('window');
    expect(selections['baggage']).toBe('20kg');
    expect(service.getSelection('seat')).toBe('window');
  });

  it('should compute the running total reactively from paid selections', () => {
    let total = -1;
    service.total$.subscribe((value) => (total = value));

    expect(total).toBe(0);

    service.select('seat', 'extra-legroom'); // 28
    expect(total).toBe(28);

    service.select('baggage', '20kg'); // +45
    expect(total).toBe(73);

    service.select('meal', 'none'); // free
    expect(total).toBe(73);
  });

  it('should reset passenger and selections', () => {
    const passenger: Passenger = {
      pnr: 'ABC123',
      lastName: 'Smith',
      email: 'a@b.com',
      firstName: 'Alex',
      flightNumber: 'VA204',
      from: 'DEL',
      to: 'LHR',
      departure: '2026-08-14T09:30:00',
    };
    let current: Passenger | null = null;
    service.passenger$.subscribe((value) => (current = value));

    service.setPassenger(passenger);
    service.select('seat', 'window');
    expect(current!).toEqual(passenger);

    service.reset();
    expect(current).toBeNull();
    expect(service.getSelection('seat')).toBeUndefined();
  });
});
