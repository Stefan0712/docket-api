**Docket API** is the backend service for the Docket application, built with Node.js, Express, TypeScript, and MongoDB. It features offline-first synchronization capabilities, JWT authentication, and group collaboration tools.

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* MongoDB (Running locally or cloud)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/docket-api.git](https://github.com/yourusername/docket-api.git)
    cd docket-api
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/docket-db
    JWT_SECRET=your_super_secret_key
    JWT_EXPIRE=30d
    ```

4.  **Run the Server**
    ```bash
    # Development
    npm run dev
    
    # Production
    npm run build
    npm start
    ```

---

## 📡 API Reference

**Base URL:** `http://localhost:5000/api`

### Authentication

**Auth Header:** Most endpoints require a valid JWT token.
`Authorization: Bearer <your_token>`

#### 1. Identity (`/auth`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new account | No |
| `POST` | `/auth/login` | Login and receive token | No |
| `GET` | `/auth/me` | Get current user profile | **Yes** |

**Register/Login Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "User Name" // Required for register only
}
```

#### 2. User Profiles (`/users`)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `PUT` | `/users/profile` | Update avatar or username | - |
| `GET` | `/users/search` | Search for users by name/email | `?q=searchterm` |

**Update Profile Body:**
```json
{
  "username": "New Name",
  "avatarUrl": "/uploads/user-id.jpg"
}
```

#### 3. Shopping Lists (`/lists`)

This endpoint supports **Sync Logic**.

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/lists` | Create a new list | - |
| `GET` | `/lists` | Get lists (Active or Changed) | `?since=ISO_DATE`, `?groupId=ID` |
| `GET` | `/lists/:id` | Get single list details | - |
| `PUT` | `/lists/:id` | Update list (name, color, etc.) | - |
| `DELETE` | `/lists/:id` | **Soft Delete** list | - |

**Create List Body:**
```json
{
  "name": "Groceries",
  "color": "#FF5733",
  "groupId": "optional_group_id", // Omit for private list
  "isPinned": false
}
```

#### 4. List Items (`/items`)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/items` | Add item to list | - |
| `GET` | `/items` | Get items for a list | `?listId=ID` (Req), `?since=DATE` |
| `PUT` | `/items/:id` | Update item (check, rename, assign) | - |
| `DELETE` | `/items/:id` | **Soft Delete** item | - |

**Create Item Body:**
```json
{
  "listId": "required_mongo_id",
  "name": "Milk",
  "qty": 2,
  "unit": "liters",
  "category": { "_id": "c1", "name": "Dairy", "color": "blue" },
  "priority": "high" // low, normal, high
}
```

#### 5. Groups (`/groups`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/groups` | Create a new group |
| `GET` | `/groups` | Get all groups I belong to |
| `GET` | `/groups/:id` | Get group details & members |
| `POST` | `/groups/:id/invite` | Add member (Owner/Mod only) |
| `DELETE` | `/groups/:id/leave` | Leave a group |

**Invite Body:** `{ "email": "friend@example.com" }`

#### 6. Notes (`/notes`)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/notes` | Create a markdown note | - |
| `GET` | `/notes` | Get notes for a group | `?groupId=ID` |
| `PUT` | `/notes/:id` | Edit title or content | - |
| `DELETE` | `/notes/:id` | Delete note | - |

**Create Note Body:**
```json
{
  "groupId": "group_id",
  "title": "Wifi Password",
  "content": "The password is **1234**"
}
```

#### 7. Polls (`/polls`)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/polls` | Create a poll | - |
| `GET` | `/polls` | Get polls for a group | `?groupId=ID` |
| `POST` | `/polls/:id/vote` | Cast a vote (toggles) | - |
| `DELETE` | `/polls/:id` | Delete poll | - |

**Vote Body:** `{ "optionId": "option_mongo_id" }`

#### 8. Notifications (`/notifications`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/notifications` | Get my recent alerts (limit 50) |
| `PUT` | `/notifications/:id/read` | Mark specific alert as read |
| `PUT` | `/notifications/read-all` | Mark ALL as read |
| `DELETE` | `/notifications/:id` | Delete notification |

#### 9. Activity Logs (`/activity`)

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/activity/:groupId` | Get group history | `?page=1`, `?limit=20` |
| `DELETE` | `/activity/:id` | Delete log (Moderator only) | - |

#### 10. File Upload (`/upload`)

| Method | Endpoint | Description | Headers |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Upload image to server | `Content-Type: multipart/form-data` |

**Request:** Form Data key `image` (File).
**Response:** `{ "url": "/uploads/user-123.jpg" }`

---

### Sync Logic (Offline-First)

This API is designed to work with local databases (like Dexie.js).
1.  **Pull:** When fetching lists or items, pass `?since=LAST_SYNC_DATE`. The API returns only modified records (created, updated, or soft-deleted).
2.  **Push:** The client should track local changes and send them to the corresponding `create` or `update` endpoints when online.
"""

<!-- # Replace the placeholders with actual backticks
final_content = readme_content.replace("```", "```").replace("`", "`")
 -->
