# Google Cloud Support — restore default Compute Engine service account

## Context

Project: `lilutecno-pagina-web` (number `907793758364`)

On **2025-09-03**, these service accounts were deleted by `lilutecno@gmail.com`:

| Email | Unique ID (from audit logs) |
|-------|-----------------------------|
| `907793758364-compute@developer.gserviceaccount.com` | `111097891559785412943` |
| `lilutecno-pagina-web@appspot.gserviceaccount.com` | `112119027283747031087` |

`gcloud iam service-accounts undelete` returns `NOT_FOUND` (past the 30-day window).

## Impact

- Cloud Functions Gen1/Gen2 default build identity is missing.
- Eventarc / Firestore triggers that rely on the default Compute SA cannot be deployed cleanly.
- Workaround in production: runtime + build use  
  `firebase-adminsdk-fbsvc@lilutecno-pagina-web.iam.gserviceaccount.com`  
  via `scripts/deploy-functions.mjs` and `setGlobalOptions({ serviceAccount })`.

## Request to Google Cloud Support

Please restore (or recreate) the project default service accounts:

1. Compute Engine default: `907793758364-compute@developer.gserviceaccount.com`
2. App Engine default: `lilutecno-pagina-web@appspot.gserviceaccount.com`

Audit log evidence (Cloud Logging query):

```
resource.type="service_account"
protoPayload.methodName="google.iam.admin.v1.DeleteServiceAccount"
```

## After restoration

1. Grant Editor (or least-privilege roles) as needed on the restored SA.
2. Redeploy functions with the normal Firebase CLI (optional: remove the build-SA patch path).
3. Re-enable `syncProductCategory` (Firestore `onDocumentWritten`) if desired.

## Open a case

Console: https://console.cloud.google.com/support/cases?project=lilutecno-pagina-web  
Or Firebase Support: https://firebase.google.com/support
