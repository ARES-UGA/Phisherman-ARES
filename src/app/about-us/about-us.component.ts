import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.css'
})
export class AboutUsComponent {
  constructor(private router: Router) {}

  navigateBack() {
    this.router.navigate(['/']);
  }
}
