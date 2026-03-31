import { Component, OnInit, OnDestroy, inject, NgZone, HostListener } from '@angular/core';
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
  private zone = inject(NgZone);

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
  isRecording: boolean = false;
  isVoiceEnabled: boolean = false;
  private recognition: any;
  private finalTranscript: string = '';
  private ttsBuffer: string = '';
  private utterances: SpeechSynthesisUtterance[] = [];

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  private realtimeSubscription: RealtimeChannel | null = null;
  private tempMessageIds = new Set<string>();

  ngOnInit(): void {
    this.initForm();
    this.initializeChat();
    this.initSpeechRecognition();
  }

  ngOnDestroy(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 992 && this.isSidebarVisible) {
      this.isSidebarVisible = false;
    }
  }

  private initForm(): void {
    this.chatForm = this.fb.group({
      message: ['', Validators.required],
    });
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.zone.run(() => {
          this.isRecording = true;
          this.finalTranscript = '';
        });
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        this.zone.run(() => {
          const fullTranscript = (this.finalTranscript + interimTranscript).trim();
          if (fullTranscript) {
            this.chatForm.patchValue({ message: fullTranscript });
          }
        });
      };

      this.recognition.onerror = (event: any) => {
        this.zone.run(() => {
          this.isRecording = false;

          switch (event.error) {
            case 'no-speech':
              break;
            case 'not-allowed':
              this.notify.error(
                'Microfone bloqueado. Por favor, permita o acesso nas configurações do navegador.'
              );
              break;
            case 'network':
              this.notify.error(
                'Erro de rede: O reconhecimento de voz requer conexão com a internet.'
              );
              break;
            default:
              console.error('Speech recognition error:', event.error);
          }
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.isRecording = false;
        });
      };
    }
  }

  toggleRecording(): void {
    if (!this.recognition) {
      this.notify.error('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Falha ao iniciar reconhecimento:', e);
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        this.notify.error('O arquivo é muito grande. O limite é 4MB.');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  toggleVoice(): void {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    if (!this.isVoiceEnabled) {
      window.speechSynthesis.cancel();
      this.utterances = [];
    } else {
      // Pré-ativa o motor de voz
      window.speechSynthesis.getVoices();
      this.notify.success('Voz da IA ativada');
    }
  }

  private processTTS(chunk: string): void {
    if (!this.isVoiceEnabled) return;

    this.ttsBuffer += chunk;

    // Procura por pontuação que indique fim de frase
    const lastPunctuation = Math.max(
      this.ttsBuffer.lastIndexOf('. '),
      this.ttsBuffer.lastIndexOf('! '),
      this.ttsBuffer.lastIndexOf('? '),
      this.ttsBuffer.lastIndexOf('\n'),
      this.ttsBuffer.lastIndexOf(': ')
    );

    // Fala se houver uma frase completa (mínimo 10 chars) ou buffer muito grande
    if (
      (lastPunctuation !== -1 && lastPunctuation > 10) ||
      this.ttsBuffer.length > 150
    ) {
      const splitPoint = lastPunctuation !== -1 ? lastPunctuation + 1 : this.ttsBuffer.length;
      const toSpeak = this.ttsBuffer.substring(0, splitPoint).trim();
      this.ttsBuffer = this.ttsBuffer.substring(splitPoint);

      if (toSpeak) {
        this.speak(toSpeak);
      }
    }
  }

  private speak(text: string): void {
    if (!window.speechSynthesis) return;

    // Remove markdown e símbolos para a fala não ficar estranha
    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    if (!cleanText || cleanText.length < 2) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; // Um pouco mais rápido para fluir melhor com o texto

    const performSpeech = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find((v) => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.includes('pt-BR')) ||
        voices.find((v) => v.lang.startsWith('pt'));

      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      // Adiciona à lista para evitar que o Garbage Collector limpe a fala prematuramente em conversas longas
      this.utterances.push(utterance);
      utterance.onend = () => {
        this.utterances = this.utterances.filter((u) => u !== utterance);
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      performSpeech();
    } else {
      // Se as vozes ainda não carregaram, aguarda o evento do navegador
      window.speechSynthesis.onvoiceschanged = () => performSpeech();
    }
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

    if (this.isRecording && this.recognition) {
      this.recognition.stop();
    }

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

    window.speechSynthesis.cancel();
    this.utterances = [];
    this.ttsBuffer = '';

    const currentFile = this.selectedFile;
    const currentPreview = this.imagePreview;
    this.removeSelectedFile();

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

      const messageContentForDb = currentPreview
        ? `${userMessageContent}\n\n![Image](${currentPreview})`
        : userMessageContent;

      const userTempId = crypto.randomUUID();
      const tempUserMessage: Message = {
        id: userTempId,
        user_id: this.currentUserId,
        content: messageContentForDb,
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
        messageContentForDb,
      );

      if (userMsgError) {
        this.notify.error(
          'Failed to synchronize your message with the server.',
        );
        throw userMsgError;
      }

      const historyForAi = this.messages.slice(0, this.messages.length - 1).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
      }));
      historyForAi.push({ role: 'user', content: userMessageContent });

      let imageForAi = undefined;
      if (currentFile) {
        imageForAi = {
          mimeType: currentFile.type,
          data: await this.fileToBase64(currentFile),
        };
      }

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
        const stream = this.chatService.streamAiResponse(
          historyForAi,
          imageForAi,
        );
        for await (const chunk of stream) {
          fullAiContent += chunk;
          tempAiMessage.content = fullAiContent;
          this.processTTS(chunk);
          this.scrollToLastMessage();
        }
      } catch (streamError: any) {
        console.error('Error during streaming:', streamError);
        this.apiError = 'A IA não respondeu. A imagem pode ser muito grande ou o formato não é aceito.';
      } finally {
        this.isStreaming = false;
        this.sending = false;

        if (this.isVoiceEnabled && this.ttsBuffer.trim()) {
          this.speak(this.ttsBuffer);
          this.ttsBuffer = '';
        }
      }

      if (!fullAiContent) {
        this.messages = this.messages.filter((m) => m.id !== aiTempId);
        this.notify.error(this.apiError || 'O serviço da IA está instável. Tente novamente.');
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
