from django.urls import path

from .views import AppointmentDetailView, AppointmentListCreateView, DentistAvailabilityView


urlpatterns = [
    path("", AppointmentListCreateView.as_view(), name="appointment-list-create"),
    path(
        "dentists/availability/",
        DentistAvailabilityView.as_view(),
        name="dentist-availability",
    ),
    path("<int:pk>/", AppointmentDetailView.as_view(), name="appointment-detail"),
]
