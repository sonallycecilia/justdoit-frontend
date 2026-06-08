# 📋 JustDoIt - Briefing de Design

**Status:** MVP / Protótipo  
**Tipo:** SaaS B2C  
**Categoria:** Produtividade  
**Criador:** Sonally Vitorino  

---

## Visão Geral

**JustDoIt** é uma plataforma web revolucionária de gerenciamento de produtividade pessoal que vai além de listas de tarefas convencionais. Focada em planejamento semanal estruturado, a ferramenta permite que usuários multitarefa dominem completamente seu tempo através de funcionalidades modulares, inteligência analítica avançada e métricas de desvio entre planejado vs. executado.

O grande diferencial inovador do JustDoIt é entender que pessoas modernas não possuem rotinas lineares ou compartimentadas — elas são simultaneamente estudantes, profissionais, gestores pessoais e mais.

---

## Público-alvo

### Perfil 1: Estudantil
- **Quem:** Universitários, concurseiros, aprendizes
- **Necessidade principal:** Técnicas avançadas de foco profundo + monitoramento rigoroso de tempo líquido
- **Módulos ativados:** Mecanismo de Foco + Cronômetro de Execução

### Perfil 2: Profissional
- **Quem:** Trabalhadores, autônomos, estagiários, freelancers
- **Necessidade principal:** Múltiplos prazos, entregas simultâneas, análise de desempenho
- **Módulos ativados:** Matriz de Priorização + Relatórios e Análise de Desvios

### Perfil 3: Gestor de Rotina Pessoal
- **Quem:** Pessoas focadas em consistência de hábitos, bem-estar, obrigações diárias
- **Necessidade principal:** Automatização de tarefas recorrentes com ciclos customizados
- **Módulos ativados:** Reinicialização Cíclica (diária/semanal/mensal)

### Problema-chave que resolve
Pessoas multitarefa sofrem com **sobrecarga mental, paralisia por análise e procrastinação**. O JustDoIt elimina o estresse de usar múltiplas ferramentas, concentrando o controle estratégico em um único lugar fluido.

---

## Tom e Voz

### Identidade Visual
- **Tom:** Profissional e Corporativo
- **Sentimento:** Confiança, controle, clareza, eficiência
- **Linguagem:** Direta, sem jargão desnecessário, focada em ação

### Como deve se sentir
- Limpo e descomplicado (sem excesso de UI)
- Poderoso, mas acessível
- Que o usuário está no controle total
- Dados e métricas claras e actionáveis

---

## Funcionalidades Principais

### 1. **Criação e Gerenciamento de Tarefas**
- Criar, editar, visualizar, excluir tarefas
- Cada tarefa é um container modular de funcionalidades
- Interface intuitiva para ativar/desativar módulos por tarefa

### 2. **Categorização de Contexto**
- Categorias personalizadas criadas pelo usuário
- Vinculação flexível de tarefas a contextos
- Agrupamento visual por contexto

### 3️. **Decomposição em Sub Tarefas**
- Quebra de tarefas grandes em subtarefas menores
- Rastreamento de progresso em cascata
- Sensação de progresso visual

### 4️. **Calendário e Alocação de Tempo**
- Visualização de calendário semanal (foco principal)
- Blocos de tempo para alocação de tarefas
- Drag-and-drop intuitivo
- Estimativa de duração (tempo planejado)

### 5️. **Mecanismo de Foco (Pomodoro)**
- Cronômetro de foco integrado
- Intercalação de tempos de foco e descanso customizados
- Registro automático de sessões de produtividade
- Visualização de horas de foco consumidas

### 6️. **Reinicialização Cíclica (Recorrência)**
- Tarefas que se repetem automaticamente
- Ciclos: diários, semanais, mensais, trimestrais, anuais
- Gerenciamento inteligente de rotinas

### 7️. **Matriz de Priorização Hierárquica**
- Classificação por urgência/importância
- Feedback visual intuitivo (cores, ícones, destaques)
- "To Do List" organizada por prioridade

### 8️. **Cronômetro de Execução (Registro Temporal)**
- Medição rigorosa do tempo real gasto na tarefa
- Comparação automática: tempo estimado vs. tempo real
- Acionamento ao iniciar uma tarefa

### 9️. **Bloco de Notas (Registro Textual)**
- Campo de texto livre associado a cada tarefa
- Anotações, observações, contexto
- Busca em notas

### 10. **Dashboards Analíticos Avançados**
- Consolidação semanal de dados
- Métricas de desvio (planejado vs. executado)
- Gráficos de alocação de tempo por categoria
- Insights visuais para decisões estratégicas

---

## 🎯 Funcionalidades Modulares (Core Concept)

Cada tarefa pode ter ATIVADAS ou DESATIVADAS individualmente:

```
☐ Mecanismo de Foco
☐ Reinicialização Cíclica  
☐ Matriz de Priorização
☐ Registro Temporal (Cronômetro)
☐ Registro Textual (Notas)
```

Isto permite que um usuário crie a "tarefa perfeita" para cada contexto sem bloatware.

---

## Design System & Referências

### Referências de Design
- **Notion:** Simplicidade visual, modularidade, dark mode
- **Obsidian:** Clareza de informação, estrutura limpa, foco no conteúdo

### Princípios de Design
1. **Clareza acima de tudo** - Dados devem ser legíveis à primeira vista
2. **Modularidade visual** - Refletir a natureza modular das funcionalidades
3. **Feedback visual imediato** - O usuário vê o resultado de suas ações instantaneamente
4. **Hierarquia clara** - O que é importante fica em destaque
5. **Respiração de espaço** - Não sobrecarregar a interface

### Paleta de Cores (A definir, mas sugestões)
- **Primária:** Tom sóbrio e profissional (azul, cinza escuro, verde)
- **Secundária:** Cores para prioridades (vermelho=urgente, amarelo=importante, verde=normal)
- **Neutros:** Brancos, cinzas para background e estrutura

### Tipografia
- **Sans-serif** moderno e legível
- Hierarquia clara entre títulos, corpos e labels
- Tamanhos adequados para leitura em desktop

---

## Fluxos Principais

### Fluxo 1: Criar e Planejar a Semana
1. Usuário cria tarefas
2. Ativa módulos necessários
3. Aloca no calendário semanal
4. Define prioridades
5. Estima tempo

### Fluxo 2: Executar Tarefas Durante a Semana
1. Inicia tarefa no calendário
2. Ativa cronômetro (se habilitado)
3. Gerencia sessões de foco
4. Adiciona notas conforme necessário
5. Marca como completa

### Fluxo 3: Revisar e Analisar (Final de Semana)
1. Sistema consolida dados da semana
2. Gera Dashboard com métricas
3. Usuário visualiza desvios (planejado vs. real)
4. Toma decisões estratégicas para próxima semana

---

## Requisitos Técnicos / Constraints

### Requisitos Funcionais Críticos (MVPs)
- ✅ RF01: Criação e Edição de Tarefas
- ✅ RF02: Categorização de Contexto
- ✅ RF04: Alocação em Calendário
- ✅ RF05: Gestão Modular de Funcionalidades
- ✅ RF10: Matriz de Priorização
- ✅ RF13: Cronômetro de Execução
- ✅ RF16: Geração de Dashboards

### Requisitos Secundários (Nice-to-have)
- RF03: Decomposição em Sub Tarefas
- RF06: Mecanismo de Foco (Sessões)
- RF08: Reinicialização Cíclica
- RF14: Registro Textual
- RF18: Visão de Alocação de Tempo

### Considerações
- Performance com calendário grande (muitas tarefas)
- Sincronização de dados em tempo real
- Responsividade (desktop-first, mas mobile-friendly)

---

## 💡 Insights para Design

### O que NÃO fazer
- Não replicar Notion ou Obsidian literalmente
- Não sobrecarregar com opções visuais
- Não esconder funcionalidades modulares (devem ser destacadas)
- Não fazer dashboards complexos demais

### O que FAZER
- Celebrar a modularidade como diferencial
- Tornar visual o conceito de "desvio" entre planejado e real
- Deixar o calendário respirar
- Criar "micro-celebrations" quando tarefas são completadas
- Feedback tátil/visual para ações críticas

### Oportunidades de Diferenciação
- Interface diferente para cada tipo de usuário (estudante vs. profissional)
- Animações suaves que refletem progresso
- Visualizações de desvio tempo criativas e não cansativas
- Onboarding inteligente que ativa apenas módulos relevantes

---

## 📱 Páginas/Seções Principais

1. **Dashboard/Home** - Visão geral da semana
2. **Calendário** - Alocação visual de tarefas em blocos de tempo que se alterenem entre diário, semanal, mensal
3. **To Do List** - Vista linear priorizada
4. **Tarefa (Detail View)** - Editor completo com módulos
5. **Análise Semanal** - Dashboards e métricas
6. **Configurações** - Preferências, categorias, perfis
7. **Onboarding** - Setup inicial guiado

---

## 🚀 Próximos Passos

1. Definir paleta de cores exata
2. Criar wireframes de cada página
3. Prototipar interações críticas (calendário, módulos, dashboards)
4. Validar com usuários de cada perfil
5. Iterar sobre feedback

---

**Versão:** 1.0  
**Data:** Junho 2026  
**Criado para:** Claude Design
