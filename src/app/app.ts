import { Component } from '@angular/core';
import { BookingPortal } from './booking-portal/booking-portal';

@Component({
  selector: 'app-root',
  imports: [BookingPortal],
  template: '<app-booking-portal />',
})
export class App {}
