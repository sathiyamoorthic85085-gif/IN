# Google Sheets bridge notes

The enabled Google Workspace connection exposes Google Sheets and Apps Script operations. The Apps Script API supports creating a project, updating project content, creating immutable versions, and creating deployments. A web-app deployment has configurable `access`, `executeAs`, and a returned web-app URL. The Sheets API supports spreadsheet creation, batch updates, and values updates.

The deployed website cannot call the local `gws` command directly. The implementation therefore keeps the primary MySQL/TiDB database as the registration source of truth and treats Google Sheets as an optional mirror reached through a server-side bridge URL. The bridge must require a server-only shared token and write only to the configured spreadsheet ID and Software/Hardware worksheets.

Current destination spreadsheet created through the authorized Google Workspace connection:

- Spreadsheet: `InnoHack-26 Registration Mirror`
- ID: `1lRU5V6jQopSxwvSZEMoFJurwFZEuMH2pgbjIACHSXP0`
- URL: https://docs.google.com/spreadsheets/d/1lRU5V6jQopSxwvSZEMoFJurwFZEuMH2pgbjIACHSXP0/edit
- Tabs: `All Registrations`, `Software`, `Hardware`
- Headers: the same 16 readable fields used by the organiser workbook, including numeric member count and alphanumeric UTR/reference values.

No participant data has been written to the spreadsheet.
