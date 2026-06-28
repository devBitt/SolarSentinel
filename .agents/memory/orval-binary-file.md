---
name: Orval binary/File type collision
description: File upload endpoints with multipart/form-data binary schemas cause TS2304 errors (Cannot find name 'File'/'Blob') in Node.js tsconfig; fix by omitting the requestBody schema.
---

When an OpenAPI operation has a `requestBody` using `multipart/form-data` with a `binary` format field, Orval generates `zod.instanceof(File)` and `file?: Blob` in the Zod types. These fail to compile under Node.js tsconfigs that don't include `lib: dom`.

**Rule:** For file upload endpoints (`POST /upload`), omit the `requestBody` schema from `components/schemas` and do not reference it in the OpenAPI spec. The frontend handles uploads via raw `FormData` — no generated hook body type needed.

**Why:** Adding `lib: dom` to the api-zod tsconfig would cause cross-package type portability issues. The simpler fix is to omit the schema.

**How to apply:** Any time a file upload endpoint is added to `lib/api-spec/openapi.yaml`, do not define a `DataUpload` or similar component schema with `format: binary`. Use a plain mutation hook without a typed body on the frontend.
