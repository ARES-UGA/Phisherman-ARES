import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-safe",
  standalone: true,
  templateUrl: "./safe.component.html",
  styleUrl: "./safe.component.css",
})
export class SafeComponent {
  constructor(private router: Router) {}

  scanAgain() {
    this.router.navigate(["/scanning"]);
  }

  returnToHomepage() {
    this.router.navigate(["/"]);
  }
}
