from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import HasCapability

from .models import Consultation, OdontogramVersion, Patient
from .odontograms import OdontogramConflict
from .serializers import (
    ConsultationSerializer,
    OdontogramRevisionCreateSerializer,
    OdontogramVersionSerializer,
    OdontogramVersionSummarySerializer,
    PatientSerializer,
)


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


def professional_display_name(user):
    return user.get_full_name().strip() or user.email


class PatientConsultationListView(generics.ListCreateAPIView):
    serializer_class = ConsultationSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "consultations.view",
        "POST": "consultations.create",
    }

    def get_queryset(self):
        pk = self.kwargs["pk"]
        get_object_or_404(Patient, pk=pk)
        return Consultation.objects.select_related("professional").filter(patient_id=pk)

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs["pk"])
        serializer.save(
            patient=patient,
            professional=self.request.user,
            professional_name_snapshot=professional_display_name(self.request.user),
        )


class PatientConsultationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ConsultationSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "consultations.view",
        "PATCH": "consultations.edit",
        "DELETE": "consultations.edit",
    }
    http_method_names = ("get", "patch", "head", "options")

    def get_queryset(self):
        return Consultation.objects.select_related("professional").filter(
            patient_id=self.kwargs["patient_pk"]
        )


class ConsultationOdontogramView(generics.RetrieveAPIView):
    serializer_class = OdontogramVersionSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "consultations.view",
        "PATCH": "consultations.edit",
        "DELETE": "consultations.edit",
    }

    def get_object(self):
        consultation = get_object_or_404(
            Consultation,
            pk=self.kwargs["consultation_pk"],
            patient_id=self.kwargs["patient_pk"],
        )
        version = (
            OdontogramVersion.objects.select_related("consultation", "created_by")
            .filter(consultation=consultation)
            .order_by("-version_number")
            .first()
        )
        if version is None:
            raise Http404
        return version


class ConsultationOdontogramVersionCreateView(generics.CreateAPIView):
    serializer_class = OdontogramRevisionCreateSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "POST": "consultations.edit",
        "PATCH": "consultations.edit",
        "DELETE": "consultations.edit",
    }

    def get_consultation(self):
        return get_object_or_404(
            Consultation,
            pk=self.kwargs["consultation_pk"],
            patient_id=self.kwargs["patient_pk"],
        )

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "consultation": self.get_consultation(),
        }

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except OdontogramConflict as error:
            return Response(
                {
                    "detail": str(error),
                    "current_version_id": error.current_version_id,
                },
                status=status.HTTP_409_CONFLICT,
            )


class PatientOdontogramVersionListView(generics.ListAPIView):
    serializer_class = OdontogramVersionSummarySerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "consultations.view",
        "PATCH": "consultations.edit",
        "DELETE": "consultations.edit",
    }

    def get_queryset(self):
        patient = get_object_or_404(Patient, pk=self.kwargs["patient_pk"])
        return OdontogramVersion.objects.select_related(
            "consultation", "created_by"
        ).filter(patient=patient)


class PatientOdontogramVersionDetailView(generics.RetrieveAPIView):
    serializer_class = OdontogramVersionSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "consultations.view",
        "PATCH": "consultations.edit",
        "DELETE": "consultations.edit",
    }
    http_method_names = ("get", "head", "options")

    def get_queryset(self):
        return OdontogramVersion.objects.select_related(
            "consultation", "created_by"
        ).filter(patient_id=self.kwargs["patient_pk"])
