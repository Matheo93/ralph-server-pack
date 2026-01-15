# FamilyLoad Mobile API Documentation

## Base URL

- Production: `https://app.familyload.com/api/v1`
- Development: `http://localhost:3000/api/v1`

## Authentication

All endpoints (except `/auth POST`) require a Bearer token:

```
Authorization: Bearer <access_token>
```

### Login

```http
POST /auth
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "device_name": "iPhone 15",
  "device_id": "unique-device-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "abc123...",
    "refresh_token": "xyz789...",
    "expires_at": "2024-12-26T10:00:00.000Z",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jean Dupont"
    }
  }
}
```

### Refresh Token

```http
PUT /auth
Content-Type: application/json

{
  "refresh_token": "xyz789..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new-token...",
    "expires_at": "2024-12-26T10:00:00.000Z",
    "user": {...}
  }
}
```

### Logout

```http
DELETE /auth
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logged_out": true
  }
}
```

---

## Tasks

### List Tasks

```http
GET /tasks
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: `pending`, `in_progress`, `completed`, `all` |
| assigned_to | uuid | Filter by assigned user |
| child_id | uuid | Filter by child |
| category_id | uuid | Filter by category |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Acheter fournitures scolaires",
      "description": "Cahiers, stylos, règle",
      "status": "pending",
      "priority": "high",
      "due_date": "2024-09-01T10:00:00.000Z",
      "estimated_duration_minutes": 60,
      "category_id": "uuid",
      "category_name": "École",
      "assigned_to": "uuid",
      "assigned_name": "Marie",
      "child_id": "uuid",
      "child_name": "Emma",
      "created_at": "2024-08-15T10:00:00.000Z",
      "updated_at": "2024-08-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

### Create Task

```http
POST /tasks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Rendez-vous pédiatre",
  "description": "Visite de contrôle annuelle",
  "priority": "high",
  "due_date": "2024-09-15T14:00:00.000Z",
  "estimated_duration_minutes": 45,
  "category_id": "uuid",
  "assigned_to": "uuid",
  "child_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "title": "Rendez-vous pédiatre",
    ...
  }
}
```

### Get Task

```http
GET /tasks/{id}
Authorization: Bearer <access_token>
```

### Update Task

```http
PUT /tasks/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated title",
  "status": "completed",
  ...
}
```

### Partial Update (PATCH)

```http
PATCH /tasks/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Delete Task

```http
DELETE /tasks/{id}
Authorization: Bearer <access_token>
```

---

## Children

### List Children

```http
GET /children
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Emma",
      "birth_date": "2018-05-15",
      "photo_url": "https://s3.../emma.jpg",
      "notes": "Allergique aux arachides",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "hasMore": false
  }
}
```

### Create Child

```http
POST /children
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Lucas",
  "birth_date": "2020-03-10",
  "notes": "Aime le foot"
}
```

### Get Child

```http
GET /children/{id}
Authorization: Bearer <access_token>
```

### Update Child

```http
PUT /children/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Lucas",
  "birth_date": "2020-03-10",
  "notes": "Updated notes"
}
```

### Delete Child

```http
DELETE /children/{id}
Authorization: Bearer <access_token>
```

---

## Household

### Get Household Info

```http
GET /household
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Famille Dupont",
    "created_at": "2024-01-15T10:00:00.000Z",
    "members": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Jean",
        "email": "jean@example.com",
        "role": "owner",
        "is_active": true
      },
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Marie",
        "email": "marie@example.com",
        "role": "member",
        "is_active": true
      }
    ],
    "children_count": 2,
    "tasks_count": 45,
    "pending_tasks_count": 12
  }
}
```

---

## Sync

### Offline Sync

```http
POST /sync
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "last_sync_at": "2024-08-14T10:00:00.000Z",
  "changes": {
    "tasks": [
      {
        "id": "temp-uuid-1",
        "action": "create",
        "data": {
          "title": "New task",
          ...
        },
        "client_timestamp": "2024-08-14T12:00:00.000Z"
      },
      {
        "id": "existing-uuid",
        "action": "update",
        "data": {
          "status": "completed"
        },
        "client_timestamp": "2024-08-14T13:00:00.000Z"
      }
    ],
    "children": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "server_time": "2024-08-15T10:00:00.000Z",
    "changes": {
      "tasks": {
        "created": [...],
        "updated": [...],
        "deleted": ["uuid-1", "uuid-2"]
      },
      "children": {
        "created": [],
        "updated": [...],
        "deleted": []
      }
    },
    "conflicts": [
      {
        "type": "task",
        "id": "uuid",
        "client_version": {...},
        "server_version": {...},
        "resolution": "server_wins"
      }
    ],
    "push_results": {
      "success": ["temp-uuid-1"],
      "failed": []
    }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message in French"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Access denied |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error |

### Common Error Messages

| Message | Meaning |
|---------|---------|
| `Token manquant ou invalide` | Missing or invalid auth token |
| `Session invalide ou expirée` | Session expired |
| `Utilisateur sans foyer` | User has no household |
| `Trop de requêtes` | Rate limit exceeded |
| `JSON invalide` | Invalid JSON body |
| `Données invalides` | Validation failed |

---

## Rate Limiting

- **Limit:** 100 requests per minute per user
- **Headers:**
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Seconds until reset

---

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

```
GET /api/v1/docs
```

This can be imported into Swagger UI or Postman for interactive documentation.
