import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
})
export class LoadingComponent {
  @Input() text = 'Loading...';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullscreen = false;
}
