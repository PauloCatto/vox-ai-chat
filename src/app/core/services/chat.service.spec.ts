import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  let notifySpy: jasmine.SpyObj<NotificationService>;

  const mockSupabase = {
    getClient: () => ({
      from: () => ({
        insert: () => ({
          select: () => ({
            returns: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        select: () => ({
          eq: () => ({
            returns: () => Promise.resolve({ data: [], error: null }),
            order: () => ({
              returns: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
    ]);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: NotificationService, useValue: spy },
      ],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
    notifySpy = TestBed.inject(
      NotificationService,
    ) as jasmine.SpyObj<NotificationService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Edge Cases & Coverage Boost', () => {
    it('should handle AI returning an empty response (text empty)', async () => {
      const promise = service.getAiResponse([{ role: 'user', content: 'Hi' }]);
      const req = httpMock.expectOne((r) =>
        r.url.includes(environment.chatApiUrl),
      );

      req.flush({ candidates: [{ content: { parts: [{ text: '' }] } }] });

      const result = await promise;
      expect(result).toBeNull();
      expect(notifySpy.error).toHaveBeenCalledWith(
        'AI returned an empty response.',
      );
    });

    it('should notify error when sendMessage fails in Supabase', async () => {
      const client = (service as any).supabase;
      spyOn(client, 'from').and.returnValue({
        insert: () => ({
          select: () => ({
            returns: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Database failure' },
              }),
          }),
        }),
      } as any);

      await service.sendMessage('c1', 'u1', 'user', 'hello');
      expect(notifySpy.error).toHaveBeenCalledWith('Failed to save message.');
    });

    it('should notify error when updateConversationTitle fails', async () => {
      const client = (service as any).supabase;
      spyOn(client, 'from').and.returnValue({
        update: () => ({
          eq: () =>
            Promise.resolve({ data: null, error: { message: 'Update error' } }),
        }),
      } as any);

      await service.updateConversationTitle('c1', 'New Title');
      expect(notifySpy.error).toHaveBeenCalledWith('Failed to update title.');
    });

    it('should map assistant role to model for Gemini API', async () => {
      const history = [{ role: 'assistant', content: 'I am an AI' }];
      const promise = service.getAiResponse(history);

      const req = httpMock.expectOne((r) =>
        r.url.includes(environment.chatApiUrl),
      );
      expect(req.request.body.contents[0].role).toBe('model');

      req.flush({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] });
      await promise;
    });

    it('should return null on generic error in getAiResponse', async () => {
      const promise = service.getAiResponse([{ role: 'user', content: 'Hi' }]);
      const req = httpMock.expectOne((r) =>
        r.url.includes(environment.chatApiUrl),
      );

      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;
      expect(result).toBeNull();
      expect(notifySpy.error).toHaveBeenCalledWith(
        'Failed to connect to AI Service.',
      );
    });
  });
});
