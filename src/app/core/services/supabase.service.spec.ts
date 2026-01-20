import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseService],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize the Supabase client with environment variables', () => {
    const client = service.getClient();
    expect(client).toBeDefined();
    expect((client as any).supabaseUrl).toBe(environment.supabaseUrl);
  });

  it('should return the same client instance when getClient is called', () => {
    const client1 = service.getClient();
    const client2 = service.getClient();
    expect(client1).toBe(client2);
  });
});
