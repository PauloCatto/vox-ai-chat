import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ChatService } from '../../../core/services/chat.service';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  role: 'user' | 'assistant';
  conversation_id: string;
}
interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private supabaseService = inject(SupabaseService);

  chatForm!: FormGroup;
  userFullName: string = 'Loading...';
  loadingUserInfo: boolean = true;
  currentUserId: string = '';
  currentConversationId: string | null = '';
  currentConversationTitle: string = 'New Chat';
  conversations: Conversation[] = [];
  messages: Message[] = [];
  sending: boolean = false;
  apiError: string | null = null;
  showDeleteModal: boolean = false;
  conversationToDeleteId: string | null = null;
  isSidebarVisible: boolean = false;

  private realtimeSubscription: any;
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

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) {
        requestAnimationFrame(() => {
          chatBody.scrollTop = chatBody.scrollHeight;
        });
      }
    }, 50);
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
        user.user_metadata['full_name'] || user.email || 'User';

      await this.loadConversations();

      if (this.conversations.length === 0) {
        await this.createNewConversation('New Chat');
      } else {
        this.selectConversation(this.conversations[0].id);
      }
    } catch (error) {
      console.error(
        'Error initializing chat. The Send button may be disabled if no conversation ID could be established:',
        error
      );
      this.userFullName = 'Error Loading User';
    } finally {
      this.loadingUserInfo = false;
    }
  }

  async loadConversations(): Promise<void> {
    const { data, error } = await this.chatService.getConversations(
      this.currentUserId
    );
    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }
    this.conversations =
      (data as Conversation[]).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || [];
  }

  async createNewConversation(title: string = 'New Chat'): Promise<void> {
    this.sending = true;
    this.realtimeSubscription?.unsubscribe();
    this.apiError = null;

    try {
      const { data, error } = await this.chatService.createConversation(
        this.currentUserId,
        title
      );

      if (error) throw error;

      const newConvList = data as unknown as Conversation[] | null;
      const newConv =
        newConvList && newConvList.length > 0 ? newConvList[0] : null;

      if (!newConv) {
        await this.loadConversations();
        const latestConv = this.conversations[0];

        if (!latestConv) {
          throw new Error('Could not create or load any conversation.');
        }

        this.currentConversationId = latestConv.id;
        this.currentConversationTitle = latestConv.title;
      } else {
        this.conversations.unshift(newConv);
        this.currentConversationId = newConv.id;
        this.currentConversationTitle = newConv.title;
      }

      this.messages = [];
      this.tempMessageIds.clear();

      this.listenToNewMessages();
      this.scrollToBottom();
    } catch (error) {
      console.error('Error creating new conversation:', error);
      this.apiError = 'Failed to start a new chat session.';
      this.currentConversationId = null;
      this.messages = [];
    } finally {
      this.sending = false;
    }
  }

  async selectConversation(id: string): Promise<void> {
    if (this.currentConversationId === id) return;
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
    this.scrollToBottom();
  }

  private listenToNewMessages(): void {
    if (!this.currentConversationId) {
      console.warn(
        'Cannot listen for messages: currentConversationId is missing.'
      );
      return;
    }

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
            this.scrollToBottom();
          }
        }
      )
      .subscribe();
  }

  async sendMessage(): Promise<void> {
    if (this.chatForm.invalid || this.sending || !this.currentConversationId)
      return;

    const userMessageContent = this.chatForm.get('message')!.value.trim();
    if (!userMessageContent) return;

    this.sending = true;
    this.apiError = null;
    this.chatForm.reset();

    const isFirstMessage = this.messages.length === 0;
    const userTempId = crypto.randomUUID();

    try {
      const tempUserMessage: Message = {
        id: userTempId,
        user_id: this.currentUserId,
        content: userMessageContent,
        created_at: new Date().toISOString(),
        role: 'user',
        conversation_id: this.currentConversationId,
      };
      this.messages.push(tempUserMessage);
      this.tempMessageIds.add(userTempId);
      this.scrollToBottom();

      await this.chatService.sendMessage(
        this.currentConversationId,
        this.currentUserId,
        'user',
        userMessageContent
      );

      if (isFirstMessage) {
        const newTitle =
          userMessageContent.substring(0, 30) +
          (userMessageContent.length > 30 ? '...' : '');

        await this.chatService.updateConversationTitle(
          this.currentConversationId,
          newTitle
        );

        const convIndex = this.conversations.findIndex(
          (c) => c.id === this.currentConversationId
        );
        if (convIndex > -1) {
          this.conversations[convIndex].title = newTitle;
          this.currentConversationTitle = newTitle;
        }
      }

      const historyForAi = this.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
      }));

      let aiResponseContent: string;
      try {
        aiResponseContent = await this.chatService.getAiResponse(historyForAi);
      } catch (e: any) {
        this.messages = this.messages.filter((msg) => msg.id !== userTempId);
        this.tempMessageIds.delete(userTempId);
        throw e;
      }

      const { data: aiMessageData, error: saveError } =
        await this.chatService.sendMessage(
          this.currentConversationId,
          this.currentUserId,
          'assistant',
          aiResponseContent
        );

      if (saveError) throw saveError;

      const aiMessage = (aiMessageData as unknown as Message[])[0];

      if (aiMessage && !this.messages.some((msg) => msg.id === aiMessage.id)) {
        this.messages.push(aiMessage);
      }
    } catch (error: any) {
      console.error('Error during chat message flow/DB operation:', error);
      this.apiError =
        error.error?.message ||
        error.message ||
        'An unexpected error occurred during message processing or saving.';
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  openDeleteConfirmation(conversationId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.conversationToDeleteId = conversationId;
    this.showDeleteModal = true;
  }

  closeDeleteConfirmation(): void {
    this.showDeleteModal = false;
    this.conversationToDeleteId = null;
    this.apiError = null;
  }

  async confirmDeleteConversation(): Promise<void> {
    const conversationId = this.conversationToDeleteId;

    this.closeDeleteConfirmation();

    if (!conversationId) {
      return;
    }

    this.sending = true;

    try {
      const { error } = await this.supabaseService
        .getClient()
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      this.conversations = this.conversations.filter(
        (c) => c.id !== conversationId
      );

      if (this.currentConversationId === conversationId) {
        this.realtimeSubscription?.unsubscribe();
        this.messages = [];
        this.currentConversationId = null;

        if (this.conversations.length > 0) {
          this.selectConversation(this.conversations[0].id);
        } else {
          this.createNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      this.apiError = 'Falha ao deletar. Verifique o Supabase RLS/CASCADE.';
    } finally {
      this.sending = false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  get conversationTitleToDelete(): string {
    if (!this.conversationToDeleteId) {
      return 'Esta Conversa';
    }
    const conv = this.conversations.find(
      (c) => c.id === this.conversationToDeleteId
    );
    return conv ? conv.title : 'Esta Conversa';
  }
}
