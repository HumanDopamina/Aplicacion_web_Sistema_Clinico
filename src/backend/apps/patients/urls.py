from django.urls import path

from .views import (
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
]
