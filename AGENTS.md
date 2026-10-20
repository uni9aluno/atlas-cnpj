# AGENTS.md — Atlas CNPJ

Estas instruções valem para todo o projeto.

## Antes de alterar

1. Leia HANDOFF.md por completo.
2. Preserve o project_id de .openai/hosting.json.
3. Preserve o acesso público do Site, salvo solicitação explícita do proprietário.
4. Não trate campos calculados pelo frontend como dados oficiais.
5. Não adicione chaves, tokens ou credenciais ao repositório.

## Arquitetura

- Site estático, sem framework e sem etapa de build.
- Publicação: dist/index.html, dist/styles.css e dist/app.js.
- Manifesto: .openai/hosting.json.
- APIs: GET https://publica.cnpj.ws/cnpj/{cnpj} e GET https://open.cnpja.com/office/{cnpj}.
- Não há backend, banco de dados, autenticação ou persistência remota de consultas.
- Respostas das APIs podem ser reutilizadas por cache apenas em memória (5 min); nunca gravar respostas em localStorage ou disco.
- O histórico é local ao navegador, armazenado em `localStorage` com no máximo 25 CNPJs.

## Regras de produto e dados

- Suportar CNPJ numérico e alfanumérico, preservando máscara e dígitos verificadores.
- Manter compatibilidade com CNPJs numéricos existentes.
- Exibir “Não informado” quando a fonte não retornar um campo.
- Nunca inventar IE, regime tributário, situação cadastral ou SUFRAMA.
- Tipo de IE derivado:
  - Principal: UF da IE igual à UF do estabelecimento.
  - Outra UF: UF diferente.
- Contribuinte ICMS derivado:
  - Sim: existe pelo menos uma IE ativa.
  - Não: nenhuma IE ativa foi retornada.
- A API informa atividade da IE como booleano. Não afirmar “Baixada” sem fonte específica.
- O regime pode mostrar MEI, Simples ou histórico quando a API fornecer. Não inferir Lucro Real ou Presumido.
- A consulta SUFRAMA é automática pelo CNPJ e usa o array `suframa` retornado pela API pública CNPJá.
- Nunca exibir resultado SUFRAMA de uma pesquisa anterior quando o CNPJ atual mudar.
- A API pública limita o consumo a 3 consultas por minuto por IP. Tratar HTTP 429 claramente.

## Regras de interface

- Manter a consulta visível na primeira tela.
- Preservar responsividade em desktop e celular.
- Cada informação da ficha deve ter botão individual “Copiar”.
- O histórico deve manter CNPJ, razão social, nome fantasia e data, permitir nova consulta e limpeza total.
- O mapa deve usar o endereço completo retornado pela API e abrir a mesma busca no Google Maps ao ser clicado.
- Manter estados de carregamento, erro, resultado vazio e indisponibilidade.
- Escapar conteúdo da API antes de usar innerHTML.
- Manter labels, aria-live, nomes acessíveis e navegação por teclado.

## Validação mínima

Execute:

~~~bash
node --check dist/app.js
git diff --check
node --test tests/validador.test.mjs tests/cache.test.mjs
~~~

Casos do validador:

- 33.000.167/0001-01 → válido.
- 19.131.243/0001-97 → válido.
- 33.000.167/0001-02 → inválido.
- 00.000.000/0000-00 → inválido.
- 12.ABC.345/01DE-35 → válido.

Quando houver rede, faça uma consulta real e confira razão social, situação, endereço, CNAE, IEs, SUFRAMA e erros 404/429. CNPJ conhecido com SUFRAMA para teste: 07.526.557/0116-59.

## Execução local

Não abrir por file://, pois a API depende de CORS.

~~~bash
python -m http.server 8000 --directory dist
~~~

No Windows:

~~~powershell
py -m http.server 8000 --directory dist
~~~

Abra http://localhost:8000.

## Publicação

- O Site é público e deve permanecer público por padrão.
- Use o fluxo oficial de Sites para credencial temporária, envio, pacote e publicação.
- Para audiência pública: salvar versão e implantar com a audiência existente.
- Nunca persistir credenciais temporárias.
- Confirmar estado succeeded e reutilizar a URL atual.
- Não registrar outro Site para este projeto.

## Escopo

- Preserve os recursos entregues.
- Faça regressão numérica ao alterar o suporte alfanumérico.
- Documentação não exige nova implantação estática, mas deve ser versionada e incluída no ZIP de handoff.

