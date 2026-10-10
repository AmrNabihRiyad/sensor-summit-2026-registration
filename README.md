# IEEE Sensors Summit 2026

Responsive static event website and registration form for IEEE Sensors Council Egypt Chapter.

## Local development

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`. Run validation tests with `npm test`.

## Registration integration

The frontend preserves the existing Apps Script JSON format: named form values, `attendance` as an array, `totalFee`, and file objects under `files` with `name`, `mimeType`, and base64 content. The form only shows success when the endpoint returns JSON with `success: true`.

The Apps Script source is not included in this repository. Confirm the deployed `doPost` field handling, server-side validation, file access controls, and response shape before launch. A public GET health response is not proof that a registration POST has been verified.

Validation rules live in `src/validation.js` and are tested with Node's built-in test runner. The Egyptian national-ID check validates 14 digits, century/date structure, and the documented governorate-code set; it does not verify government records. Payment-reference digit formats remain unset until the event/provider confirms the actual format.

## Launch assets and content

No event logos, background image, or partner assets are present in the repository. Add approved files under a public asset directory and configure `PARTNERS` and `FEATURED_PARTNER` in `src/main.js`; keep official logo aspect ratios intact. Confirm the final rules, payment-reference formats, fees, date/venue details, and contact information with event organizers before launch.
