import { NgModule } from "@angular/core";
import { ComputerModeComponent } from "../modules/computer-mode/computer-mode.component";
import { RouterModule, Routes } from "@angular/router";

export const routes: Routes = [
    { path: "against-computer", component: ComputerModeComponent, title: "Play against computer" }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }