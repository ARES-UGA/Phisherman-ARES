import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { AboutUsComponent } from "./about-us/about-us.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { ScanningComponent } from "./scanning/scanning.component";
import { AlertComponent } from "./alert/alert.component";
import { SafeComponent } from "./safe/safe.component";

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "about-us", component: AboutUsComponent },
  { path: "dashboard", component: DashboardComponent },
  { path: "scanning", component: ScanningComponent },
  { path: "alert", component: AlertComponent },
  { path: "safe", component: SafeComponent },
  { path: "**", redirectTo: "" },
];
