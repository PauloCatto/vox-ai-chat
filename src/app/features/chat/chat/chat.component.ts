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
  currentConversationId: string = '';
  currentConversationTitle: string = 'New Chat';
  conversations: Conversation[] = [];
  messages: Message[] = [];
  sending: boolean = false;
  apiError: string | null = null;

  private realtimeSubscription: any;

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
        chatBody.scrollTop = chatBody.scrollHeight;
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
    this.realtimeSubscription?.unsubscribe();

    const { data, error } = await this.chatService.createConversation(
      this.currentUserId,
      title
    );
    if (error) {
      console.error('Error creating new conversation:', error);
      return;
    }

    const newConv = (data as unknown as Conversation[])[0];
    this.conversations.unshift(newConv);
    this.currentConversationId = newConv.id;
    this.currentConversationTitle = newConv.title;
    this.messages = [];
    this.apiError = null;

    this.listenToNewMessages();
    this.scrollToBottom();
  }

  async selectConversation(id: string): Promise<void> {
    if (this.currentConversationId === id) return;
    this.realtimeSubscription?.unsubscribe();
    this.currentConversationId = id;
    const selected = this.conversations.find((c) => c.id === id);
    this.currentConversationTitle = selected?.title || 'Unknown Chat';
    this.apiError = null;

    await this.loadMessages(id);

    this.listenToNewMessages();
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

    this.sending = true;
    this.apiError = null;
    const userMessage = this.chatForm.get('message')?.value;
    const messageToSend = userMessage.trim();
    this.chatForm.reset();

    try {
      await this.chatService.sendMessage(
        this.currentConversationId,
        this.currentUserId,
        'user',
        messageToSend
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      const historyForAi = this.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let aiResponseContent: string;
      try {
        aiResponseContent = await this.chatService.getAiResponse(historyForAi);
      } catch (e: any) {
        console.error('AI API Error:', e);
        this.apiError =
          e.error?.message ||
          e.message ||
          'Error communicating with AI service. Check API quota/key.';
        return;
      }

      await this.chatService.sendMessage(
        this.currentConversationId,
        this.currentUserId,
        'assistant',
        aiResponseContent
      );

      if (this.messages.length <= 2) {
        const newTitle =
          messageToSend.substring(0, 30) +
          (messageToSend.length > 30 ? '...' : '');

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
        await this.loadConversations();
      }
    } catch (error) {
      console.error('Error during chat message flow/DB operation:', error);
      this.apiError =
        this.apiError ||
        'An unexpected error occurred during message processing or saving.';
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
}
