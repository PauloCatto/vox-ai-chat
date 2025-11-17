# 💬 Vox AI Chat: Chat com Gemini e Supabase

Este é um projeto de aplicação de chat construído com **Angular**, utilizando o **Supabase** como serviço de *backend* (autenticação e banco de dados), e a API do **Gemini** (Google AI) para o processamento e geração de respostas inteligentes.

## ✨ Ideia do Projeto

O principal objetivo é criar uma experiência de chat moderna e funcional, onde os usuários possam interagir de forma fluida com uma **Inteligência Artificial** robusta. A arquitetura atual suporta:

* **Interações de Chat:** Conversas dinâmicas e em tempo real com a IA.
* **Gerenciamento de Conversas:** Criação, visualização e persistência do histórico de chats por usuário.
* **Respostas Inteligentes:** Utilização do modelo Gemini para fornecer conteúdo contextual e de alta qualidade.
* **Autenticação Completa:** Gerenciamento seguro de usuários via Supabase (Login, Cadastro, Reset de Senha).

## 🚀 Status do Deploy

O projeto está atualmente em fase de desenvolvimento e pode ser acessado em:

* **Link da Aplicação (Vercel):** [https://vox-ai-chat.vercel.app/login](https://vox-ai-chat.vercel.app/login)

> *Este deploy é provisório. O projeto está em desenvolvimento ativo, e o ambiente definitivo pode ser alterado.*

---

## 📸 Visualização do Projeto (Screenshots)

Confira a aparência da aplicação nas telas de autenticação e chat:

### 1. Tela de Login/Signup
<br>
<img width="1020" height="638" alt="image" src="https://github.com/user-attachments/assets/19a98ee9-cf73-475b-92e0-6531c0312d46" />
<br>

### 2. Interface de Chat
<br>
<img width="1020" height="643" alt="image" src="https://github.com/user-attachments/assets/7ccf123d-534a-4be1-8733-e122d39f40da" />
<br>

---

## 🛠️ Tecnologias Utilizadas

| Categoria | Tecnologia | Uso |
| :--- | :--- | :--- |
| **Frontend** | Angular | Framework principal para a interface do usuário. |
| **BaaS & DB** | Supabase | Autenticação de usuários, gerenciamento de perfis e armazenamento das conversas e mensagens. |
| **Inteligência Artificial** | Google Gemini API | Motor de IA para gerar as respostas do chat. |
| **HTTP** | HttpClient | Comunicação com a API do Gemini. |

## 💡 Próximas Melhorias e Roadmap

O projeto está em constante evolução. As seguintes melhorias estão sendo ativamente implementadas para garantir a qualidade, segurança e uma melhor experiência do usuário:

### 1. 🧑‍💻 Melhoria na Experiência do Usuário (UX)

* **Telas de Autenticação:** Aprimoramento do design e do fluxo de usuário nas telas de **Login**, **Signup** e **Reset/Forgot Password** para torná-las mais intuitivas.
* **Feedback Visual:** Adição de melhores indicadores de carregamento e mensagens de erro/sucesso para todas as ações do usuário.

### 2. 📱 Responsividade e Acessibilidade

* **Layout Mobile:** Implementação de um design responsivo completo para garantir que a aplicação seja totalmente funcional e visualmente agradável em **dispositivos móveis**.

### 3. ✅ Qualidade de Código e Testes

* **Unit Tests:** Criação de testes unitários abrangentes para os serviços (`AuthService`, `ChatService`, `SupabaseService`) e componentes críticos, garantindo a estabilidade e a facilidade de manutenção do código.
* **Refatoração:** Otimização de código para melhorar a performance e a aderência aos padrões de desenvolvimento Angular.
