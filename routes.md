# Flashcard API Routes

> This route contract is a clean-room baseline created because the original Session 26 starter project and its routes.md were not provided.

| Method | Endpoint | Purpose | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | API health check | 200 | — |
| GET | `/api/flashcards` | List all flashcards | 200 | — |
| POST | `/api/flashcards` | Create a flashcard | 201 | 400 invalid input/JSON |
| GET | `/api/flashcards/:id` | Get one flashcard | 200 | 404 not found |
| PUT | `/api/flashcards/:id` | Replace card fields | 200 | 400 invalid input, 404 |
| PATCH | `/api/flashcards/:id` | Update supplied fields | 200 | 400 invalid input, 404 |
| DELETE | `/api/flashcards/:id` | Delete a flashcard | 200 | 404 not found |

## Request body
Create:
```json
{ "front": "Question", "back": "Answer" }
```

Update accepts either or both fields. `front` and `back` must be non-empty strings.

## Response format
Successful resource responses use `{ "data": ... }`. Errors use `{ "error": "..." }`.
