import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  const supabaseSpy = {
    from: jasmine.createSpy('from').and.returnValue({
      insert: jasmine.createSpy('insert').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          returns: jasmine
            .createSpy('returns')
            .and.resolveTo({ data: [], error: null }),
        }),
      }),
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          returns: jasmine
            .createSpy('returns')
            .and.resolveTo({ data: [], error: null }),
          order: jasmine.createSpy('order').and.returnValue({
            returns: jasmine
              .createSpy('returns')
              .and.resolveTo({ data: [], error: null }),
          }),
        }),
      }),
      update: jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.resolveTo({ data: null, error: null }),
      }),
    }),
  };

  const supabaseServiceMock = {
    getClient: () => supabaseSpy,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAiResponse', () => {
    it('should call Gemini API and return text', async () => {
      const mockHistory = [{ role: 'user', content: 'Olá' }];
      const mockResponse = {
        candidates: [
          {
            content: { parts: [{ text: 'Olá, como posso ajudar?' }] },
          },
        ],
      };

      const responsePromise = service.getAiResponse(mockHistory);
      const req = httpMock.expectOne((request) =>
        request.url.startsWith(environment.chatApiUrl),
      );

      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      const result = await responsePromise;
      expect(result).toBe('Olá, como posso ajudar?');
    });

    it('should throw error if Gemini response is empty', async () => {
      const mockHistory = [{ role: 'user', content: 'Olá' }];
      const mockEmptyResponse = { candidates: [] };

      const responsePromise = service.getAiResponse(mockHistory);

      const req = httpMock.expectOne((request) =>
        request.url.startsWith(environment.chatApiUrl),
      );

      req.flush(mockEmptyResponse);

      await expectAsync(responsePromise).toBeRejectedWithError(
        'AI response was blocked or empty.',
      );
    });
  });

  describe('Supabase Methods', () => {
    it('should call supabase.insert when createConversation is called', () => {
      service.createConversation('user123', 'Nova Conversa');
      expect(supabaseSpy.from).toHaveBeenCalledWith('conversations');
    });

    it('should call supabase.select when getConversations is called', () => {
      service.getConversations('user123');
      expect(supabaseSpy.from).toHaveBeenCalledWith('conversations');
    });

    it('should call supabase.insert when sendMessage is called', () => {
      service.sendMessage('conv1', 'user1', 'user', 'Mensagem teste');
      expect(supabaseSpy.from).toHaveBeenCalledWith('messages');
    });
  });
});
