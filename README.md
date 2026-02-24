# 💬 Vox AI Chat | Angular • Gemini • Supabase

Esta é uma aplicação de chat de alta performance desenvolvida com **Angular**, integrando o **Supabase** como ecossistema de backend (Autenticação e PostgreSQL) e a API do **Gemini (Google AI)** para processamento de linguagem natural e geração de respostas contextuais.

---

## 🚀 Visão Geral do Projeto

O foco principal do desenvolvimento foi criar uma arquitetura escalável e reativa, onde a experiência do usuário é priorizada através de uma interface fluida e um gerenciamento de estado eficiente.

### Principais Funcionalidades
* **Orquestração de IA:** Integração direta com o modelo Gemini para fornecer respostas inteligentes e contextuais.
* **Persistência e Gestão de Dados (CRUD):** Gerenciamento completo do histórico de conversas. O usuário possui controle total para criar, **editar títulos** e **excluir chats** através de modais de confirmação, garantindo uma organização personalizada e segura.
* **Gestão de Identidade Moderna:** Fluxo de autenticação robusto via Supabase Auth, suportando Login/Cadastro tradicional e **Autenticação Social com Google (OAuth2)** para uma experiência de acesso agilizada.
* **Experiência do Usuário (UX):** Implementação de modais interativos para ações críticas e edição *inline*, otimizando o fluxo de navegação e usabilidade.

---

## 🛠️ Stack Técnica e Arquitetura

| Categoria | Tecnologia | Implementação |
| :--- | :--- | :--- |
| **Frontend** | **Angular** | Framework principal com foco em componentes modulares e serviços reativos. |
| **BaaS / Banco** | **Supabase** | PostgreSQL para armazenamento e JWT para sessões de usuário seguras. |
| **Autenticação** | **Google OAuth2** | Integração de login social para facilitar o onboarding de usuários. |
| **Inteligência** | **Google Gemini** | Engine de IA para processamento e geração de conteúdo. |
| **Comunicação** | **HttpClient** | Consumo de APIs REST com tratamento de erros e interceptores. |

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
