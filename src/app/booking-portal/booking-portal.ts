import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatToolbarModule } from '@angular/material/toolbar';
import { EMPTY, Subject } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';

import { Passenger, ServiceId, ServiceOption, ValueAddedService } from '../models/booking';
import { BookingService } from '../services/booking';

@Component({
  selector: 'app-booking-portal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatRadioModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  templateUrl: './booking-portal.html',
  styleUrl: './booking-portal.css',
})
export class BookingPortal {
  private readonly fb = inject(FormBuilder);
  private readonly booking = inject(BookingService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stepper = viewChild.required(MatStepper);
  private readonly lookupTrigger = new Subject<void>();

  readonly services: ValueAddedService[] = this.booking.getServices();
  readonly passenger$ = this.booking.passenger$;
  readonly selections$ = this.booking.selections$;
  readonly total$ = this.booking.total$;

  readonly loading = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly passenger = signal<Passenger | null>(null);

  readonly lookupForm: FormGroup = this.fb.group({
    bookingReference: ['', [Validators.required, Validators.minLength(5)]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    // Reactive lookup pipeline: each submit switches to a fresh reservation lookup,
    // cancelling any in-flight request (switchMap) and surfacing errors inline.
    this.lookupTrigger
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.lookupError.set(null);
        }),
        switchMap(() =>
          this.booking.lookup(this.lookupForm.getRawValue()).pipe(
            catchError((err: Error) => {
              this.lookupError.set(err.message);
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((passenger) => {
        this.booking.setPassenger(passenger);
        this.passenger.set(passenger);
        queueMicrotask(() => this.stepper().next());
      });
  }

  findBooking(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }
    this.lookupTrigger.next();
  }

  choose(serviceId: ServiceId, optionId: string | null): void {
    this.booking.select(serviceId, optionId);
  }

  selectionFor(serviceId: ServiceId): string | null | undefined {
    return this.booking.getSelection(serviceId);
  }

  optionLabel(service: ValueAddedService, optionId: string | null | undefined): string {
    if (!optionId) {
      return 'Skipped';
    }
    return service.options.find((option) => option.id === optionId)?.label ?? 'Skipped';
  }

  trackOption(_index: number, option: ServiceOption): string {
    return option.id;
  }

  startOver(): void {
    this.booking.reset();
    this.passenger.set(null);
    this.lookupError.set(null);
    this.lookupForm.reset({ bookingReference: '', lastName: '', email: '' });
    this.stepper().reset();
  }
}
