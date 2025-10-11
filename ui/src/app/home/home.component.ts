import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToAboutUs() {
    this.router.navigate(['/about-us']);
  }

  navigateToGetStarted() {
    // Navigate to dashboard after Auth0 authentication
    this.router.navigate(['/dashboard']);
  }
}
