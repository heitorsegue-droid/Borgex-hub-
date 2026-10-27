# Borgex Egg Notifier — versão inicial

O bot publica alertas com:
- nome do pet
- raridade (Divine, Eternal ou Secret)
- local/bioma do spawn
- renda por segundo
- horário do spawn
- tempo decorrido desde o spawn

**Importante:** este projeto não descobre spawns sozinho. Para alertas reais, é necessário configurar `FEED_URL` com uma fonte JSON verdadeira, confiável e autorizada. Não invente a URL do feed. Sem fonte conectada, apenas os comandos e o alerta demonstrativo funcionam.

## Configuração
1. Crie um bot em https://discord.com/developers/applications.
2. Ative os comandos e gere um convite com `bot` e `applications.commands`. Conceda somente View Channels, Send Messages e Embed Links.
3. Copie `.env.example` para `.env` e preencha as variáveis no serviço de hospedagem Node.js.
4. Defina `CHANNEL_ID` como o ID do canal que receberá os alertas.
5. Execute `npm install` e `npm start`.
6. Teste com `/ping` e `/alerta-teste`.

## Formato esperado do feed
```json
[
  {
    "id": "event-123",
    "rarity": "Divine",
    "pet": "Nome real do pet",
    "location": "Nome real do bioma",
    "incomePerSecond": "$1B/s",
    "spawnedAt": "2026-10-27T16:20:00-03:00"
  }
]
```
Os valores acima são apenas exemplo de estrutura, não um spawn real. O horário deve conter fuso horário para que o cálculo do tempo decorrido seja correto.

## Segurança
Nunca publique o token do bot nem envie para terceiros. Se ele vazar, regenere no Developer Portal. Não instale executáveis/APKs desconhecidos nem use sua senha do Roblox em sites de alertas.
