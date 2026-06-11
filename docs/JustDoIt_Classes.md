# JustDoIt — Diagrama de Classes (Visão Geral)
**Arquitetura:** Microservices (Spring Boot / Java)  

---

## Auth Service

### User
| Atributo | Tipo |
|---|---|
| id | UUID |
| name | String |
| email | String |
| passwordHash | String |
| profilePicture | path |
| birthDate | LocalDateTime |
| createdAt | LocalDateTime |
| active | boolean |

| Método | Retorno |
|---|---|
| register() | User |
| login() | String (JWT) |
| deactivateAccount() | void |


---

### JwtToken
| Atributo | Tipo |
|---|---|
| token | String |
| userId | UUID |
| email | String |
| profile | String |
| expiresAt | LocalDateTime |

| Método | Retorno |
|---|---|
| generateToken() | String |
| validateToken() | boolean |
| extractUserId() | UUID |

---

## Task Service

### Task
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| title | String |
| description | String |
| priority | Priority |
| status | TaskStatus |
| estimatedMinutes | Integer |
| actualSeconds | Long |
| notes | String |
| moduleFocusEnabled | boolean |
| moduleCycleEnabled | boolean |
| modulePriorityEnabled | boolean |
| moduleTimerEnabled | boolean |
| moduleNotesEnabled | boolean |
| createdAt | LocalDateTime |
| updatedAt | LocalDateTime |
| completedAt | LocalDateTime |

| Método | Retorno |
|---|---|
| complete() | void |
| calculateDeviationSeconds() | long |
| getSubTaskProgress() | double |

---

### SubTask
| Atributo | Tipo |
|---|---|
| id | UUID |
| parentTask | Task |
| title | String |
| status | TaskStatus |
| position | int |

| Método | Retorno |
|---|---|
| complete() | void |

---

### Category
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| name | String |
| color | String |

---

### FocusSession
| Atributo | Tipo |
|---|---|
| id | UUID |
| task | Task |
| focusMinutes | int |
| breakMinutes | int |
| sessionType | SessionType |
| startedAt | LocalDateTime |
| endedAt | LocalDateTime |
| completed | boolean |

| Método | Retorno |
|---|---|
| getDurationSeconds() | long |

---

### CycleConfig
| Atributo | Tipo |
|---|---|
| id | UUID |
| task | Task |
| cycleType | CycleType |
| startDate | LocalDate |
| endDate | LocalDate |
| nextResetDate | LocalDate |

| Método | Retorno |
|---|---|
| calculateNextResetDate() | LocalDate |

---

### Priority *(enum)*
- URGENT_IMPORTANT
- NOT_URGENT_IMPORTANT
- URGENT_NOT_IMPORTANT
- NORMAL

### TaskStatus *(enum)*
- PENDING
- IN_PROGRESS
- COMPLETED
- CANCELLED
- OVERDUE

### CycleType *(enum)*
- DAILY
- WEEKLY
- MONTHLY
- ANNUAL

### SessionType *(enum)*
- FOCUS
- BREAK

---


## Schedule Service

### TimeBlock
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| taskId | UUID |
| startDateTime | LocalDateTime |
| endDateTime | LocalDateTime |
| estimatedMinutes | int |
| date | LocalDate |

| Método | Retorno |
|---|---|
| getDurationMinutes() | int |
| overlaps(TimeBlock) | boolean |

---

### WeeklyPlan
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| weekStartDate | LocalDate |
| weekEndDate | LocalDate |
| status | ScheduleStatus |

| Método | Retorno |
|---|---|
| close() | void |
| getTotalEstimatedMinutes() | int |

---

### WeeklySummary
| Atributo | Tipo |
|---|---|
| id | UUID |
| weeklyPlan | WeeklyPlan |
| totalEstimatedMinutes | int |
| totalActualSeconds | long |
| deviationSeconds | long |
| completedTasks | int |
| totalTasks | int |

| Método | Retorno |
|---|---|
| getCompletionRate() | double |
| getDeviationMinutes() | long |

---

### ScheduleStatus *(enum)*
- OPEN
- CLOSED

---

## Project Service

### Project
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| name | String |
| description | String |
| color | String |
| status | ProjectStatus |
| createdAt | LocalDateTime |

| Método | Retorno |
|---|---|
| archive() | void |

---

### ProjectTask *(associacão)*
| Atributo | Tipo |
|---|---|
| id | UUID |
| project | Project |
| taskId | UUID |
| addedAt | LocalDateTime |

---

### ProjectStatus *(enum)*
- ACTIVE
- ARCHIVED
- COMPLETED

---

## Notification Service

### Notification
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| type | NotificationType |
| title | String |
| message | String |
| taskId | UUID |
| read | boolean |
| createdAt | LocalDateTime |

| Método | Retorno |
|---|---|
| markAsRead() | void |

---

### NotificationPreference
| Atributo | Tipo |
|---|---|
| id | UUID |
| userId | UUID |
| notifyOnComplete | boolean |
| notifyOnOverdue | boolean |
| notifyOnCycleReset | boolean |

---

### NotificationType *(enum)*
- TASK_COMPLETED
- TASK_OVERDUE
- CYCLE_RESET
- WEEKLY_SUMMARY

---

## Relacionamentos

```
User          ──1:N──  Task
Task          ──1:N──  SubTask
Task          ──1:N──  FocusSession
Task          ──1:1──  CycleConfig
Task          ──1:N──  TimeBlock
Category      ──1:N──  Task
WeeklyPlan    ──1:1──  WeeklySummary
Project       ──1:N──  ProjectTask
User          ──1:N──  Notification
User          ──1:1──  NotificationPreference
```
