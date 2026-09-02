# Patient Context Contracts and Agenda Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace oversized patient payloads with explicit summary, detail, and option contracts, and make the appointment form search active patients remotely without preloading the database.

**Architecture:** Keep the current full serializer behavior behind an explicit `PatientDetailSerializer`, use `PatientSummarySerializer` only for `GET /api/patients/`, and expose a bounded `PatientOptionSerializer` through `GET /api/patients/options/?search=`. The React appointment form owns a debounced, abortable remote search and preserves its selected option independently from subsequent result sets.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, native `AbortController`, Vitest, Testing Library.

## Global Constraints

- Implement only TEC-04 and HU-54.
- Do not implement HU-28, HU-44, HU-52, TEC-06, TEC-07, quick patient creation, flexible identification, tutors, clinical alerts, appointment-consultation linking, treatment items, or individual dentist schedules.
- Do not change patient models or create migrations.
- `GET /api/patients/` must remain paginated, searchable, and protected by `patients.view`.
- `GET /api/patients/<id>/` and patient creation/editing must retain the complete administrative and clinical contract.
- Patient options must be active-only, require two trimmed search characters, return at most 20 rows, and require `appointments.create` rather than clinical-record access.
- The agenda must not download all patient pages and must not request options for zero or one search character.
- Preserve all unrelated and pre-existing working-tree changes.

---

## File Map

- `src/backend/apps/patients/serializers.py`: explicit Summary, Detail, and Option response contracts.
- `src/backend/apps/patients/views.py`: method-specific serializer selection and bounded option search.
- `src/backend/apps/patients/urls.py`: `/api/patients/options/` route before the integer detail route.
- `src/backend/apps/patients/tests.py`: backend contract, permission, search, limit, and query-count evidence.
- `src/frontend/src/services/patientService.js`: small option-search request accepting an abort signal.
- `src/frontend/src/services/patientService.test.js`: exact request contract for patient options.
- `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`: stop loading all patients with the agenda.
- `src/frontend/src/pages/Appointments/AppointmentFormPanel.jsx`: debounced remote option state, cancellation, selection, and UX states.
- `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`: integration evidence that page loading does not fetch all patients and saved appointments keep the selected patient ID.
- `src/frontend/src/pages/Appointments/AppointmentFormPanel.test.jsx`: focused debounce, loading, empty, error, result, and selection tests.
- `docs/user-stories/HU-54-remote-patient-search.md`: acceptance evidence and verification commands.
- `README.md`: implemented-story summary.

---

### Task 1: Backend Patient Contracts

**Files:**
- Modify: `src/backend/apps/patients/tests.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`

**Interfaces:**
- Produces: `PatientSummarySerializer`, `PatientDetailSerializer`, and `PatientOptionSerializer`.
- Produces: `PatientListCreateView.get_serializer_class()` returning Summary for GET and Detail for POST.

- [ ] **Step 1: Write failing summary/detail tests**

Add tests that create a patient with a clinical record, request the collection and detail endpoints, and assert literal contracts:

```python
summary_fields = {
    "id", "code", "first_name", "last_name", "second_last_name",
    "full_name", "phone", "email", "date_of_birth", "is_active", "created_at",
}
self.assertEqual(set(list_response.data["results"][0]), summary_fields)
self.assertNotIn("clinical_record", list_response.data["results"][0])
self.assertIn("clinical_record", detail_response.data)
self.assertEqual(detail_response.data["clinical_record"]["chief_complaint"], "Dolor")
```

- [ ] **Step 2: Run tests and verify RED**

Run: `python manage.py test apps.patients.tests.PatientApiTests --settings=config.settings.test --noinput`

Expected: summary contract test fails because the current list returns `clinical_record`, address, emergency contacts, national ID, and other detail fields.

- [ ] **Step 3: Implement explicit serializers and method selection**

Define these literal fields:

```python
class PatientSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id", "code", "first_name", "last_name", "second_last_name",
            "full_name", "phone", "email", "date_of_birth", "is_active", "created_at",
        )
        read_only_fields = fields


class PatientOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = ("id", "code", "full_name", "phone", "date_of_birth")
        read_only_fields = fields
```

Rename the existing `PatientSerializer` to `PatientDetailSerializer`. In the list/create view return Summary for GET and Detail for POST; keep the detail view on Detail.

- [ ] **Step 4: Run backend patient tests and verify GREEN**

Run: `python manage.py test apps.patients.tests.PatientApiTests --settings=config.settings.test --noinput`

Expected: all `PatientApiTests` pass, including existing creation, edit, and clinical record assertions.

### Task 2: Bounded Patient Option Endpoint

**Files:**
- Modify: `src/backend/apps/patients/tests.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`

**Interfaces:**
- Produces: `GET /api/patients/options/?search=<text>` returning a JSON array of no more than 20 `PatientOptionSerializer` objects.
- Requires: effective permission `appointments.create`.

- [ ] **Step 1: Write failing option endpoint tests**

Cover empty/one-character search returning `[]`, name/code/phone/national-ID lookup, active-only results, exact option fields, 20-row cap, and permissions. Include a user with only `appointments.create` who receives options but gets 403 from `/api/patients/`.

- [ ] **Step 2: Run tests and verify RED**

Run: `python manage.py test apps.patients.tests.PatientOptionApiTests --settings=config.settings.test --noinput`

Expected: 404 because `/api/patients/options/` does not exist.

- [ ] **Step 3: Implement the bounded search**

Use DRF `SearchFilter` over current identifiers and cap the filtered queryset:

```python
class PatientOptionListView(generics.ListAPIView):
    serializer_class = PatientOptionSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "appointments.create"}
    filter_backends = (filters.SearchFilter,)
    pagination_class = None
    search_fields = (
        "code", "first_name", "last_name", "second_last_name",
        "national_id", "phone",
    )

    def get_queryset(self):
        if len(self.request.query_params.get("search", "").strip()) < 2:
            return Patient.objects.none()
        return Patient.objects.filter(is_active=True).order_by("first_name", "last_name", "pk")

    def filter_queryset(self, queryset):
        return super().filter_queryset(queryset)[:20]
```

Register `options/` before `<int:pk>/`.

- [ ] **Step 4: Run option tests and verify GREEN**

Run: `python manage.py test apps.patients.tests.PatientOptionApiTests --settings=config.settings.test --noinput`

Expected: all option contract, search, active, limit, and permission tests pass.

### Task 3: List Query Regression Evidence

**Files:**
- Modify: `src/backend/apps/patients/tests.py`

**Interfaces:**
- Verifies: patient list query count does not grow with one `ClinicalRecord` per patient and list SQL never selects the clinical-record table.

- [ ] **Step 1: Add the query regression test**

Use `CaptureQueriesContext(connection)` around authenticated list requests with one and then several patients. Assert equal query counts and assert that no captured SELECT contains `patients_clinicalrecord`.

- [ ] **Step 2: Run the test**

Run: `python manage.py test apps.patients.tests.PatientApiTests.test_patient_summary_does_not_query_one_clinical_record_per_patient --settings=config.settings.test --noinput`

Expected: pass after Task 1; mutation back to Detail for GET must make it fail by adding clinical-record SELECTs.

### Task 4: Frontend Option Search Service

**Files:**
- Modify: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/services/patientService.js`

**Interfaces:**
- Produces: `searchPatientOptions(access: string, search: string, signal?: AbortSignal): Promise<PatientOption[]>`.

- [ ] **Step 1: Write the failing service test**

```javascript
const controller = new AbortController()
searchPatientOptions('token', 'Ana Pérez', controller.signal)
expect(apiRequest).toHaveBeenCalledWith(
  '/api/patients/options/?search=Ana%20P%C3%A9rez',
  { headers: { Authorization: 'Bearer token' }, signal: controller.signal },
)
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/services/patientService.test.js`

Expected: import/export failure because `searchPatientOptions` does not exist.

- [ ] **Step 3: Implement the request**

Build the encoded query with `URLSearchParams`, normalize spaces as `%20`, pass authentication and the optional signal directly to `apiRequest`.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- src/services/patientService.test.js`

Expected: all patient service tests pass.

### Task 5: Debounced Appointment Patient Selector

**Files:**
- Create: `src/frontend/src/pages/Appointments/AppointmentFormPanel.test.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.jsx`

**Interfaces:**
- Consumes: `searchPatientOptions(accessToken, trimmedSearch, abortSignal)`.
- Preserves: numeric `patient` in the existing appointment payload.

- [ ] **Step 1: Write focused failing component tests**

Render the real form with only network services mocked. Cover:

```javascript
fireEvent.change(screen.getByLabelText("Buscar paciente"), { target: { value: "A" } })
await act(() => vi.advanceTimersByTimeAsync(400))
expect(searchPatientOptions).not.toHaveBeenCalled()
```

Then test a 300 ms debounce, loading text while a deferred promise is pending, returned options, empty text, API error, selection preservation after changing search text, and submission with `patient: 7`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/pages/Appointments/AppointmentFormPanel.test.jsx`

Expected: failures because the current component filters a preloaded `patients` prop and never requests remote options.

- [ ] **Step 3: Implement minimal remote-search state**

Remove the `patients` prop and local filtering. Add `patientOptions`, `selectedPatient`, `loadingPatients`, and `patientSearchError`. An effect must return early below two trimmed characters; otherwise schedule a 300 ms timer, create an `AbortController`, request options, ignore `AbortError`, and abort/clear on cleanup. Build visible options by prepending the selected patient when absent from the latest result set.

- [ ] **Step 4: Render explicit UX states**

Show instructions below two characters, `Buscando pacientes…`, an inline API alert, `No encontramos pacientes.`, and a select containing the selected patient plus current results. Do not add quick-create actions.

- [ ] **Step 5: Run and verify GREEN**

Run: `npm test -- src/pages/Appointments/AppointmentFormPanel.test.jsx`

Expected: all focused form tests pass with no timer or act warnings.

### Task 6: Remove Agenda-Wide Patient Download

**Files:**
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`

**Interfaces:**
- Appointments page passes no patient collection to the form.
- Agenda loading fetches only appointments and clinic services in parallel.

- [ ] **Step 1: Update integration tests first**

Assert that initial agenda rendering never calls `listAllPatients`. Update create/conflict flows to type at least two characters, resolve `searchPatientOptions`, select the returned patient, and assert `createAppointment` receives `patient: 1`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/pages/Appointments/AppointmentsPage.test.jsx`

Expected: negative fetch assertion fails because `loadAgenda()` still calls `listAllPatients()`.

- [ ] **Step 3: Remove the bulk patient dependency**

Delete the import, `patients` state, `listAllPatients()` promise, result filtering, and `patients` prop. Keep appointments and services loaded in the same parallel request.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- src/pages/Appointments/AppointmentsPage.test.jsx`

Expected: all agenda integration tests pass and create submits the selected patient ID.

### Task 7: Documentation and Full Verification

**Files:**
- Create: `docs/user-stories/HU-54-remote-patient-search.md`
- Modify: `README.md`

**Interfaces:**
- Documents the three contracts, endpoint, two-character policy, permission boundary, query limit, and verification evidence.

- [ ] **Step 1: Document acceptance evidence**

Record Summary/Detail/Option fields, `appointments.create` permission, 20-result cap, active-only policy, debounce/cancellation, no-clinical-data assertions, and commands below.

- [ ] **Step 2: Run backend verification**

```powershell
python manage.py test apps.patients --settings=config.settings.test --noinput
python manage.py test apps.appointments --settings=config.settings.test --noinput
python manage.py test --settings=config.settings.test --noinput
python manage.py check --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.test
```

- [ ] **Step 3: Run frontend verification**

```powershell
npm test -- src/pages/Appointments/AppointmentsPage.test.jsx src/pages/Appointments/AppointmentFormPanel.test.jsx
npm test
npm run lint
npm run build
```

- [ ] **Step 4: Review scope and diff**

Run `git status --short`, inspect `git diff` for every touched file, and run `git diff --check`. Confirm no model, migration, dependency, backlog, HU-28, HU-44, or HU-52 changes.
