# Atlas CNPJ — Handoff do projeto

Atualizado em 10 de outubro de 2026.

## 1. Visão geral

O Atlas CNPJ é uma aplicação pública para consultar informações cadastrais e fiscais de empresas brasileiras. O Sintegra WS foi apenas a referência inicial de conteúdo e fluxo; a identidade do produto é própria.

- Site público: https://atlas-cnpj-consulta.fancy-alder-5711.chatgpt.site
- Projeto Sites: appgprj_6ac8c7ea74dc8191898f5ca1f5a2cb03
- Audiência: pública.
- Idioma: português do Brasil.
- Fontes: APIs públicas CNPJ.ws e CNPJá.
- Custo da API: gratuito, sujeito ao limite público.

## 2. Objetivo

Receber um CNPJ e mostrar:

- razão social, nome fantasia e abertura;
- situação cadastral e data;
- porte, natureza jurídica e capital social;
- regime tributário disponível;
- CNAE principal e secundários;
- endereço, código IBGE e contatos;
- quadro societário;
- inscrições estaduais de SINTEGRA/SEFAZ;
- indicador derivado de contribuinte ICMS;
- consulta automática de inscrições SUFRAMA pelo CNPJ;
- ações de cópia e impressão.
- histórico local com CNPJ, razão social e nome fantasia.

## 3. Estrutura

~~~text
atlas-cnpj/
├── AGENTS.md
├── HANDOFF.md
├── .gitignore
├── .openai/
│   └── hosting.json
└── dist/
    ├── index.html
    ├── styles.css
    └── app.js
~~~

- dist/index.html: estrutura, formulário, estados e ficha.
- dist/styles.css: tema, responsividade, impressão e cópia.
- dist/app.js: validação, API, transformação e interações.
- .openai/hosting.json: identidade e diretório estático.
- AGENTS.md: regras para agentes.
- HANDOFF.md: contexto de continuidade.

## 4. Arquitetura técnica

A aplicação é estática e roda no navegador:

~~~text
Usuário
  → valida e normaliza o CNPJ
  → GET https://publica.cnpj.ws/cnpj/{cnpj}
  → transforma a resposta
  → renderiza a ficha
  → GET https://open.cnpja.com/office/{cnpj}
  → exibe automaticamente inscrições, situação e incentivos SUFRAMA
~~~

Não há servidor próprio, banco, login, armazenamento remoto, chave de API, analytics ou agendamento. O navegador consulta CNPJ.ws e CNPJá diretamente. O histórico usa `localStorage`, fica restrito ao navegador/dispositivo e guarda as 25 consultas mais recentes, sem sincronização. Isso elimina infraestrutura, mas mantém dependência de CORS, disponibilidade e limites das fontes.

## 5. Integração

Endpoint:

GET https://publica.cnpj.ws/cnpj/{cnpj}

Limite observado e documentado: 3 consultas por minuto por IP.

- 200: renderiza a ficha.
- 404: CNPJ não encontrado.
- 429: limite gratuito atingido.
- Outras falhas: fonte temporariamente indisponível.
- Erro de rede/CORS: mensagem de conexão.

### Campos consumidos

Raiz:

- razao_social;
- capital_social;
- porte.descricao;
- natureza_juridica.id e descricao;
- socios;
- simples;
- histórico tributário, quando presente.

Estabelecimento:

- cnpj, nome_fantasia e tipo;
- situacao_cadastral e data_situacao_cadastral;
- data_inicio_atividade;
- endereço e contatos;
- cidade.ibge_id;
- atividade_principal e atividades_secundarias;
- inscricoes_estaduais.

### Campos derivados

- Tipo de IE:
  - Principal quando a UF da IE é a UF do estabelecimento.
  - Outra UF nos demais casos.
- Contribuinte ICMS:
  - Sim quando há pelo menos uma IE ativa.
  - Não quando nenhuma IE ativa é retornada.

Esses dois campos são classificações do app, não dados oficiais diretos.

### Regime tributário

O app prioriza regime_tributario ou regimes_tributarios, quando presentes. Como fallback, interpreta Simples/MEI. Sem informação suficiente, exibe “Não informado pela fonte”. Não inferir Lucro Real ou Presumido.

### Consulta SUFRAMA

Endpoint:

GET https://open.cnpja.com/office/{cnpj}

Não exige chave nem inscrição previamente conhecida.

O app consulta automaticamente o endpoint público CNPJá após a resposta principal do CNPJ.ws. O array `suframa` informa números de inscrição, situação cadastral, datas, aprovação e incentivos fiscais. Array vazio é exibido como “Possui inscrição SUFRAMA: Não”. A falha dessa fonte não remove os demais dados da empresa.

## 6. Validação de CNPJ

Aceita CNPJ numérico e alfanumérico.

- 14 caracteres normalizados.
- 12 primeiras posições alfanuméricas.
- Duas últimas posições numéricas.
- Letras convertidas para maiúsculas.
- Pontuação removida antes da consulta.
- Dígitos verificadores por módulo 11.
- Conversão alfanumérica por charCodeAt(0) menos 48.
- Sequências numéricas repetidas são rejeitadas.

Pesos do primeiro dígito:

5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2

Pesos do segundo:

6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2

| Entrada | Resultado |
|---|---|
| 33.000.167/0001-01 | válida |
| 19.131.243/0001-97 | válida |
| 17.687.734/0001-93 | válida |
| 33.000.167/0001-02 | inválida |
| 00.000.000/0000-00 | inválida |
| 12.ABC.345/01DE-35 | válida |

## 7. Recursos entregues

- Busca numérica e alfanumérica.
- Máscara durante digitação.
- Validação antes da API.
- Exemplos rápidos.
- Loading e erros.
- Situação cadastral e data.
- Capital, porte e natureza jurídica.
- Razão social, fantasia e abertura.
- Regime disponível.
- Código IBGE.
- Indicador ICMS Sim/Não.
- CNAE principal e até sete secundários.
- IEs com UF, tipo derivado, estado e atualização.
- Sócios e qualificações.
- Endereço, mapa, telefone e e-mail.
- Botão “Copiar” por campo.
- Cópia dedicada do CNPJ.
- Impressão pelo navegador.
- Layout responsivo.
- Site público.
- Histórico local com contador, nova consulta e limpeza total.
- Mapa real incorporado por endereço, com abertura da busca no Google Maps.

## 8. Segurança e privacidade

- O projeto não armazena pesquisas.
- Não há credenciais no frontend.
- Conteúdo dinâmico em innerHTML usa escapeHtml.
- Links externos usam noreferrer quando aplicável.
- Produção usa HTTPS.
- Não contornar CAPTCHA, bloqueios ou limites.

## 9. Limitações

- 3 consultas por minuto por IP.
- Sem SLA ou garantia de atualização imediata.
- SINTEGRA depende da consolidação do fornecedor.
- A IE possui apenas booleano de atividade; não distingue oficialmente inativa de baixada.
- Tipo de IE e indicador ICMS são derivados.
- Lucro Real e Presumido geralmente não estão disponíveis.
- SUFRAMA depende de uma segunda fonte gratuita, CNPJá, e pode terminar alguns instantes depois da ficha principal.
- A fonte pode ainda não possuir registros alfanuméricos reais.
- O histórico não sincroniza entre navegadores ou dispositivos e pode ser apagado com os dados do site.
- O cache é só em memória da aba (5 min); não há backend para cache compartilhado.

## 10. Histórico desde o início

1. A referência Sintegra WS foi recebida em MHT.
2. Foi criada a interface Atlas CNPJ com identidade própria.
3. A primeira versão usava dados demonstrativos da Spotify.
4. O Site foi registrado e publicado inicialmente como privado.
5. A BrasilAPI substituiu os dados demonstrativos.
6. Como SINTEGRA era requisito, a fonte mudou para CNPJ.ws pública.
7. Foram adicionadas IEs, UF, situação e atualização.
8. O Site foi tornado público.
9. Foram adicionados tipo de IE, regime, IBGE e indicador ICMS.
10. O ICMS passou de booleano técnico para Sim/Não.
11. Foram adicionados botões de cópia por campo.
12. O validador ganhou CNPJ alfanumérico sem remover o numérico.
13. Foi criado ZIP para cópia local no Windows.
14. Foram criados AGENTS.md e HANDOFF.md.
15. Foi integrada inicialmente a validação pública de inscrição SUFRAMA por CNPJ + inscrição.
16. O fluxo SUFRAMA foi corrigido para consulta automática somente pelo CNPJ usando a API pública CNPJá.
17. Foi criado histórico local com CNPJ, razão social, nome fantasia e repetição de consulta.
18. O desenho de localização foi substituído por mapa real e clicável do Google Maps.

## 11. Histórico Git

~~~text
c11ecb9 Cria primeira versão do Atlas CNPJ
8d56b5a Ignora artefatos locais de publicação
f010266 Conecta consultas reais à BrasilAPI
b998d59 Adiciona inscrições estaduais do SINTEGRA
c9e604d Inclui tipo de IE, regime, IBGE e indicador ICMS
db08514 Adiciona cópia por campo e ajusta indicador ICMS
4495c13 Adiciona validação de CNPJ alfanumérico
~~~

O remoto atual é gerenciado pelo Sites. O GitHub do usuário ainda não foi criado porque a integração GitHub não foi conectada.

## 12. Execução local

~~~powershell
cd "X:\ajudante do papai\Atlas CNPJ"
py -m http.server 8000 --directory dist
~~~

Abra http://localhost:8000.

Evite abrir dist/index.html diretamente por file:// porque CORS pode impedir a API.

## 13. Regressão

~~~bash
node --check dist/app.js
git diff --check
node --test tests/validador.test.mjs tests/cache.test.mjs tests/sintegra.test.mjs
~~~

Checklist:

1. Consultar 33.000.167/0001-01.
2. Confirmar razão social da Petrobras.
3. Confirmar IEs.
4. Confirmar IE principal na UF do estabelecimento.
5. Confirmar ICMS “Sim”.
6. Testar “Copiar” em cadastro, CNAE, IE, sócio e endereço.
7. Testar impressão.
8. Testar celular.
9. Testar CNPJ inválido.
10. Testar erro 429.

## 14. Publicação

Projeto buildless. O pacote contém .openai/hosting.json e dist.

1. Preservar project_id.
2. Confirmar audiência pública.
3. Obter credencial temporária Sites.
4. Enviar o commit exato.
5. Empacotar estáticos.
6. Salvar versão.
7. Implantar mantendo audiência pública.
8. Confirmar succeeded.
9. Reutilizar a mesma URL.

Não registrar outro Site.

## 15. Pacote local

Destino solicitado:

X:\ajudante do papai\Atlas CNPJ

O ZIP deve incluir AGENTS.md, HANDOFF.md, .gitignore, .openai/hosting.json e dist. Não incluir .git, .sites-runtime, credenciais ou respostas de API.

## 16. Próximos passos

1. Criar/conectar repositório GitHub do usuário.
2. (Concluído) Testes automatizados do validador em tests/validador.test.mjs.
3. (Parcial) Cache em memória de 5 minutos implementado (createCache em dist/app.js); criar backend/cache compartilhado só se o limite da API continuar sendo problema.
4. Monitorar disponibilidade e defasagem dos dados SUFRAMA da fonte gratuita.
5. (Parcial) A ficha mostra só Ativa/Inativa e traz links para a consulta pública do Sintegra por UF (SINTEGRA_URLS em dist/app.js). Pesquisa de 20/10/2026: nenhuma fonte gratuita/sem chave diferencia baixada; CNPJá aberta não retorna inscrições; só APIs pagas (CNPJá paga, Direct Data, Infosimples) ou backend. Revalidar os endereços por UF periodicamente: AL, AP, ES, MG, PA, PE, PI, RN e SE usam o portal nacional (http://www.sintegra.gov.br/) porque o endereço estadual estava morto, mudou ou não pôde ser verificado.
6. (Concluído) Cabeçalhos na lista de IEs (Inscrição estadual, UF, Tipo, Situação, Atualização), com semântica de tabela para leitores de tela; ocultos visualmente em telas até 900px.
7. (Concluído) Fontes DM Sans e Manrope servidas localmente em dist/fonts (WOFF2 variável, latin, licença OFL).

