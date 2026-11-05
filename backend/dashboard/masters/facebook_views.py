import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import WhatsAppDevice, FacebookTask, FacebookMedia, ScrapedArticle
from .serializers import FacebookTaskSerializer, FacebookMediaSerializer

VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'}

def detect_media_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    return 'video' if ext in VIDEO_EXTENSIONS else 'image'

class FacebookTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Facebook automation tasks (Feed Posts, Images, Videos, and DMs).
    """
    queryset = FacebookTask.objects.all().order_by('-created_at')
    serializer_class = FacebookTaskSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def enqueue_post(self, request):
        """
        Enqueues a Facebook Feed Post (text, image, or video).
        Accepts multipart/form-data with:
        - device_id: ID of the phone
        - caption: Text caption / status content
        - article_id: (optional) Linked article
        - files: (optional) List of uploaded images or videos
        """
        device_id = request.data.get('device_id')
        caption = request.data.get('caption', '').strip()
        article_id = request.data.get('article_id')

        if not device_id:
            return Response({"error": "device_id is required"}, status=400)

        try:
            device = WhatsAppDevice.objects.get(id=device_id)
        except (WhatsAppDevice.DoesNotExist, ValueError):
            return Response({"error": "Device not found"}, status=404)

        article = None
        if article_id:
            article = ScrapedArticle.objects.filter(id=article_id).first()

        uploaded_files = (
            request.FILES.getlist('files') or 
            request.FILES.getlist('images') or 
            request.FILES.getlist('media')
        )
        if not uploaded_files and 'file' in request.FILES:
            uploaded_files = [request.FILES['file']]

        if not caption and not uploaded_files:
            return Response({"error": "Either caption text or at least one media file is required."}, status=400)

        task = FacebookTask.objects.create(
            device=device,
            task_type='POST',
            caption=caption,
            article=article,
            status='PENDING'
        )

        for order, f in enumerate(uploaded_files):
            media_type = detect_media_type(f.name)
            FacebookMedia.objects.create(
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
            "message": f"Facebook Post queued for {device.name or device.phone_number}"
        })

    @action(detail=False, methods=['post'])
    def enqueue_dm(self, request):
        """
        Enqueues one or more Facebook Direct Message / Share Link tasks.
        Payload:
        {
            "device_id": 1,
            "tasks": [
                {"target_url": "https://www.facebook.com/share/...", "caption": "..."}
            ]
        }
        Or single task:
        {"device_id": 1, "target_url": "...", "caption": "..."}
        """
        device_id = request.data.get('device_id')
        if not device_id:
            return Response({"error": "device_id is required"}, status=400)

        try:
            device = WhatsAppDevice.objects.get(id=device_id)
        except (WhatsAppDevice.DoesNotExist, ValueError):
            return Response({"error": "Device not found"}, status=404)

        tasks_list = request.data.get('tasks')
        created_tasks = []

        if isinstance(tasks_list, list) and len(tasks_list) > 0:
            for item in tasks_list:
                target_url = item.get('target_url') or item.get('contact_number') or ''
                caption = item.get('caption') or item.get('message') or ''
                if target_url or caption:
                    t = FacebookTask.objects.create(
                        device=device,
                        task_type='DM',
                        target_url=target_url,
                        caption=caption,
                        status='PENDING'
                    )
                    created_tasks.append(t.id)
        else:
            target_url = request.data.get('target_url', '').strip()
            caption = request.data.get('caption', request.data.get('message', '')).strip()
            if not target_url and not caption:
                return Response({"error": "target_url or caption is required"}, status=400)

            t = FacebookTask.objects.create(
                device=device,
                task_type='DM',
                target_url=target_url,
                caption=caption,
                status='PENDING'
            )
            created_tasks.append(t.id)

        return Response({
            "success": True,
            "count": len(created_tasks),
            "task_ids": created_tasks,
            "message": f"Enqueued {len(created_tasks)} Facebook task(s)"
        })

    @action(detail=False, methods=['get'])
    def poll(self, request):
        """
        Polled by Android companion app: /masters/api/facebook/tasks/poll/?deviceId=...
        Returns the oldest pending Facebook task (POST or DM).
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

        task = FacebookTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()

        if task:
            task.status = 'PROCESSING'
            task.processed_at = timezone.now()
            task.save()

            media_items = []
            media_urls = []
            for m in task.media_files.all().order_by('order'):
                if m.file:
                    url = request.build_absolute_uri(m.file.url) if request else m.file.url
                    media_items.append({
                        "url": url,
                        "mediaType": m.media_type,
                        "order": m.order
                    })
                    media_urls.append(url)

            return Response({
                "hasTask": True,
                "taskId": task.id,
                "platform": "FACEBOOK",
                "taskType": f"FACEBOOK_{task.task_type}",
                "subType": task.task_type,
                "caption": task.caption,
                "message": task.caption,
                "targetHandle": task.target_url or "",
                "mediaFiles": media_items,
                "mediaUrls": media_urls
            })

        return Response({"hasTask": False})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Report completion from Android Companion App:
        POST /masters/api/facebook/tasks/<id>/complete/
        """
        try:
            task = self.get_object()
            status_val = request.data.get('status', 'COMPLETED')
            result_message = request.data.get('result_message', '')
            if status_val in ['COMPLETED', 'FAILED']:
                task.status = status_val
                if result_message:
                    task.result_message = result_message
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            return Response({"error": "Invalid status"}, status=400)
        except FacebookTask.DoesNotExist:
            return Response({"error": "Task not found"}, status=404)

