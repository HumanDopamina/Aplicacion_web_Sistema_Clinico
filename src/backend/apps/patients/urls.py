from django.urls import path

from .views import (
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
]
