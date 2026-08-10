from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils.http import content_disposition_header
from rest_framework import filters, generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import HasCapability

from .models import Consultation, OdontogramVersion, Patient, PatientDocument
from .odontograms import OdontogramConflict
from .serializers import (
    ConsultationSerializer,
    OdontogramRevisionCreateSerializer,
    OdontogramVersionSerializer,
    OdontogramVersionSummarySerializer,
    PatientSerializer,
    PatientDocumentBatchUploadSerializer,
    PatientDocumentSerializer,
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


class PatientDocumentListCreateView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    parser_classes = (MultiPartParser, FormParser)
    required_permissions = {
        "GET": "documents.view",
        "POST": "documents.create",
    }

    def get_patient(self):
        return get_object_or_404(Patient, pk=self.kwargs["patient_pk"])

    def get(self, request, patient_pk):
        self.get_patient()
        queryset = PatientDocument.objects.select_related("uploaded_by").filter(
            patient_id=patient_pk,
        )
        category = request.query_params.get("category", "").strip()
        search = request.query_params.get("search", "").strip()
        if category:
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(
                Q(original_name__icontains=search)
                | Q(category__icontains=search)
                | Q(notes__icontains=search)
            )
        return Response(PatientDocumentSerializer(queryset, many=True).data)

    def post(self, request, patient_pk):
        patient = self.get_patient()
        if not patient.is_active:
            return Response(
                {"detail": "El paciente está inactivo; sus documentos son de solo lectura."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PatientDocumentBatchUploadSerializer(
            data=request.data,
            context={"request": request, "patient": patient},
        )
        serializer.is_valid(raise_exception=True)
        documents = serializer.save()
        return Response(
            PatientDocumentSerializer(
                documents,
                many=True,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class PatientDocumentDeleteView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"DELETE": "documents.delete"}

    def delete(self, request, patient_pk, pk):
        patient = get_object_or_404(Patient, pk=patient_pk)
        document = get_object_or_404(PatientDocument, pk=pk, patient=patient)
        if not patient.is_active:
            return Response(
                {"detail": "El paciente está inactivo; sus documentos son de solo lectura."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        storage = document.file.storage
        stored_name = document.file.name
        document.delete()
        if stored_name:
            storage.delete(stored_name)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PatientDocumentContentView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "documents.view"}

    def get(self, request, patient_pk, pk):
        document = get_object_or_404(
            PatientDocument,
            pk=pk,
            patient_id=patient_pk,
        )
        as_attachment = request.query_params.get("download", "").lower() == "true"
        response = FileResponse(
            document.file.open("rb"),
            content_type=document.mime_type,
        )
        response["Content-Disposition"] = content_disposition_header(
            as_attachment,
            document.original_name,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class PatientDocumentCategoryListView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "documents.view"}

    def get(self, request):
        categories = PatientDocument.objects.order_by("category").values_list(
            "category",
            flat=True,
        )
        unique = {}
        for category in categories:
            unique.setdefault(category.casefold(), category)
        return Response(sorted(unique.values(), key=str.casefold))
