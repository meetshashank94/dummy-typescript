import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BookingPortal } from './booking-portal';
import { BookingService } from '../services/booking';

describe('BookingPortal', () => {
  let fixture: ComponentFixture<BookingPortal>;
  let component: BookingPortal;
  let booking: BookingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingPortal],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPortal);
    component = fixture.componentInstance;
    booking = TestBed.inject(BookingService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an invalid lookup form', () => {
    expect(component.lookupForm.valid).toBeFalse();
  });

  it('should validate the lookup form fields', () => {
    const form = component.lookupForm;
    form.setValue({ bookingReference: 'AB', lastName: '', email: 'not-an-email' });
    expect(form.controls['bookingReference'].hasError('minlength')).toBeTrue();
    expect(form.controls['lastName'].hasError('required')).toBeTrue();
    expect(form.controls['email'].hasError('email')).toBeTrue();

    form.setValue({ bookingReference: 'ABC123', lastName: 'Smith', email: 'a@b.com' });
    expect(form.valid).toBeTrue();
  });

  it('should not trigger a lookup when the form is invalid', fakeAsync(() => {
    const spy = spyOn(booking, 'lookup').and.callThrough();
    component.findBooking();
    tick(600);
    expect(spy).not.toHaveBeenCalled();
    expect(component.passenger()).toBeNull();
  }));

  it('should resolve a passenger on a valid lookup', fakeAsync(() => {
    component.lookupForm.setValue({
      bookingReference: 'ABC123',
      lastName: 'Smith',
      email: 'a@b.com',
    });

    component.findBooking();
    expect(component.loading()).toBeTrue();

    tick(600);
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(component.passenger()?.pnr).toBe('ABC123');
    expect(component.lookupError()).toBeNull();
  }));

  it('should record a chosen option through the service', () => {
    component.choose('seat', 'window');
    expect(booking.getSelection('seat')).toBe('window');
    expect(component.selectionFor('seat')).toBe('window');
  });

  it('should resolve option labels and fall back to "Skipped"', () => {
    const seat = booking.getService('seat')!;
    expect(component.optionLabel(seat, 'window')).toBe('Window seat');
    expect(component.optionLabel(seat, null)).toBe('Skipped');
  });

  it('should clear state on startOver', fakeAsync(() => {
    component.lookupForm.setValue({
      bookingReference: 'ABC123',
      lastName: 'Smith',
      email: 'a@b.com',
    });
    component.findBooking();
    tick(600);
    fixture.detectChanges();
    component.choose('seat', 'window');

    component.startOver();
    fixture.detectChanges();

    expect(component.passenger()).toBeNull();
    expect(booking.getSelection('seat')).toBeUndefined();
    expect(component.lookupForm.pristine).toBeTrue();
  }));
});
