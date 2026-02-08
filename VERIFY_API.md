# API Verification & Guardrails

We have strictly enforced the use of API Routes for all data mutations (POST, PUT, DELETE).
Server Actions are **deprecated** and should not be used for writing data.

## Verification Checklist

### 1. Network Tab

- Open Developer Tools (F12) -> Network.
- Clean filter.
- Perform an action (e.g., Create Order, Add Stock).
- **Result**: You should see a request to `/api/...` (e.g., `/api/orders`, `/api/stock-movements`).
- **Header**: Content-Type should be `application/json`.
- **Response**: Should be JSON (`{ success: true, ... }` or `{ error: ... }`).

### 2. Manual Test Cases

| Module        | Action        | Endpoint                     | Payload Check               |
| ------------- | ------------- | ---------------------------- | --------------------------- |
| **Orders**    | Create Order  | `POST /api/orders`           | `{ customerName: "..." }`   |
| **Orders**    | Add Item      | `POST /api/orders/:id/items` | `{ type: "RECIPE", ... }`   |
| **Orders**    | Update Status | `PUT /api/orders/:id`        | `{ status: "PAID" }`        |
| **Stock**     | Add Movement  | `POST /api/stock-movements`  | `{ type: "PURCHASE", ... }` |
| **Suppliers** | Create        | `POST /api/suppliers`        | `{ name: "..." }`           |
| **Settings**  | Update        | `PUT /api/settings`          | `{ urssafRate: ... }`       |
| **Auth**      | Login         | `POST /api/auth/login`       | `{ email: ... }`            |
| **Auth**      | Logout        | `POST /api/auth/logout`      | `null`                      |

### 3. Automated Guardrails

We have added a script `scripts/lint-mutations.js` that checks for:

- `use server` in `src/actions`.
- `<form action=...>` in Client Components.

Run it via:

```bash
node scripts/lint-mutations.js
```

## Troubleshooting

- **Error 405 Method Not Allowed**: You are trying to GET a POST-only route or vice-versa.
- **Error 400 Bad Request**: Zod validation failed. Check `src/lib/zod-schemas.ts`.
- **"Cannot read properties of undefined"**: Check if your component is correctly iterating over arrays (we added guardrails `|| []`).
