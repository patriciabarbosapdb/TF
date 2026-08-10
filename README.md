# TF — versão com base de dados

Esta versão usa Supabase para:
- autenticação por email + password;
- chat partilhado em tempo real;
- referências partilhadas;
- notas, livros e tarefas privadas por utilizador;
- player de música local disponível em todas as páginas.

## Configuração

1. Cria um projeto no Supabase.
2. Abre **SQL Editor** e executa `supabase.sql`.
3. Em **Authentication > Users**, cria as duas contas:
   - LadyWhite
   - LadyBlack
4. Copia os UUIDs dessas contas.
5. No fim do `supabase.sql`, executa os dois `insert` comentados, trocando os UUIDs.
6. Abre **Project Settings > API** e copia:
   - Project URL
   - anon/publishable key
7. Abre `script.js` e preenche:
   `SUPABASE_URL`
   `SUPABASE_ANON_KEY`
   `LOGIN_EMAILS.LadyWhite`
   `LOGIN_EMAILS.LadyBlack`
8. Publica os 3 ficheiros (`index.html`, `style.css`, `script.js`) no teu repositório.

## Importante sobre privacidade

O repositório GitHub pode ser **Private**, mas a app precisa de estar acessível para os dois telemóveis. A segurança dos dados vem principalmente da autenticação e das políticas RLS do Supabase.

As tabelas `notes`, `books` e `tasks` só permitem que o utilizador autenticado veja/alterе as próprias linhas. `messages` e `references` são partilhadas entre utilizadores autenticados.

## Música

Nesta versão, as músicas adicionadas pelo botão são ficheiros locais do dispositivo e não são sincronizadas entre os dois telemóveis. O player continua disponível enquanto se navega pela app.

Para música sincronizada entre os dois dispositivos, a próxima etapa é adicionar Supabase Storage e uma tabela de playlists.
