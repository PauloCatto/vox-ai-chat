import { Injectable, inject } from '@angular/core';
import { HotToastService } from '@ngneat/hot-toast';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toast = inject(HotToastService);
  private readonly commonOptions = {
    position: 'top-center' as const,
    dismissible: true,
  style: {
    width: 'auto',
    minWidth: '380px',
    maxWidth: '600px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
  },
};

success(message: string) {
  this.toast.success(message, {
    ...this.commonOptions,
    duration: 4000,
    style: { ...this.commonOptions.style, background: '#10b981' },
    closeStyle: { color: '#fff' }
  });
}

error(message: string) {
  this.toast.error(message, {
    ...this.commonOptions,
    duration: 6000,
    style: { ...this.commonOptions.style, background: '#ef4444' },
    closeStyle: { color: '#fff' }
  });
}
}
