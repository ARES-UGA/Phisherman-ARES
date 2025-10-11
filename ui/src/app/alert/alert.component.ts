import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-alert",
  standalone: true,
  templateUrl: "./alert.component.html",
  styleUrl: "./alert.component.css",
})
export class AlertComponent {
  constructor(private router: Router) {}

  scanAgain() {
    this.router.navigate(["/scanning"]);
  }

  returnToHomepage() {
    this.router.navigate(["/"]);
  }
}
