# 💬 Vox AI Agent | Angular 17 • Gemini 2.5 • Supabase

[![Angular](https://img.shields.io/badge/Angular-17.3-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vox-ai-chat.vercel.app/login)

O **Vox AI Agent** é uma aplicação web de alta performance desenvolvida com **Angular 17**, integrando o **Supabase** como BaaS (Autenticação, PostgreSQL com RLS e Deno Edge Functions) e a API do **Google Gemini 2.5 Flash** como motor para um **Agente Autônomo com Loop ReAct e Function Calling**.

---

## 🌟 Destaques de Arquitetura & Engenharia (Visão Geral para Recrutadores)

Este projeto foi construído seguindo boas práticas avançadas de engenharia de software e segurança:

1. **🛡️ Segurança & Autenticação de Endpoints (Zero-Trust):** O consumo da IA passa por um proxy seguro hospedado em **Supabase Deno Edge Functions**. Nenhuma API Key é exposta no cliente. A Edge Function valida os tokens **JWT Bearer** do usuário antes de repassar a requisição ao Gemini.
2. **🔄 Agente Autônomo com Function Calling (ReAct Loop):** A IA decide autonomamente quando invocar ferramentas externas (ex: consultar hora local, clima ou cálculos matemáticos) e sintetiza o resultado em tempo real.
3. **📜 Schema de Banco de Dados Versionado (Migrations & RLS):** Histórico de conversas e perfis gerenciados via PostgreSQL no Supabase com isolamento multi-tenant garantido por **Row Level Security (RLS)** e migrações SQL versionadas em `supabase/migrations/`.
4. **⚙️ Esteira CI/CD Automatizada:** GitHub Actions configurado para linting, checagem de tipos, testes unitários automatizados (`Karma/Jasmine`) e validação de build de produção.
5. **🎙️ Speech-to-Text & Text-to-Speech:** Integração nativa com a Web Speech API para ditado de áudio e sintetização de voz do agente em tempo real.

---

## 🛠️ Stack Técnica e Arquitetura

| Categoria | Tecnologia | Implementação |
| :--- | :--- | :--- |
| **Frontend** | **Angular 17** | Componentes Standalone modulares, RxJS e arquitetura Reativa. |
| **Backend & Banco** | **Supabase Postgres** | PostgreSQL com RLS, Triggers e Índices de Performance. |
| **Autenticação** | **Supabase Auth / Google OAuth2** | Autenticação via Email/Senha e Social Login com Google. |
| **Edge Compute** | **Deno Edge Functions** | Proxy de IA com validação de JWT e cabeçalhos CORS restritos. |
| **Inteligência Artificial** | **Google Gemini 2.5 Flash** | Agente ReAct com suporte a Streaming, Visão Multimodal e Tools. |
| **DevOps & QA** | **GitHub Actions / Prettier** | Automação de CI, cobertura de testes e padronização de código. |

---

## 🔄 Fluxo de Execução do Agente Autônomo (ReAct Loop)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Usuário
    participant Client as 🅰️ Angular 17 App
    participant Edge as ⚡ Supabase Edge Function (JWT Auth)
    participant Gemini as 🧠 Gemini 2.5 Flash API
    participant DB as 🐘 Supabase Postgres (RLS)

    User->>Client: Envia mensagem ("Qual o clima em SP?")
    Client->>DB: Salva mensagem do usuário
    Client->>Edge: POST /gemini-proxy (Header: Authorization Bearer JWT)
    Edge->>Edge: Valida token JWT do usuário via Supabase Auth
    Edge->>Gemini: Stream Request (tools: [get_weather, calculate_math, get_time])
    Gemini-->>Edge: FunctionCall ("get_weather", { location: "São Paulo" })
    Edge-->>Client: Chunk Function Call
    Client->>Client: Executa Tool localmente (get_weather)
    Client->>Edge: Envia resultado da Tool no histórico de execução
    Edge->>Gemini: Re-invoca Gemini com resposta da ferramenta
    Gemini-->>Edge: Text Stream Chunk ("O clima em SP é 25°C ensolarado")
    Edge-->>Client: Stream Chunks (Efeito Datilografia)
    Client->>DB: Salva mensagem da assistente no histórico
    Client->>User: Exibe resposta final + Áudio Text-to-Speech
```

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: `v20.x` ou superior
- **npm**: `v10.x` ou superior
- **Angular CLI**: `v17.x`

### Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/PauloCatto/vox-ai-chat.git
cd vox-ai-chat

# 2. Instalar as dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
# Acesse em http://localhost:4200
```

### 🧪 Executando Testes Unitários

```bash
# Executar testes unitários com relatório de Cobertura (Code Coverage)
npm run test:cov
```

---

## 📸 Visualização da Interface

### 1. Autenticação e Social Login
*Interface de entrada com suporte a credenciais padrão e Login via Google (OAuth2).*
<br>
<img width="1350" height="628" alt="login" src="https://github.com/user-attachments/assets/07fd2c4a-afe3-4333-a7a0-2535b6322f9a" />

<br>

### 2. Gestão de Conversas (CRUD)
*Demonstração do chat em tempo real, edição de títulos e confirmação de exclusão.*
<br>
<img width="1345" height="638" alt="image" src="https://github.com/user-attachments/assets/11681255-8612-4ec2-9c9e-def3fabfdfa6" />

<br>

### 3. Evidência de Cobertura de Testes (QA)
*Relatório de cobertura comprovando a saúde técnica do projeto.*
<br>
<img width="1019" height="681" alt="tests" src="https://github.com/user-attachments/assets/457dbe6c-8eea-498b-a4fd-80fd4ad412dd" />

<br>

---

## 🌐 Deploy e Acesso

- **Aplicação em Produção (Vercel):** [vox-ai-chat.vercel.app](https://vox-ai-chat.vercel.app/login)

---

*Desenvolvido por **Paulo Catto**.*
