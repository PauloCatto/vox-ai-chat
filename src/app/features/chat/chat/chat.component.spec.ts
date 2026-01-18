import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ChatComponent } from './chat.component';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { SupabaseService } from '../../../core/services/supabase.service';

class MockAuthService {
  getUser() {
    return Promise.resolve({
      data: {
        user: {
          id: 'user-123',
          user_metadata: { full_name: 'Test User' },
          email: 'test@example.com',
        },
      },
      error: null,
    });
  }
  signOut() {
    return Promise.resolve();
  }
}

class MockChatService {
  getConversations(userId: string) {
    return Promise.resolve({ data: [], error: null });
  }
  createConversation(userId: string, title: string) {
    return Promise.resolve({
      data: [
        {
          id: 'conv-456',
          title: title,
          user_id: userId,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
  }
  sendMessage(convId: string, userId: string, role: string, content: string) {
    return Promise.resolve({ data: [{ id: 'msg-789' }], error: null });
  }
  getAiResponse(history: any) {
    return Promise.resolve('AI response');
  }
  getMessages(conversationId: string) {
    return Promise.resolve({ data: [], error: null });
  }
  updateConversationTitle(convId: string, title: string) {
    return Promise.resolve({ data: [], error: null });
  }
}

class MockSupabaseService {
  getClient() {
    return {
      channel: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe: () => {} }),
        }),
      }),
      from: () => ({
        delete: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'user-123' } }, error: null }),
      },
    };
  }
}

class MockNgbModal {
  open() {
    return {
      componentInstance: {},
      result: Promise.resolve(true),
    };
  }
}

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let authService: AuthService;
  let chatService: ChatService;
  let router: Router;
  let modalService: NgbModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        { provide: ChatService, useClass: MockChatService },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: NgbModal, useClass: MockNgbModal },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    chatService = TestBed.inject(ChatService);
    router = TestBed.inject(Router);
    modalService = TestBed.inject(NgbModal);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should fetch user and create new unsaved session if no conversations exist', fakeAsync(() => {
      spyOn(chatService, 'getConversations').and.resolveTo({
        data: [],
        error: null,
        count: null,
        status: 0,
        statusText: '',
      });
      fixture.detectChanges();
      tick();

      expect(component.currentUserId).toBe('user-123');
      expect(component.userFullName).toBe('Test User');
      expect(component.isNewUnsavedConversation).toBe(true);
      expect(component.currentConversationId).toBeNull();
    }));

    it('should redirect to login if no user is found', fakeAsync(() => {
      spyOn(authService, 'getUser').and.returnValue(
        Promise.resolve({ data: { user: null }, error: null } as any),
      );
      fixture.detectChanges();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));
  });

  describe('sendMessage', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));
    it('should create a new conversation if sending a message in an unsaved session', fakeAsync(() => {
      spyOn(chatService, 'createConversation').and.callThrough();
      spyOn(chatService, 'sendMessage').and.callThrough();
      spyOn(chatService, 'getAiResponse').and.callThrough();

      expect(component.isNewUnsavedConversation).toBe(true);

      component.chatForm.get('message')?.setValue('Hello AI');
      component.sendMessage();
      flush();

      expect(chatService.createConversation).toHaveBeenCalled();
      expect(component.currentConversationId).toBe('conv-456');
      expect(component.isNewUnsavedConversation).toBe(false);
      expect(chatService.sendMessage).toHaveBeenCalledTimes(2);
      expect(chatService.getAiResponse).toHaveBeenCalled();
      expect(component.messages.length).toBeGreaterThan(0);
      expect(component.sending).toBe(false);
    }));

    it('should not send if message is empty', fakeAsync(() => {
      spyOn(chatService, 'createConversation');
      component.chatForm.get('message')?.setValue(' ');
      component.sendMessage();
      expect(chatService.createConversation).not.toHaveBeenCalled();
    }));
  });

  describe('logout', () => {
    it('should open confirmation modal, sign out, and navigate on confirmation', fakeAsync(() => {
      spyOn(modalService, 'open').and.callThrough();
      spyOn(authService, 'signOut').and.callThrough();

      component.logout();
      tick();

      expect(modalService.open).toHaveBeenCalled();
      expect(authService.signOut).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));
  });
});
