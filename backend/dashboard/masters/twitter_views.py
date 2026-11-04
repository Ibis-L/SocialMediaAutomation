import re
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import WhatsAppDevice, TwitterTarget, TwitterTask, TwitterMedia, ScrapedArticle
from .serializers import TwitterTargetSerializer, TwitterTaskSerializer, TwitterMediaSerializer

# ─────────────────────────────────────────────────────────────────────────────
# TWITTER / X INTEGRATION VIEWSETS (SEPARATE MODULE TO PREVENT MERGE CONFLICTS)
# ─────────────────────────────────────────────────────────────────────────────

class TwitterTargetViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Twitter target handles / recipients.
    """
    queryset = TwitterTarget.objects.all().order_by('handle')
    serializer_class = TwitterTargetSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """
        Bulk import Twitter handles from raw multiline or comma-separated text.
        """
        handles_text = request.data.get('handles', '')
        category = request.data.get('category', 'General')
        device_id = request.data.get('device_id')
        device = None
        if device_id:
            device = WhatsAppDevice.objects.filter(id=device_id).first()
            
        raw_list = re.split(r'[\r\n,\s]+', handles_text)
        created_count = 0
        created_handles = []
        for h in raw_list:
            clean_h = h.strip()
            if not clean_h:
                continue
            if not clean_h.startswith('@'):
                clean_h = f"@{clean_h}"
            target, created = TwitterTarget.objects.get_or_create(
                handle=clean_h,
                defaults={'category': category, 'device': device}
            )
            if created:
                created_count += 1
                created_handles.append(clean_h)
        return Response({"success": True, "imported": created_count, "handles": created_handles})


class TwitterTaskViewSet(viewsets.ModelViewSet):
    """
    Manages queue and polling for automated Twitter tasks (DMs and Custom Tweets).
    """
    queryset = TwitterTask.objects.all().order_by('-created_at')
    serializer_class = TwitterTaskSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def enqueue_dm_bulk(self, request):
        """
        Enqueues news DM payload for multiple target handles across selected devices.
        Payload: { "tasks": [ { "device_id": 1, "target_handle": "@techcrunch", "content": "..." } ] }
        """
        tasks_data = request.data.get('tasks', [])
        created_count = 0
        for item in tasks_data:
            device_id = item.get('device_id')
            target_handle = item.get('target_handle', '').strip()
            content = item.get('content')
            
            if device_id and target_handle and content:
                try:
                    device = WhatsAppDevice.objects.get(id=device_id)
                    if not target_handle.startswith('@'):
                        target_handle = f"@{target_handle}"
                    TwitterTask.objects.create(
                        device=device,
                        task_type='DM',
                        target_handle=target_handle,
                        content=content,
                        status='PENDING'
                    )
                    created_count += 1
                except WhatsAppDevice.DoesNotExist:
                    continue
        return Response({"success": True, "queued": created_count})

    @action(detail=False, methods=['post'])
    def enqueue_tweet(self, request):
        """
        Enqueues a custom tweet to be posted from the selected device/account.
        Accepts application/json or multipart/form-data with optional images (up to 4) and hashtags.
        """
        device_id = request.data.get('device_id')
        content = request.data.get('content', '').strip()
        hashtags = request.data.get('hashtags', '').strip()
        article_id = request.data.get('article_id')

        if not device_id:
            return Response({"error": "device_id is required"}, status=400)
        
        # Twitter allows tweets with just images and no text, or text with images
        images = request.FILES.getlist('images') or request.FILES.getlist('files')
        if not content and not images:
            return Response({"error": "content or at least one image is required"}, status=400)
            
        try:
            device = WhatsAppDevice.objects.get(id=device_id)
            article = None
            if article_id:
                article = ScrapedArticle.objects.filter(id=article_id).first()

            task = TwitterTask.objects.create(
                device=device,
                task_type='TWEET',
                content=content,
                hashtags=hashtags,
                article=article,
                status='PENDING'
            )

            # Attach media files (max 4 per tweet as per Twitter limits)
            for order, img_file in enumerate(images[:4]):
                TwitterMedia.objects.create(
                    task=task,
                    file=img_file,
                    order=order
                )

            return Response({
                "success": True, 
                "task_id": task.id, 
                "image_count": min(len(images), 4),
                "message": f"Tweet queued for {device.name or device.phone_number}"
            })
        except WhatsAppDevice.DoesNotExist:
            return Response({"error": "Device not found"}, status=404)

    @action(detail=False, methods=['get'])
    def poll(self, request):
        """
        Called by Android companion app: /api/twitter/tasks/poll/?deviceId=device_id_or_phone
        Returns the oldest pending Twitter task for this device (DM or TWEET).
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

        # Fetch oldest pending Twitter task for this device
        task = TwitterTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()

        if task:
            task.status = 'PROCESSING'
            task.processed_at = timezone.now()
            task.save()

            media_urls = []
            for m in task.media_files.all().order_by('order'):
                if m.file:
                    url = request.build_absolute_uri(m.file.url) if request else m.file.url
                    media_urls.append(url)

            return Response({
                "hasTask": True,
                "taskId": task.id,
                "platform": "TWITTER",
                "taskType": task.task_type,
                "targetHandle": task.target_handle or "",
                "content": task.content,
                "hashtags": task.hashtags or "",
                "fullContent": task.full_content(),
                "mediaUrls": media_urls
            })

        return Response({"hasTask": False})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Called by Android App upon completing Twitter action.
        Payload: { "status": "COMPLETED" | "FOLLOWED_FALLBACK" | "FAILED", "result_message": "..." }
        """
        try:
            task = self.get_object()
            status_val = request.data.get('status', 'COMPLETED')
            result_msg = request.data.get('result_message', '')

            valid_statuses = ['COMPLETED', 'FOLLOWED_FALLBACK', 'FAILED']
            if status_val in valid_statuses:
                task.status = status_val
                task.result_message = result_msg
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            return Response({"error": "Invalid status"}, status=400)
        except TwitterTask.DoesNotExist:
            return Response({"error": "Task not found"}, status=404)
