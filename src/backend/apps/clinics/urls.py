from django.urls import path

from .views import (
    BusinessHoursView,
    ClinicProfileOptionsView,
    ClinicProfileView,
    ClinicServiceDetailView,
    ClinicServiceListCreateView,
    HolidayClosureDetailView,
    HolidayClosureListCreateView,
    ServiceCategoryDetailView,
    ServiceCategoryListCreateView,
)


urlpatterns = [
    path("profile/", ClinicProfileView.as_view(), name="clinic-profile"),
    path("profile/options/", ClinicProfileOptionsView.as_view(), name="clinic-profile-options"),
    path("business-hours/", BusinessHoursView.as_view(), name="business-hours"),
    path("closures/", HolidayClosureListCreateView.as_view(), name="closure-list-create"),
    path("closures/<int:pk>/", HolidayClosureDetailView.as_view(), name="closure-detail"),
    path("service-categories/", ServiceCategoryListCreateView.as_view(), name="category-list-create"),
    path("service-categories/<int:pk>/", ServiceCategoryDetailView.as_view(), name="category-detail"),
    path("services/", ClinicServiceListCreateView.as_view(), name="service-list-create"),
    path("services/<int:pk>/", ClinicServiceDetailView.as_view(), name="service-detail"),
]
