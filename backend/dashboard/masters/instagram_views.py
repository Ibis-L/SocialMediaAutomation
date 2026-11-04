import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import WhatsAppDevice, InstagramTask, InstagramMedia, ScrapedArticle
from .serializers import InstagramTaskSerializer, InstagramMediaSerializer

VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'}

def detect_media_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    return 'video' if ext in VIDEO_EXTENSIONS else 'image'

class InstagramTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Instagram automation content tasks (Feed Posts, Stories, Reels).
    """
    queryset = InstagramTask.objects.all().order_by('-created_at')
    serializer_class = InstagramTaskSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def enqueue(self, request):
        """
        Enqueues an Instagram Post, Story, or Reel.
        Accepts multipart/form-data with:
        - device_id: ID of the phone
        - task_type: 'POST' | 'STORY' | 'REEL'
        - caption: Text caption
        - hashtags: Space or comma separated hashtags
        - article_id: (optional) Linked article
        - files: List of uploaded images/videos
        """
        device_id = request.data.get('device_id')
        task_type = request.data.get('task_type', 'POST').upper()
        caption = request.data.get('caption', '').strip()
        hashtags = request.data.get('hashtags', '').strip()
        article_id = request.data.get('article_id')

        if not device_id:
            return Response({"error": "device_id is required"}, status=400)

        if task_type not in ['POST', 'STORY', 'REEL']:
            return Response({"error": f"Invalid task_type: {task_type}. Must be POST, STORY, or REEL."}, status=400)

        uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('images') or request.FILES.getlist('media')
        if not uploaded_files and 'file' in request.FILES:
            uploaded_files = [request.FILES['file']]

        if not uploaded_files:
            return Response({"error": "At least one image or video file must be uploaded."}, status=400)

        try:
            device = WhatsAppDevice.objects.get(id=device_id)
        except WhatsAppDevice.DoesNotExist:
            return Response({"error": "Device not found"}, status=404)

        article = None
        if article_id:
            article = ScrapedArticle.objects.filter(id=article_id).first()

        # Validate task type specifics
        if task_type == 'REEL':
            # Reels require a video
            has_video = any(detect_media_type(f.name) == 'video' for f in uploaded_files)
            if not has_video:
                return Response({"error": "Instagram Reels require a video file (.mp4, .mov, etc.)."}, status=400)

        task = InstagramTask.objects.create(
            device=device,
            task_type=task_type,
            caption=caption,
            hashtags=hashtags,
            article=article,
            status='PENDING'
        )

        for order, f in enumerate(uploaded_files):
            media_type = detect_media_type(f.name)
            InstagramMedia.objects.create(
                task=task,
                file=f,
                media_type=media_type,
                order=order
            )

        return Response({
            "success": True,
            "task_id": task.id,
            "task_type": task.task_type,
            "media_count": len(uploaded_files),
            "message": f"Instagram {task_type} queued for {device.name or device.phone_number}"
        })

    @action(detail=False, methods=['get'])
    def poll(self, request):
        """
        Polled by Android companion app: /api/instagram/tasks/poll/?deviceId=...
        Returns the oldest pending Instagram content task for this device (POST/STORY/REEL).
        """
        device_identifier = request.query_params.get('deviceId')
        if not device_identifier:
            return Response({"hasTask": False, "error": "Missing deviceId query parameter"}, status=400)

        device = WhatsAppDevice.objects.filter(phone_number=device_identifier).first()
        if not device:
            clean_id = device_identifier.strip()
            device = WhatsAppDevice.objects.filter(phone_number=clean_id).first()
            if not device:
                device = WhatsAppDevice.objects.filter(phone_number='+' + clean_id).first()
            if not device and clean_id.isdigit():
                device = WhatsAppDevice.objects.filter(id=clean_id).first()

        if not device:
            return Response({"hasTask": False, "error": "Device not registered"})

        task = InstagramTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()

        if task:
            task.status = 'PROCESSING'
            task.processed_at = timezone.now()
            task.save()

            media_items = []
            for m in task.media_files.all().order_by('order'):
                if m.file:
                    url = request.build_absolute_uri(m.file.url) if request else m.file.url
                    media_items.append({
                        "url": url,
                        "mediaType": m.media_type,
                        "order": m.order
                    })

            return Response({
                "hasTask": True,
                "taskId": task.id,
                "platform": "INSTAGRAM",
                "taskType": f"INSTAGRAM_{task.task_type}",
                "subType": task.task_type,
                "caption": task.caption,
                "hashtags": task.hashtags,
                "fullCaption": task.full_caption(),
                "mediaFiles": media_items
            })

        return Response({"hasTask": False})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Report completion from Android Companion App.
        """
        try:
            task = self.get_object()
            status_val = request.data.get('status', 'COMPLETED')
            if status_val in ['COMPLETED', 'FAILED']:
                task.status = status_val
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            return Response({"error": "Invalid status"}, status=400)
        except InstagramTask.DoesNotExist:
            return Response({"error": "Task not found"}, status=404)
