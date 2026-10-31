# Rifa Solidária Márcia Elizeu

Site estático para uma rifa solidária de 500 números, com reserva em tempo real, confirmação manual do Pix e painel restrito do gerente.

## Importante

O projeto precisa de um projeto Firebase configurado antes de funcionar online. Não publique até substituir todos os campos `COLOQUE_...` / `SEU-PROJETO` e testar as regras. Nunca coloque senha do gerente ou chave privada de servidor no HTML/JavaScript.

## 1. Criar o projeto Firebase

1. Abra https://console.firebase.google.com/ e crie um projeto.
2. Em **Authentication > Sign-in method**, ative **E-mail/senha**.
3. Em **Authentication > Users**, crie a conta do gerente.
4. Copie o **UID** da conta do gerente.
5. Em **Realtime Database**, crie um banco de dados e copie a URL mostrada.
6. Em **Configurações do projeto > Seus apps**, registre um app Web e copie a configuração.

## 2. Configurar o site

Edite `firebase-config.js`:
- preencha `apiKey`, `authDomain`, `databaseURL`, `projectId` e `appId`;
- troque `MANAGER_UID` pelo UID real do gerente;
- troque `PIX_KEY` pela chave Pix que será divulgada;
- troque `RAFFLE_PRICE` pelo valor de cada número.

Não use a senha do gerente nesse arquivo. A chave Pix é uma informação pública de pagamento, não uma credencial de acesso.

## 3. Configurar as regras do banco

1. Abra **Realtime Database > Rules**.
2. Cole o conteúdo de `database.rules.json`.
3. Substitua as duas ocorrências de `COLOQUE_O_UID_DO_GERENTE` pelo UID real do gerente.
4. Publique as regras e teste a reserva com duas janelas/navegadores diferentes.

As regras permitem leitura pública do estado dos números, criação de reserva apenas quando o número ainda não existe e alterações administrativas apenas para o UID autorizado. O uso de transação no site ajuda a evitar que duas pessoas reservem o mesmo número simultaneamente. Revise as regras no Firebase Rules Playground antes de divulgar.

## 4. Publicar no GitHub Pages

1. Envie os arquivos deste projeto para a raiz do repositório `RIFASOLIDARIAMARCIA`.
2. No GitHub, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main` e a pasta `/(root)`, depois clique em **Save**.
5. Aguarde a publicação e abra o link que aparecer na seção Pages.

Guia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## O que o site faz

- Exibe os números de 001 a 500 e os estados disponíveis, reservados e confirmados.
- Atualiza a grade em tempo real usando Firebase Realtime Database.
- Permite selecionar vários números e solicitar reserva com nome e WhatsApp.
- Tenta reservar cada número de forma atômica; se outra pessoa já o pegou, informa que está ocupado.
- Permite que o gerente faça login, reserve números manualmente, confirme o Pix e libere reservas.

## Antes de divulgar

- Defina valor, chave Pix e regras do sorteio (prêmio, data, método de sorteio e condições).
- Confirme com Márcia/responsável quais dados pessoais podem ser exibidos e como serão usados.
- Teste em celular e computador, inclusive tentativa de reservar o mesmo número ao mesmo tempo.
- O status “Confirmado” é uma confirmação manual do gerente; o site não verifica pagamentos no banco.
- Não armazene comprovantes ou dados bancários sensíveis no banco público.
