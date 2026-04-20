# 💬 Vox AI Agent | Angular • Gemini 2.5 • Supabase

Esta é uma aplicação de alta performance desenvolvida com **Angular**, integrando o **Supabase** como ecossistema de backend (Autenticação e PostgreSQL) e a API do **Gemini (Google AI)** como motor para um **Agente Autônomo Avançado**.

---

## 🚀 Visão Geral do Projeto

O foco principal do desenvolvimento foi criar uma arquitetura escalável e reativa, onde a IA não atua apenas como um Chatbot estático, mas como um **Agente Inteligente**. Através da customização do fluxo de requisições com um *Agentic Loop* e *Function Calling (Tools)*, o Vox AI descobre dados em tempo real e executa códigos internamente antes de devolver a resposta, garantindo velocidade contínua via Streaming e controle da alucinação.

### Principais Funcionalidades
* **Agente Autônomo (Function Calling):** Integração profunda com o Gemini 2.5 Flash permitindo que o modelo invoque funções como descobrir a hora certa local, consultar o clima via mocks/APIs e resolver fórmulas matemáticas complexas autonomamente através de um *Loop ReAct*.
* **Streaming Assíncrono:** Retorno de mensagens visuais com efeito datilografia perfeitamente gerenciado juntamente com as "paradas invisíveis" do modelo durante a execução das ferramentas do Agente.
* **Persistência e Gestão de Dados (CRUD):** Gerenciamento completo dos históricos de conversa atrelados aos usuários (Postgres Supabase). Controle total para criar, **editar títulos** dinamicamente e **excluir chats** com modais de confirmação na UI.
* **Gestão de Identidade Moderna:** Fluxo de autenticação moderno via Auth Supabase, suportando Email/Senha clássicos e **Social Login com Google (OAuth2)** para um Onboarding sem fricção.
* **Speech-to-Text & Text-to-Speech:** Funcionalidades de voz nativas da WebAPI implementadas para ditado via microfone e sintetização da voz do próprio modelo lendo as respostas em tempo real.

---

## 🛠️ Stack Técnica e Arquitetura

| Categoria | Tecnologia | Implementação |
| :--- | :--- | :--- |
| **Frontend** | **Angular 17** | Framework com componentes standalone modulares e gerenciamento reativo (RxJS). |
| **BaaS / Banco** | **Supabase** | PostgreSQL com RLS para histórico seguro de conversas unificado ao usuário JWT. |
| **Autenticação** | **Google OAuth2** | Integração via GoTrue de login unificado para segurança escalável. |
| **Mente do Agente** | **Google Gemini Flash** | Loop autônomo com *Function/Tool Calling*. |
| **Comunicação** | **Fetch/Streams** | Consumo robusto otimizado para *Chunk Streaming* com decodificação na árvore Angular. |

---

## 🧪 Qualidade e Desenvolvimento (QA)

O ciclo de desenvolvimento priorizou a confiabilidade do código. A aplicação conta com uma suíte de **testes unitários** que validam as regras de negócio nos serviços e componentes críticos.

### Cobertura de Código (Code Coverage)
Monitoramos métricas rigorosas para garantir a estabilidade do sistema:
* **Statements & Branches:** Validação de todos os caminhos lógicos do código.
* **Functions & Lines:** Garantia de que a execução do código atinge os níveis esperados de cobertura.

> **Nota:** O relatório de coverage é gerado automaticamente para guiar a evolução técnica e refatoração do sistema.

---

## 📸 Visualização da Interface

### 1. Autenticação e Social Login
*Interface de entrada segura com suporte a credenciais padrão e Login via Google.*
<br>
<img width="1350" height="628" alt="login" src="https://github.com/user-attachments/assets/07fd2c4a-afe3-4333-a7a0-2535b6322f9a" />
<br>
### 2. Gestão de Conversas (CRUD)
*Demonstração da edição de títulos e modais de confirmação para exclusão, garantindo uma gestão de dados segura.*
<br>
<img width="1345" height="638" alt="image" src="https://github.com/user-attachments/assets/11681255-8612-4ec2-9c9e-def3fabfdfa6" />
<br>
### 3. Evidência de Testes
*Relatório de cobertura comprovando a saúde técnica do projeto.*
<br>
<img width="1019" height="681" alt="tests" src="https://github.com/user-attachments/assets/457dbe6c-8eea-498b-a4fd-80fd4ad412dd" />

<br>

---

## 🌐 Deploy e Acesso

O projeto está otimizado e disponível para demonstração:
* **Link da Aplicação:** [vox-ai-chat.vercel.app](https://vox-ai-chat.vercel.app/login)

---
*Desenvolvido por Paulo Catto.*
