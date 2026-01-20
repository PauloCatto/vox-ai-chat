import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChatComponent } from './chat.component';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import Swal from 'sweetalert2';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatService: jasmine.SpyObj<ChatService>;
  let authService: jasmine.SpyObj<AuthService>;
  let notify: jasmine.SpyObj<NotificationService>;
  let modalService: jasmine.SpyObj<NgbModal>;
  let router: jasmine.SpyObj<Router>;

  const channelMock: any = {
    on: jasmine.createSpy('on').and.callFake(() => channelMock),
    subscribe: jasmine.createSpy('subscribe').and.callFake(() => channelMock),
    unsubscribe: jasmine.createSpy('unsubscribe'),
  };

  const supabaseMock = {
    getClient: () => ({
      channel: () => channelMock,
      from: () => ({
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    chatService = jasmine.createSpyObj('ChatService', [
      'getConversations',
      'getMessages',
      'createConversation',
      'sendMessage',
      'getAiResponse',
      'updateConversationTitle',
    ]);

    authService = jasmine.createSpyObj('AuthService', ['getUser', 'signOut']);
    notify = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    modalService = jasmine.createSpyObj('NgbModal', ['open']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    authService.getUser.and.resolveTo({
      data: {
        user: {
          id: '1',
          email: 'test@test.com',
          user_metadata: { full_name: 'Test' },
        },
      },
      error: null,
    } as any);

    chatService.getConversations.and.resolveTo({
      data: [],
      error: null,
    } as any);

    await TestBed.configureTestingModule({
      imports: [ChatComponent, ReactiveFormsModule, FormsModule],
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notify },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: NgbModal, useValue: modalService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and create new unsaved chat', async () => {
    await (component as any).initializeChat();
    expect(component.isNewUnsavedConversation).toBeTrue();
  });

  it('should toggle sidebar', () => {
    component.toggleSidebar();
    expect(component.isSidebarVisible).toBeTrue();
  });

  it('should load messages successfully', fakeAsync(() => {
    chatService.getMessages.and.resolveTo({
      data: [{ id: '1', content: 'msg' }],
      error: null,
    } as any);
    (component as any).loadMessages('1');
    tick();
    flush();
    expect(component.messages.length).toBe(1);
  }));

  it('should handle loadMessages error', fakeAsync(() => {
    chatService.getMessages.and.resolveTo({ data: null, error: true } as any);
    (component as any).loadMessages('1');
    tick();
    expect(component.messages.length).toBe(0);
  }));

  it('should send message successfully with AI response', fakeAsync(() => {
    component.isNewUnsavedConversation = true;
    component.chatForm.get('message')?.setValue('hello');

    chatService.createConversation.and.resolveTo({
      data: [{ id: 'c1', title: 'hello' }],
      error: null,
    } as any);

    chatService.sendMessage.and.resolveTo({ data: [{}], error: null } as any);
    chatService.getAiResponse.and.resolveTo('AI response');

    component.sendMessage();
    tick();
    flush();

    expect(component.messages.length).toBeGreaterThan(0);
    expect(component.sending).toBeFalse();
  }));

  it('should handle AI empty response', fakeAsync(() => {
    component.currentConversationId = '1';
    component.chatForm.get('message')?.setValue('test');

    chatService.sendMessage.and.resolveTo({ data: [{}], error: null } as any);
    chatService.getAiResponse.and.resolveTo(null);

    component.sendMessage();
    tick();
    flush();

    expect(notify.error).toHaveBeenCalled();
  }));

  it('should execute delete and reset conversation', fakeAsync(() => {
    component.conversations = [{ id: '1', title: 'Chat' } as any];
    component.currentConversationId = '1';

    component.executeDelete('1');
    tick();

    expect(component.conversations.length).toBe(0);
    expect(component.currentConversationId).toBeNull();
  }));

  it('should logout successfully', fakeAsync(() => {
    modalService.open.and.returnValue({
      componentInstance: {},
      result: Promise.resolve(true),
    } as any);

    component.logout();
    tick();

    expect(authService.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should adjust textarea height', () => {
    const el = { style: { height: '' }, scrollHeight: 120 };
    component.adjustHeight({ target: el });
    expect(el.style.height).toContain('px');
  });

  it('should filter conversations by search query', () => {
    component.conversations = [
      { id: '1', title: 'Angular Chat' } as any,
      { id: '2', title: 'React Chat' } as any,
    ];
    component.searchQuery = 'angular';
    expect(component.filteredConversations.length).toBe(1);
  });

  it('should edit conversation title', fakeAsync(async () => {
    spyOn(Swal, 'fire').and.resolveTo({ value: 'New Title' } as any);
    chatService.updateConversationTitle.and.resolveTo({ error: null } as any);

    const conv = { id: '1', title: 'Old' };
    await component.openEditTitleModal(conv, new Event('click'));

    expect(conv.title).toBe('New Title');
  }));

  it('should unsubscribe on destroy', () => {
    (component as any).realtimeSubscription = channelMock;
    component.ngOnDestroy();
    expect(channelMock.unsubscribe).toHaveBeenCalled();
  });

  it('should handle initializeChat error', async () => {
    authService.getUser.and.rejectWith(new Error('fail'));
    await (component as any).initializeChat();
    expect(component.userFullName).toBe('Error Loading User');
    expect(component.loadingUserInfo).toBeFalse();
  });

  it('should not select same conversation twice', async () => {
    component.currentConversationId = '1';
    await component.selectConversation('1');
    expect(component.currentConversationId).toBe('1');
  });

  it('should toggle sidebar visibility', () => {
    component.isSidebarVisible = false;
    component.toggleSidebar();
    expect(component.isSidebarVisible).toBeTrue();
  });

  it('should not send message when form is invalid', async () => {
    component.chatForm.get('message')?.setValue('');
    await component.sendMessage();
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('should block sendMessage when sending is true', async () => {
    component.sending = true;
    component.chatForm.get('message')?.setValue('hi');
    await component.sendMessage();
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('should cancel delete confirmation', fakeAsync(() => {
    modalService.open.and.returnValue({
      componentInstance: {},
      result: Promise.resolve(false),
    } as any);

    component.conversations = [{ id: '1', title: 'Chat' } as any];
    component.openDeleteConfirmation('1', new MouseEvent('click'));
    tick();

    expect(component.conversations.length).toBe(1);
  }));

  it('should cancel logout', fakeAsync(() => {
    modalService.open.and.returnValue({
      componentInstance: {},
      result: Promise.resolve(false),
    } as any);

    component.logout();
    tick();

    expect(authService.signOut).not.toHaveBeenCalled();
  }));

  it('should adjust textarea height', () => {
    const el = { style: { height: '' }, scrollHeight: 150 };
    component.adjustHeight({ target: el });
    expect(el.style.height).toContain('px');
  });

  it('should return early when selecting null conversation', async () => {
    component.currentConversationId = '1';
    await component.selectConversation(null);
    expect(component.currentConversationId).toBe('1');
  });

  it('should handle createConversation error', fakeAsync(() => {
    component.isNewUnsavedConversation = true;
    component.chatForm.get('message')?.setValue('hello');

    chatService.createConversation.and.resolveTo({
      data: null,
      error: true,
    } as any);

    component.sendMessage();
    tick();
    flush();

    expect(notify.error).toHaveBeenCalled();
  }));

  it('should handle user message save error', fakeAsync(() => {
    component.currentConversationId = '1';
    component.chatForm.get('message')?.setValue('hello');

    chatService.sendMessage.and.resolveTo({ error: true } as any);

    component.sendMessage();
    tick();
    flush();

    expect(notify.error).toHaveBeenCalled();
  }));

  it('should handle AI message save error', fakeAsync(() => {
    component.currentConversationId = '1';
    component.chatForm.get('message')?.setValue('hello');

    chatService.sendMessage.and.returnValues(
      Promise.resolve({ error: null } as any),
      Promise.resolve({ error: true } as any),
    );

    chatService.getAiResponse.and.resolveTo('AI reply');

    component.sendMessage();
    tick();
    flush();

    expect(notify.error).toHaveBeenCalled();
  }));

  it('should handle logout failure', fakeAsync(() => {
    modalService.open.and.returnValue({
      componentInstance: {},
      result: Promise.resolve(true),
    } as any);

    authService.signOut.and.rejectWith(new Error('fail'));

    component.logout();
    tick();

    expect(notify.error).toHaveBeenCalled();
  }));

  it('should return all conversations when searchQuery is empty', () => {
    component.conversations = [{ id: '1', title: 'Chat' } as any];
    component.searchQuery = '   ';
    expect(component.filteredConversations.length).toBe(1);
  });

  it('should append realtime message when received', fakeAsync(() => {
    component.currentConversationId = '1';
    component.messages = [];

    component['listenToNewMessages']();

    const payload = {
      new: {
        id: 'rt1',
        content: 'realtime',
        role: 'assistant',
      },
    };

    channelMock.on.calls.mostRecent().args[2](payload);
    tick();
    flush();

    expect(component.messages.length).toBe(1);
  }));

  it('should scroll chat body when last message element does not exist', fakeAsync(() => {
    const chatBody = { scrollTop: 0, scrollHeight: 300 };
    spyOn(document, 'getElementById').and.returnValue(null);
    spyOn(document, 'querySelector').and.returnValue(chatBody as any);

    (component as any).scrollToLastMessage();
    tick(100);

    expect(chatBody.scrollTop).toBe(300);
  }));
});
