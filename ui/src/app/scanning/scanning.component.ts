import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-scanning",
  standalone: true,
  templateUrl: "./scanning.component.html",
  styleUrl: "./scanning.component.css",
})
export class ScanningComponent {
  constructor(private router: Router) {}

  scanAgain() {
    // Restart scanning process
    console.log("Scanning again...");
    // Could implement actual scanning logic here
  }

  returnToHomepage() {
    this.router.navigate(["/"]);
  }

  // Methods to navigate to results (for backend integration)
  navigateToAlert() {
    this.router.navigate(["/alert"]);
  }

  navigateToSafe() {
    this.router.navigate(["/safe"]);
  }

  // Simulate scan results for testing (remove in production)
  simulateMaliciousResult() {
    this.navigateToAlert();
  }

  simulateSafeResult() {
    this.navigateToSafe();
  }
}
