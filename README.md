# Arquitectura de 3 Camadas (Directives, Orchestration, Execution)

Esta estrutura foi configurada para criar uma separação clara entre a intenção (o que fazer) e a execução (como fazer), maximizando a fiabilidade e manutenção do código.

## Estrutura de Pastas

*   **`directives/`** (Directivas): Contém os SOPs (Standard Operating Procedures) e instruções em Markdown. Define o "O Quê".
    *   Exemplo: `directives/scrape_website.md`
*   **`execution/`** (Execução): Contém os scripts Python determinísticos que realizam o trabalho pesado. Define o "Como".
    *   Exemplo: `execution/scrape_single_site.py`
*   **`.tmp/`** (Temporários): Directoria para ficheiros intermédios e temporários. O conteúdo desta pasta é ignorado pelo git e pode ser regenerado a qualquer momento.

## Fluxo de Trabalho

1.  **Directiva**: O Agente (ou utilizador) lê uma directiva em `directives/` para entender o objectivo e os passos necessários.
2.  **Orquestração**: O Agente decide quais ferramentas usar e em que ordem, baseando-se na directiva.
3.  **Execução**: O Agente executa scripts em `execution/` para realizar tarefas específicas de forma determinística e fiável.

## Princípios

*   **Separação de Preocupações**: As directivas são flexíveis e humanas; a execução é rígida e fiável.
*   **Auto-correcção (Self-annealing)**: Se um script falhar, o erro é analisado, o script é corrigido e a directiva actualizada com a nova informação.
*   **Estado na Cloud**: Ficheiros finais devem ser entregues em serviços acessíveis (Google Drive, etc.), mantendo o sistema local apenas para processamento.

## Configuração

O ficheiro `.gitignore` já está configurado para ignorar `.tmp/`, `.env` e credenciais sensíveis.
