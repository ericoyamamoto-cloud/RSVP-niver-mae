# 🎈 Agente & Sistema de Gestão de Convites RSVP (Google Sheets + WhatsApp)

Este repositório contém uma **Aplicação Web completa, moderna e responsiva** para gerenciar convites e confirmação de presença (RSVP) em eventos (Aniversários, Formaturas, Festas Sociais, etc.), totalmente integrada com o **Google Sheets** e com envio facilitado via **WhatsApp**.

---

## 🌟 Funcionalidades Principais

1. **Página do Convite (RSVP do Convidado)**:
   - Design moderno em modo escuro com estética festiva (gradientes vibrantes, glassmorphism e animações de confete).
   - **Reconhecimento por Link Individual**: Ao acessar com `?id=1` ou `?name=Joao`, o site já identifica o convidado.
   - **Busca por Nome ou Celular**: Caso o convidado acesse o link genérico do site.
   - **Contador Regressivo**: Mostra dias, horas, minutos e segundos até a data do evento.
   - **Detalhes do Evento**: Data, horário, local com link direto para o Google Maps/Waze e cartão de **Observações Especiais** (Traje, chave PIX / lista de presentes, avisos).
   - **Formulário de Confirmação**:
     - Presença: *Sim, com certeza!* ou *Não poderei ir*.
     - Seletor de Acompanhantes (0 a 5 pessoas) com campos automáticos para preencher os nomes dos acompanhantes.
     - Campo livre para mensagem ou recado ao anfitrião.

2. **Painel do Anfitrião (Admin Dashboard)**:
   - **Métricas em Tempo Real**: Total de convites, confirmados, recusados, pendentes e **Total de Pessoas Confirmadas** (convidados + acompanhantes).
   - **Fila de Envio do WhatsApp ("Enviar e Próximo")**:
     - Identifica os convidados pendentes de envio.
     - Monta a mensagem personalizada com o nome e o link individual do convidado.
     - Com apenas um clique, abre o conversa do WhatsApp Web/App com o texto pronto e marca o convite como enviado!
   - **Gestão de Convidados**: Tabela com busca, filtros por status e botões de edição rápida.
   - **Configurações do Evento**: Form para alterar Tipo de evento, Título, Data, Hora, Local, Observações e Modelo da Mensagem de WhatsApp.
   - **Tutorial de Conexão com Google Sheets**: Código em 1 clique para colar no Apps Script.

---

## 🚀 Como Conectar a sua Planilha do Google Sheets (Zero Custos)

1. Abra a sua planilha no **Google Sheets** (a planilha onde você está cadastrando os celulares e nomes).
2. No menu superior da planilha, clique em **Extensões** &rarr; **Apps Script**.
3. Apague qualquer código existente na tela e cole o conteúdo do arquivo [`code.gs`](file:///c:/Users/erico/OneDrive/Antigravity/RSVP/code.gs).
4. No canto superior direito, clique no botão azul **Implantar** &rarr; **Nova implantação**.
5. Em *Selecione o tipo*, escolha **App da Web**.
6. Em *Quem pode acessar*, selecione **Qualquer pessoa** (Qualquer um).
7. Clique em **Implantar**, autorize o acesso da sua conta Google.
8. Copie a **URL do App da Web** gerada (algo como `https://script.google.com/macros/s/.../exec`).
9. Abra o **Painel do Anfitrião** no seu site, clique em **⚙️ Configurações do Evento** e cole a URL no campo **Webhook do Google Apps Script**.

pronto! Toda vez que um convidado confirmar no site, a sua planilha do Google será atualizada automaticamente em tempo real!

---

## 🌐 Como Hospedar o Site Gratuitamente (R$ 0,00)

Como este projeto é construído em HTML5, Vanilla CSS3 e JavaScript puro (ES6), ele **não exige instalação de Node.js ou servidores pagos**. Ele pode ser hospedado gratuitamente em qualquer uma destas plataformas:

### Opção 1: Vercel (Recomendado - 1 Minuto)
1. Crie uma conta gratuita em [vercel.com](https://vercel.com).
2. Instale o Vercel CLI ou simplesmente suba a pasta deste projeto no GitHub.
3. Clique em **Import Project** na Vercel.
4. Seu site estará no ar instantaneamente com HTTPS e domínio gratuito (ex: `meu-evento.vercel.app`).

### Opção 2: Netlify
1. Crie uma conta em [netlify.com](https://netlify.com).
2. Na aba **Sites**, arraste e solte a pasta deste projeto.
3. Seu site estará publicado em segundos!

### Opção 3: GitHub Pages
1. Crie um repositório no GitHub com os arquivos deste projeto.
2. Em **Settings &rarr; Pages**, selecione a branch `main` e a pasta `/root`.
3. O GitHub publicará seu site em `seu-usuario.github.io/RSVP`.

---

## 📱 Estrutura de Arquivos do Projeto

```
RSVP/
├── index.html               # Página principal (RSVP do Convidado + Painel Admin incorporado)
├── css/
│   ├── main.css             # Sistema de design, gradientes, glassmorphism e animações
│   ├── rsvp.css             # Estilos do cartão do convite, timer regressivo e formulário
│   └── admin.css            # Estilos do painel admin, métricas, tabela e fila de disparo
├── js/
│   ├── sheets.js            # Motor de dados (Google Apps Script API + Fallback de dados locais)
│   ├── rsvp.js              # Lógica do formulário de confirmação, acompanhantes e busca
│   ├── admin.js             # Lógica das métricas, fila guiada de envio do WhatsApp e edições
│   └── app.js               # Inicializador, roteador de telas, timer e confetes
├── code.gs                  # Código pronto para colar no Google Apps Script da planilha
└── README.md                # Manual do projeto e guia de implantação
```
