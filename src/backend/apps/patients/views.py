from django.shortcuts import get_object_or_404
from rest_framework import filters, generics
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import HasCapability

from .models import Consultation, Patient
from .serializers import ConsultationSerializer, PatientSerializer


class PatientListCreateView(generics.ListCreateAPIView):
    queryset = Patient.objects.select_related("registered_by").all()
    serializer_class = PatientSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "patients.view",
        "POST": "patients.create",
    }
    filter_backends = (filters.SearchFilter,)
    search_fields = (
        "code",
        "first_name",
        "last_name",
        "second_last_name",
        "national_id",
        "phone",
        "email",
    )

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)


class PatientDetailView(generics.RetrieveUpdateAPIView):
    queryset = Patient.objects.select_related("registered_by").all()
    serializer_class = PatientSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "patients.view",
        "PATCH": "patients.edit",
    }
    http_method_names = ("get", "patch", "head", "options")


class PatientConsultationListView(generics.ListAPIView):
    serializer_class = ConsultationSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "patients.view"}

    def get_queryset(self):
        pk = self.kwargs["pk"]
        get_object_or_404(Patient, pk=pk)
        return Consultation.objects.select_related("professional").filter(patient_id=pk)
