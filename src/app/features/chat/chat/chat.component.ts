import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ChatService } from '../../../core/services/chat.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '@shared/modal/modal.component';
import { Conversation, Message } from 'src/app/core/models/chat.model';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationService } from 'src/app/core/services/notification.service';
import Swal from 'sweetalert2';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    ModalComponent,
    FormsModule,
    MarkdownComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private supabaseService = inject(SupabaseService);
  private notify = inject(NotificationService);
  private modalService = inject(NgbModal);

  chatForm!: FormGroup;
  userFullName: string = 'Loading...';
  loadingUserInfo: boolean = true;
  currentUserId: string = '';
  currentConversationId: string | null = null;
  currentConversationTitle: string = 'New Chat';
  conversations: Conversation[] = [];
  messages: Message[] = [];
  sending: boolean = false;
  deleting: boolean = false;
  apiError: string | null = null;
  isSidebarVisible: boolean = false;
  isNewUnsavedConversation: boolean = false;
  searchQuery: string = '';
  isStreaming: boolean = false;

  private realtimeSubscription: RealtimeChannel | null = null;
  private tempMessageIds = new Set<string>();

  ngOnInit(): void {
    this.initForm();
    this.initializeChat();
  }

  ngOnDestroy(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
  }

  private initForm(): void {
    this.chatForm = this.fb.group({
      message: ['', Validators.required],
    });
  }

  private scrollToLastMessage(): void {
    setTimeout(() => {
      const lastMsgElement = document.getElementById('last-msg');
      if (lastMsgElement) {
        lastMsgElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const chatBody = document.querySelector('.chat-body');
        if (chatBody) {
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      }
    }, 100);
  }

  private async initializeChat(): Promise<void> {
    this.loadingUserInfo = true;
    try {
      const { data: userData, error } = await this.authService.getUser();
      if (error) throw error;

      const user = userData.user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.currentUserId = user.id;
      this.userFullName =
        user.user_metadata?.['full_name'] || user.email || 'User';
      this.loadingUserInfo = false;

      await this.loadConversations();

      const hasNotified = sessionStorage.getItem('welcome_notified');

      if (!hasNotified) {
        if (this.conversations.length === 0) {
          this.notify.success(`Welcome to VoxAI, ${this.userFullName}!`);
        } else {
          this.notify.success(`Welcome back, ${this.userFullName}!`);
        }
        sessionStorage.setItem('welcome_notified', 'true');
      }

      if (this.conversations.length === 0) {
        this.createNewUnsavedSession('New Chat');
      } else {
        this.selectConversation(this.conversations[0].id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      this.userFullName = 'Error Loading User';
      this.loadingUserInfo = false;
    }
  }

  async loadConversations(): Promise<void> {
    const { data, error } = await this.chatService.getConversations(
      this.currentUserId,
    );
    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }
    this.conversations =
      (data as Conversation[]).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ) || [];
  }

  createNewUnsavedSession(title: string = 'New Chat'): void {
    this.realtimeSubscription?.unsubscribe();
    this.apiError = null;
    this.isSidebarVisible = false;
    this.currentConversationId = null;
    this.currentConversationTitle = title;
    this.messages = [];
    this.tempMessageIds.clear();
    this.isNewUnsavedConversation = true;
    this.chatForm.reset();
  }

  createNewConversation(title: string = 'New Chat'): void {
    this.createNewUnsavedSession(title);
  }

  async selectConversation(id: string | null): Promise<void> {
    if (this.currentConversationId === id || id === null) return;
    this.isNewUnsavedConversation = false;
    this.realtimeSubscription?.unsubscribe();
    this.currentConversationId = id;
    const selected = this.conversations.find((c) => c.id === id);
    this.currentConversationTitle = selected?.title || 'Unknown Chat';
    this.apiError = null;
    this.tempMessageIds.clear();
    await this.loadMessages(id);
    this.listenToNewMessages();
    if (window.innerWidth < 992) {
      this.isSidebarVisible = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  private async loadMessages(conversationId: string): Promise<void> {
    const { data, error } = await this.chatService.getMessages(conversationId);
    if (error) {
      console.error('Error loading messages:', error);
      this.messages = [];
      return;
    }
    this.messages = (data as Message[]) || [];
    this.scrollToLastMessage();
  }

  private listenToNewMessages(): void {
    if (!this.currentConversationId) return;
    const supabaseClient = this.supabaseService.getClient();
    this.realtimeSubscription = supabaseClient
      .channel(`conversation:${this.currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${this.currentConversationId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as Message;
          if (this.tempMessageIds.has(newMessage.id)) return;
          if (!this.messages.some((msg) => msg.id === newMessage.id)) {
            this.messages.push(newMessage);
            this.scrollToLastMessage();
          }
        },
      )
      .subscribe();
  }

  async sendMessage(): Promise<void> {
    const messageControl = this.chatForm.get('message');

    if (
      this.chatForm.invalid ||
      this.sending ||
      (!this.currentConversationId && !this.isNewUnsavedConversation)
    ) {
      return;
    }

    const userMessageContent = messageControl?.value.trim();
    if (!userMessageContent) return;

    this.sending = true;
    this.apiError = null;
    messageControl?.disable();
    this.chatForm.reset();

    try {
      if (this.isNewUnsavedConversation) {
        const title =
          userMessageContent.substring(0, 30) +
          (userMessageContent.length > 30 ? '...' : '');
        const { data: newConvList, error: convError } =
          await this.chatService.createConversation(this.currentUserId, title);

        if (convError) {
          this.notify.error(
            'System was unable to initialize the conversation. Please try again.',
          );
          throw convError;
        }

        const newConv = (newConvList as unknown as Conversation[])?.[0];
        if (!newConv) throw new Error('New conversation ID retrieval failed.');

        this.currentConversationId = newConv.id;
        this.currentConversationTitle = newConv.title;
        this.conversations.unshift(newConv);
        this.isNewUnsavedConversation = false;
        this.listenToNewMessages();
      }

      const userTempId = crypto.randomUUID();
      const tempUserMessage: Message = {
        id: userTempId,
        user_id: this.currentUserId,
        content: userMessageContent,
        created_at: new Date().toISOString(),
        role: 'user',
        conversation_id: this.currentConversationId!,
      };
      this.messages.push(tempUserMessage);
      this.scrollToLastMessage();

      const { error: userMsgError } = await this.chatService.sendMessage(
        this.currentConversationId!,
        this.currentUserId,
        'user',
        userMessageContent,
      );

      if (userMsgError) {
        this.notify.error(
          'Failed to synchronize your message with the server.',
        );
        throw userMsgError;
      }

      const historyForAi = this.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
      }));

      const aiTempId = crypto.randomUUID();
      const tempAiMessage: Message = {
        id: aiTempId,
        user_id: this.currentUserId,
        content: '',
        created_at: new Date().toISOString(),
        role: 'assistant',
        conversation_id: this.currentConversationId!,
      };
      this.messages.push(tempAiMessage);
      this.isStreaming = true;

      let fullAiContent = '';
      try {
        const stream = this.chatService.streamAiResponse(historyForAi);
        for await (const chunk of stream) {
          fullAiContent += chunk;
          tempAiMessage.content = fullAiContent;
          this.scrollToLastMessage();
        }
      } catch (streamError) {
        console.error('Error during streaming:', streamError);
      } finally {
        this.isStreaming = false;
        this.sending = false;
      }

      if (!fullAiContent) {
        this.messages = this.messages.filter((m) => m.id !== aiTempId);
        this.notify.error(
          'The AI service is currently unresponsive. Please attempt your request again.',
        );
        return;
      }

      const { data: aiMessageData, error: saveError } =
        await this.chatService.sendMessage(
          this.currentConversationId!,
          this.currentUserId,
          'assistant',
          fullAiContent,
        );

      if (!saveError && aiMessageData) {
        const savedAiMessage = (aiMessageData as unknown as Message[])[0];
        const index = this.messages.findIndex((m) => m.id === aiTempId);
        if (index !== -1) {
          this.messages[index] = savedAiMessage;
        }
      }
    } catch (error: any) {
      console.error('[Internal Chat Error]:', error);
    } finally {
      this.sending = false;
      this.isStreaming = false;
      messageControl?.enable();
      this.scrollToLastMessage();

      setTimeout(() => {
        const textarea = document.querySelector(
          'textarea',
        ) as HTMLTextAreaElement;
        textarea?.focus();
      }, 0);
    }
  }

  async openDeleteConfirmation(
    conversationId: string,
    event: MouseEvent,
  ): Promise<void> {
    event.stopPropagation();
    const conversation = this.conversations.find(
      (c) => c.id === conversationId,
    );
    const title = conversation ? conversation.title : 'this conversation';

    try {
      const modalRef = this.modalService.open(ModalComponent, {
        centered: true,
        backdrop: 'static',
        keyboard: false,
      });

      modalRef.componentInstance.title = 'Confirmation Required';
      modalRef.componentInstance.message = `Are you sure you want to delete the conversation: <strong>${title}</strong>?<br/><strong class='text-danger'>All messages will be lost and the action is irreversible.</strong>`;
      modalRef.componentInstance.confirmText = 'Delete';
      modalRef.componentInstance.cancelText = 'Cancel';
      modalRef.componentInstance.danger = true;
      modalRef.componentInstance.showActions = true;

      const confirmed = await modalRef.result;
      if (confirmed) {
        await this.executeDelete(conversationId);
      }
    } catch (error) {
      console.error('Error opening delete confirmation:', error);
    }
  }

  async executeDelete(conversationId: string): Promise<void> {
    this.deleting = true;
    try {
      const { error } = await this.supabaseService
        .getClient()
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      this.conversations = this.conversations.filter(
        (c) => c.id !== conversationId,
      );

      if (this.currentConversationId === conversationId) {
        this.realtimeSubscription?.unsubscribe();
        this.messages = [];
        this.currentConversationId = null;
        if (this.conversations.length > 0) {
          this.selectConversation(this.conversations[0].id);
        } else {
          this.createNewUnsavedSession();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      this.apiError = 'Failed to delete conversation.';
    } finally {
      this.deleting = false;
    }
  }

  async logout(): Promise<void> {
    try {
      const modalRef = this.modalService.open(ModalComponent, {
        centered: true,
        backdrop: 'static',
        keyboard: false,
      });

      modalRef.componentInstance.title = 'Confirm Logout';
      modalRef.componentInstance.message =
        'Are you sure you want to log out?<br/><strong>Your session will be closed.</strong>';
      modalRef.componentInstance.confirmText = 'Logout';
      modalRef.componentInstance.cancelText = 'Cancel';
      modalRef.componentInstance.danger = true;
      modalRef.componentInstance.showActions = true;

      const confirmed = await modalRef.result;
      if (!confirmed) return;

      await this.authService.signOut();

      sessionStorage.removeItem('welcome_notified');

      this.notify.success('Logged out successfully. See you soon!');
      this.router.navigate(['/login']);
    } catch (error) {
      if (error === 'cancel' || error === 0) return;
      console.error('Logout failed:', error);
      this.notify.error('Failed to log out. Please try again.');
    }
  }

  adjustHeight(event: any): void {
    const element = event.target;
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  }

  handleEnter(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.shiftKey) return;

    event.preventDefault();

    const messageControl = this.chatForm.get('message');
    const messageValue = messageControl?.value?.trim();

    if (this.chatForm.valid && !this.sending && messageValue) {
      this.sendMessage();

      const textarea = event.target as HTMLTextAreaElement;
      textarea.style.height = 'auto';
    }
  }

  async openEditTitleModal(conv: any, event: Event) {
    event.stopPropagation();

    const { value: newTitle } = await Swal.fire({
      title: 'Rename Conversation',
      input: 'text',
      inputValue: conv.title,
      inputLabel: 'Enter the new title',
      showCancelButton: true,
      confirmButtonText: 'Save',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return 'The title cannot be empty!';
        }
        return null;
      },
    });

    if (newTitle && newTitle.trim() !== conv.title) {
      const response = await this.chatService.updateConversationTitle(
        conv.id,
        newTitle.trim(),
      );

      if (!response.error) {
        conv.title = newTitle.trim();

        if (this.currentConversationId === conv.id) {
          this.currentConversationTitle = newTitle.trim();
        }
      }
    }
  }

  get filteredConversations(): Conversation[] {
    if (!this.searchQuery.trim()) {
      return this.conversations;
    }
    return this.conversations.filter((conv) =>
      conv.title.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }
}
