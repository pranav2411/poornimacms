## API Routes

These are the backend routes currently mounted by the FastAPI app:

- `GET /health` - quick server check.
- `GET /users` - list all users.
- `GET /users/{user_id}` - get one user by database id.
- `POST /users` - create a user.
- `GET /vendors` - list vendor users.
- `GET /complaints` - list complaints.
- `GET /complaints/{complaint_no}` - get one complaint.
- `POST /complaints` - create a complaint.
- `POST /complaints/{complaint_no}/assign` - assign a vendor.
- `POST /complaints/{complaint_no}/mark-fixed` - mark a complaint fixed.
- `POST /complaints/{complaint_no}/close` - close/cancel a complaint.
- `POST /complaints/{complaint_no}/remind` - send a reminder.
- `POST /complaints/{complaint_no}/report` - report an issue.
- `GET /notifications` - list notifications.
- `GET /stats` - get dashboard stats.
- `GET /meta/categories` - list complaint categories.
