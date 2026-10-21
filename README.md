# Meritê — Sistema de Mérito Acadêmico

SPA feita com React, TypeScript, Vite e React Router, conectada à API REST Java/Spring Boot.

## Requisitos
- Node.js 20+
- npm
- Backend Spring Boot opcional durante o desenvolvimento

## Executar
```bash
npm install
cp .env.example .env
npm run dev
```
No Windows PowerShell, caso `cp` não funcione:
```powershell
Copy-Item .env.example .env
```

## Build de produção
```bash
npm run build
npm run preview
```

## Login
O login valida as credenciais no backend. Selecione o perfil correspondente à conta; o servidor retorna o perfil autenticado e a aplicação valida essa escolha. Sessões persistem enquanto o token armazenado estiver válido.

## Backend REST
O backend fica em `moedas/` e usa Spring Boot, MySQL e DAOs JDBC explícitos (`MeritDao` / `JdbcMeritDao`), sem Spring Data repositories. O schema é criado por `schema.sql` na inicialização; as três instituições usadas no formulário são inseridas automaticamente.

Configure `DB_URL`, `DB_USERNAME` e `DB_PASSWORD` no ambiente e inicie o MySQL. Para envio de e-mails, configure `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` e, opcionalmente, `MAIL_FROM`. Inicie a API em `moedas/` com `.\mvnw.cmd spring-boot:run` no Windows. No `.env` da SPA, configure `VITE_API_URL=http://localhost:8080/api`.
Crie o banco antes da primeira inicialização (ou configure `DB_URL` para um banco existente):
```sql
CREATE DATABASE IF NOT EXISTS sistema_merito CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

As contas de professor são vinculadas a um cadastro institucional prévio. Antes de cadastrar um professor pela API, uma pessoa administradora deve inserir seu CPF, nome, departamento e instituição em `pre_registered_teachers`. Exemplo:
```sql
INSERT INTO pre_registered_teachers(cpf,name,department,institution_id)
SELECT '12345678900','Nome do Professor','Computação',id
FROM institutions WHERE name='Universidade Metropolitana';
```
O nome e departamento dessa lista são os dados oficiais gravados na conta; o professor define e-mail e senha no cadastro.

Depois que os alunos e professores tiverem contas, a instituição deve criar as turmas e fazer as associações em `classroom_students` e `classroom_teachers`. Transferências só são aceitas se os dois alunos estiverem na mesma turma com ao menos um professor em comum; um desses professores pode aprovar ou recusar a solicitação. Esse provisionamento fica sob controle da instituição.

O backend implementa cadastro e autenticação (`POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`), consulta de instituições e estatísticas públicas, perfis e extratos, consulta de alunos e professores compartilhados, premiações, transferências, catálogo e cadastro de vantagens, resgates, cupons e validação pelo parceiro. As telas consomem esses endpoints e as operações privadas exigem um token de sessão no cabeçalho `Authorization`. O token tem validade de sete dias e o logout o revoga.

Os professores recebem automaticamente 1.000 moedas por semestre civil (janeiro-junho e julho-dezembro). A rotina diária e o acesso do professor garantem o crédito uma única vez por semestre, somado ao saldo não utilizado. Premiações e resgates são descontados atomicamente; transferências reservam o saldo no envio e devolvem as moedas em caso de recusa. E-mails de reconhecimento e de cupons são enviados pelo servidor SMTP configurado.

## Regras de negócio demonstradas
- Professor recebe crédito semestral de 1.000 moedas, acumulável no saldo.
- Professor só pode premiar aluno se tiver saldo suficiente; justificativa obrigatória.
- Transferência entre alunos exige saldo suficiente, destinatário diferente e ao menos um professor em comum na mesma turma.
- Transferência entre alunos fica pendente até aprovação de professor compartilhado. Sem professor em comum, o envio é bloqueado.
- Resgate de vantagem desconta moedas e gera código de cupom para conferência presencial.
- O envio real de e-mails (notificação e cupons) deve ser feito pelo backend, não pela SPA.

## Estrutura
```text
src/
  components/       componentes compartilhados
  context/          sessão autenticada
  lib/api.ts        cliente Axios
  pages/            telas por perfil
  services/         chamadas REST tipadas
  types/            tipos de domínio
```









Classe:
Usuario
senha login
Metodo: Autenticar

Classe:
Aluno:
Nome,
email,
CPF
RG
Endereco,
Instituicão de Ensino
curso
moedas
Métodos
consultarExtrato
verTransacao()
trocarMoedas()
resgatatVantagem()


Classe
Professor
nome
 CPF
moedas
departamento

Empresa
Nome
métodos
Cadastrar()


Vantagem
valorMoedas

incluirVantagem()
cadastrarFoto()


Semestre
inicio
Fim
distribuirMoedas()


Transação
Codigo
Histórico
data
valor
verHIstorico()

Turma
Código
QtdAluno
notificarAluno()

Envio
mensagem
notificar Aluno()