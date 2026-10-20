# Atlas CNPJ

Consulta pública e gratuita de dados cadastrais, fiscais e societários de empresas brasileiras, a partir de um CNPJ **numérico ou alfanumérico**.

**Site no ar:** <https://atlas-cnpj-consulta.fancy-alder-5711.chatgpt.site>

Aplicação 100% estática (HTML + CSS + JavaScript puro): sem framework, sem etapa de build, sem backend, sem banco de dados e sem chaves de API. O navegador consulta as APIs públicas diretamente.

---

## Sumário

- [O que o Atlas CNPJ mostra](#o-que-o-atlas-cnpj-mostra)
- [Como funciona](#como-funciona)
- [Fontes de dados](#fontes-de-dados)
- [Campos oficiais x campos derivados](#campos-oficiais-x-campos-derivados)
- [Validação de CNPJ (numérico e alfanumérico)](#validação-de-cnpj-numérico-e-alfanumérico)
- [Executar localmente](#executar-localmente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes e validação](#testes-e-validação)
- [Privacidade e segurança](#privacidade-e-segurança)
- [Limitações conhecidas](#limitações-conhecidas)
- [Publicação](#publicação)
- [Roadmap](#roadmap)
- [Documentação complementar](#documentação-complementar)

---

## O que o Atlas CNPJ mostra

| Seção | Conteúdo |
|---|---|
| **Dados cadastrais** | Razão social, nome fantasia, data de abertura, situação cadastral e data, porte, natureza jurídica, capital social, regime tributário (quando a fonte informa), código IBGE do município |
| **Atividades econômicas** | CNAE principal e CNAEs secundários |
| **Inscrições estaduais** | IEs do SINTEGRA com UF, tipo (Principal / Outra UF), estado e data de atualização; indicador de contribuinte ICMS |
| **SUFRAMA** | Inscrições, situação, datas, aprovação e incentivos fiscais, consultados automaticamente pelo CNPJ |
| **Quadro societário** | Sócios e qualificações |
| **Endereço e contato** | Endereço completo, mapa incorporado (clicável, abre no Google Maps), telefone e e-mail |

Recursos de uso:

- Máscara de CNPJ durante a digitação e validação dos dígitos verificadores **antes** de chamar a API.
- Botão **“Copiar”** individual em cada informação da ficha, além de cópia dedicada do CNPJ.
- **Histórico local** das últimas 25 consultas (CNPJ, razão social, nome fantasia e data), com nova consulta em um clique e limpeza total.
- Impressão da ficha pelo navegador.
- Layout responsivo (desktop e celular), com estados de carregamento, erro, resultado vazio e indisponibilidade.
- Acessibilidade: labels, `aria-live`, nomes acessíveis e navegação por teclado.

## Como funciona

```text
Usuário digita o CNPJ
  → normaliza (maiúsculas, remove pontuação) e valida os dígitos verificadores
  → GET https://publica.cnpj.ws/cnpj/{cnpj}      (ficha principal e IEs)
  → GET https://open.cnpja.com/office/{cnpj}     (SUFRAMA, em segundo plano)
  → transforma as respostas e renderiza a ficha
  → grava um resumo no histórico local (localStorage)
```

Se a consulta SUFRAMA falhar, os demais dados da empresa continuam sendo exibidos. Resultados de SUFRAMA de uma pesquisa anterior nunca são mostrados para um CNPJ diferente.

## Fontes de dados

| Fonte | Uso | Observações |
|---|---|---|
| [CNPJ.ws (API pública)](https://publica.cnpj.ws) | Dados cadastrais, CNAE, sócios, regime e inscrições estaduais | Limite de **3 consultas por minuto por IP**; HTTP 429 é tratado com mensagem clara |
| [CNPJá (API aberta)](https://open.cnpja.com) | Inscrições e incentivos SUFRAMA | Gratuita, sem chave; pode responder alguns instantes depois da ficha principal |
| Google Maps (embed) | Mapa do endereço | Abre a mesma busca no Google Maps ao clicar |
| Google Fonts | Tipografia (DM Sans e Manrope) | Exige rede; há fallback local do navegador |

Respostas HTTP tratadas: `200` (renderiza), `404` (CNPJ não encontrado), `429` (limite gratuito atingido), demais falhas (fonte indisponível) e erro de rede/CORS (mensagem de conexão).

## Campos oficiais x campos derivados

O app **nunca inventa** IE, regime tributário, situação cadastral ou SUFRAMA. Quando a fonte não retorna um campo, a ficha exibe **“Não informado”**.

Dois indicadores são **classificações calculadas pelo app**, não dados oficiais diretos:

- **Tipo de IE**: `Principal` quando a UF da IE é igual à UF do estabelecimento; `Outra UF` caso contrário.
- **Contribuinte ICMS**: `Sim` se existe ao menos uma IE ativa; `Não` se nenhuma IE ativa foi retornada.

Observações importantes:

- A API informa a atividade da IE apenas como booleano. O app **não afirma “Baixada”**, pois não há fonte específica para isso.
- O regime tributário mostra MEI, Simples ou histórico quando a API fornece. **Não se infere** Lucro Real ou Presumido.

## Validação de CNPJ (numérico e alfanumérico)

- 14 caracteres após normalização: 12 primeiras posições alfanuméricas (`A–Z`, `0–9`) e 2 últimas numéricas (dígitos verificadores).
- Letras são convertidas para maiúsculas; pontuação é removida antes da consulta.
- Dígitos verificadores por módulo 11, com valor de cada caractere `charCodeAt(0) − 48` (compatível com CNPJs numéricos existentes).
- Pesos do 1º dígito: `5 4 3 2 9 8 7 6 5 4 3 2`; do 2º: `6 5 4 3 2 9 8 7 6 5 4 3 2`.
- Sequências repetidas (ex.: `00.000.000/0000-00`) são rejeitadas.

| Entrada | Resultado |
|---|---|
| `33.000.167/0001-01` | válido |
| `19.131.243/0001-97` | válido |
| `17.687.734/0001-93` | válido |
| `12.ABC.345/01DE-35` | válido (alfanumérico) |
| `33.000.167/0001-02` | inválido |
| `00.000.000/0000-00` | inválido |

## Executar localmente

> Não abra `dist/index.html` por `file://`: as APIs dependem de CORS e precisam de uma origem HTTP.

Windows (PowerShell):

```powershell
py -m http.server 8000 --directory dist
```

Linux / macOS:

```bash
python3 -m http.server 8000 --directory dist
```

Depois acesse <http://localhost:8000>.

Não há `npm install` nem build. Basta um servidor de arquivos estáticos.

## Estrutura do projeto

```text
atlas-cnpj/
├── README.md            # este arquivo
├── AGENTS.md            # regras do projeto para agentes/colaboradores
├── HANDOFF.md           # contexto detalhado, histórico e checklist de regressão
├── .gitignore
├── .openai/
│   └── hosting.json     # identidade do Site e diretório estático
├── tests/
│   └── validador.test.mjs  # testes do validador de CNPJ (node --test)
└── dist/                # tudo o que é publicado
    ├── index.html       # estrutura, formulário, estados e ficha
    ├── styles.css       # tema, responsividade, impressão
    └── app.js           # validação, chamadas às APIs, transformação e interações
```

## Testes e validação

Validação mínima antes de qualquer alteração ser enviada:

```bash
node --check dist/app.js
git diff --check
node --test tests/validador.test.mjs
```

O teste automatizado do validador (Node 18+, sem dependências) cobre CNPJs numéricos e alfanuméricos válidos e inválidos, a normalização e a máscara. Como o `app.js` é um script de navegador, o teste extrai as funções puras do código-fonte em vez de importá-las.

Validação manual (com rede): consulte `33.000.167/0001-01` e confira razão social, situação, endereço, CNAE, IEs, SUFRAMA e os erros 404/429. Um CNPJ com SUFRAMA conhecido para teste é `07.526.557/0116-59`. O checklist completo está no [HANDOFF.md](HANDOFF.md).

Ao mexer no validador, faça regressão numérica com a tabela da seção anterior para não quebrar o suporte a CNPJs numéricos.

## Privacidade e segurança

- Sem backend: nenhuma consulta passa por servidor próprio nem é armazenada remotamente.
- O histórico fica apenas no `localStorage` do navegador do usuário (máximo de 25 itens) e pode ser limpo na própria interface.
- Sem chaves, tokens ou credenciais no código. **Não adicione segredos ao repositório.**
- Todo conteúdo vindo da API é escapado (`escapeHtml`) antes de ser usado em `innerHTML`.
- Links externos usam `noreferrer` quando aplicável; produção usa HTTPS.
- Não contorne CAPTCHAs, bloqueios ou limites das APIs.

## Limitações conhecidas

- Limite de 3 consultas por minuto por IP na API pública do CNPJ.ws; sem SLA nem garantia de atualização imediata.
- Os dados do SINTEGRA dependem da consolidação feita pelo fornecedor.
- Não é possível distinguir oficialmente IE inativa de baixada.
- Lucro Real e Presumido normalmente não estão disponíveis.
- A fonte pode ainda não ter registros alfanuméricos reais.
- SUFRAMA depende de uma segunda fonte gratuita e pode demorar alguns instantes.
- O histórico não sincroniza entre navegadores/dispositivos e some se os dados do site forem apagados.
- Sem backend, não há cache compartilhado.

## Publicação

O Site é **público** e deve permanecer público por padrão. A publicação usa o fluxo oficial de Sites (credencial temporária, envio, pacote, salvar versão e implantar), preservando o `project_id` de `.openai/hosting.json` e reutilizando a URL atual. Não registre outro Site para este projeto e nunca persista credenciais temporárias. Detalhes em [HANDOFF.md](HANDOFF.md).

## Roadmap

1. ~~Testes automatizados do validador de CNPJ~~ (concluído).
2. Cache/backend, caso o limite da API se torne um problema.
3. Monitorar disponibilidade e defasagem dos dados SUFRAMA.
4. Fonte que diferencie IE inativa de baixada.
5. Cabeçalhos na lista de IEs.
6. Fontes tipográficas locais.

## Documentação complementar

- [AGENTS.md](AGENTS.md): regras de arquitetura, dados, interface e publicação.
- [HANDOFF.md](HANDOFF.md): visão geral, campos consumidos, histórico do projeto, regressão e próximos passos.

> Atlas CNPJ é um projeto independente de consulta a dados públicos. Os dados vêm de terceiros e não substituem certidões ou consultas oficiais.
