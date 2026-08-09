from django.urls import path

from .views import (
    ConsultationOdontogramView,
    ConsultationOdontogramVersionCreateView,
    PatientOdontogramVersionDetailView,
    PatientOdontogramVersionListView,
    PatientConsultationDetailView,
    PatientConsultationListView,
    PatientDetailView,
    PatientListCreateView,
)


urlpatterns = [
    path("", PatientListCreateView.as_view(), name="patient-list-create"),
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
]
