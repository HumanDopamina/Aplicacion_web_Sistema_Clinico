from django.urls import path

from .views import (
    ConsultationOdontogramView,
    ConsultationOdontogramVersionCreateView,
    PatientOdontogramVersionDetailView,
    PatientOdontogramVersionListView,
    PatientConsultationDetailView,
    PatientConsultationListView,
    PatientDashboardSummaryView,
    PatientDetailView,
    PatientDocumentCategoryListView,
    PatientDocumentContentView,
    PatientDocumentDeleteView,
    PatientDocumentListCreateView,
    PatientListCreateView,
    RecentConsultationListView,
)


urlpatterns = [
    path("", PatientListCreateView.as_view(), name="patient-list-create"),
    path(
        "document-categories/",
        PatientDocumentCategoryListView.as_view(),
        name="patient-document-categories",
    ),
    path(
        "consultations/recent/",
        RecentConsultationListView.as_view(),
        name="recent-consultation-list",
    ),
    path(
        "dashboard-summary/",
        PatientDashboardSummaryView.as_view(),
        name="patient-dashboard-summary",
    ),
    path("<int:pk>/", PatientDetailView.as_view(), name="patient-detail"),
    path(
        "<int:pk>/consultations/",
        PatientConsultationListView.as_view(),
        name="patient-consultation-list",
    ),
    path(
        "<int:patient_pk>/consultations/<int:pk>/",
        PatientConsultationDetailView.as_view(),
        name="patient-consultation-detail",
    ),
    path(
        "<int:patient_pk>/consultations/<int:consultation_pk>/odontogram/",
        ConsultationOdontogramView.as_view(),
        name="consultation-odontogram",
    ),
    path(
        "<int:patient_pk>/consultations/<int:consultation_pk>/odontogram/versions/",
        ConsultationOdontogramVersionCreateView.as_view(),
        name="consultation-odontogram-version-create",
    ),
    path(
        "<int:patient_pk>/odontogram-versions/",
        PatientOdontogramVersionListView.as_view(),
        name="patient-odontogram-version-list",
    ),
    path(
        "<int:patient_pk>/odontogram-versions/<int:pk>/",
        PatientOdontogramVersionDetailView.as_view(),
        name="patient-odontogram-version-detail",
    ),
    path(
        "<int:patient_pk>/documents/",
        PatientDocumentListCreateView.as_view(),
        name="patient-document-list-create",
    ),
    path(
        "<int:patient_pk>/documents/<int:pk>/",
        PatientDocumentDeleteView.as_view(),
        name="patient-document-delete",
    ),
    path(
        "<int:patient_pk>/documents/<int:pk>/content/",
        PatientDocumentContentView.as_view(),
        name="patient-document-content",
    ),
]
