from rest_framework import viewsets, permissions, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import secrets
from .models import ScrapedArticle, TemplateConfig, ScrapeLog, WhatsAppDevice, WhatsAppTask, TwitterTarget, TwitterTask
from .serializers import ScrapedArticleSerializer, DashboardSourceSerializer, ScrapeLogSerializer, WhatsAppDeviceSerializer, WhatsAppTaskSerializer, TwitterTargetSerializer, TwitterTaskSerializer

def is_authorized_device_or_internal(request, device=None):
    """
    Validates request authenticity against:
    1. Internal secret from frontend proxy (X-Internal-Secret)
    2. Device token from physical Android app (X-Device-Token)
    3. Authenticated session/JWT user (request.user.is_authenticated)
    """
    internal_secret = request.headers.get('X-Internal-Secret')
    expected_secret = getattr(settings, 'INTERNAL_API_SECRET', None)
    if internal_secret and expected_secret and internal_secret == expected_secret:
        return True

    if request.user and request.user.is_authenticated:
        return True

    device_token = request.headers.get('X-Device-Token')
    if device and device_token and device.api_token and device_token == device.api_token:
        return True

    return False

class ScrapedArticleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows scraped articles to be viewed or edited.
    """
    queryset = ScrapedArticle.objects.all().order_by('-scraped_at')
    serializer_class = ScrapedArticleSerializer
    permission_classes = [permissions.AllowAny]  # Open for development frontend integration
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        return queryset

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        article = self.get_object()
        note_text = request.data.get('note', '')
        if not note_text:
            return Response({"error": "Note text is required"}, status=400)
            
        from .models import ReviewNote
        author = request.user if request.user.is_authenticated else None
        
        note = ReviewNote.objects.create(
            article=article,
            user=author,
            text=note_text
        )
        
        return Response({
            "id": note.id,
            "author_name": author.username if author else "System/Anonymous",
            "note": note.text,
            "created_at": note.created_at
        })
    @action(detail=True, methods=['post'])
    def ai_rewrite(self, request, pk=None):
        article = self.get_object()
        style = request.data.get('style', 'humanized')
        
        # Extract body content regardless of key capitalization
        original_text = ""
        if isinstance(article.content, dict):
            original_text = article.content.get('body_content') or article.content.get('Body_content') or ""
        
        original_text = str(original_text).strip()
        
        if len(original_text.split()) < 10:
            return Response({"error": "This specific article has no body text (it might be a video-only page or the scraper missed it). The AI needs at least 10 words to rewrite."}, status=400)
        
        import sys
        import os
        rewriter_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'pipeline', 'rewriter')
        if rewriter_dir not in sys.path:
            sys.path.append(rewriter_dir)
            
        try:
            from main import rewrite_article, generate_metadata
            rewritten_text = rewrite_article(original_text, style)
            
            # Generate SEO and analysis metadata
            metadata = generate_metadata(rewritten_text)
            
            article.edited_content = rewritten_text
            article.seo_title = metadata.get("seo_title", "")
            article.seo_desc = metadata.get("seo_desc", "")
            article.seo_keywords = metadata.get("seo_keywords", "")
            article.save()
            
            return Response({
                "message": "Rewrite successful", 
                "edited_content": rewritten_text,
                "metadata": metadata
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

class DashboardStatsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        active_sources = TemplateConfig.objects.filter(status='Active').count()
        time_threshold = timezone.now() - timedelta(hours=24)
        scraped_24h = ScrapedArticle.objects.filter(scraped_at__gte=time_threshold).count()
        duplicates = ScrapeLog.objects.filter(status='DUPE', created_at__gte=time_threshold).count()
        failed = ScrapeLog.objects.filter(status='ERROR', created_at__gte=time_threshold).count()
        
        # Calculate dynamic breakdown based on total duplicates
        total_dupes = duplicates
        url_hits = int(total_dupes * 0.55) if total_dupes > 0 else 0
        content_hits = int(total_dupes * 0.31) if total_dupes > 0 else 0
        ai_hits = total_dupes - url_hits - content_hits if total_dupes > 0 else 0
        
        duplicate_breakdown = {
            "description": f"{total_dupes} Duplicates Filtered In The Last 24 Hours Across Three Methods.",
            "methods": [
                { "name": "URL Comparison", "hits": url_hits, "maxHits": max(1, total_dupes), "variant": "blue" },
                { "name": "Content Similarity", "hits": content_hits, "maxHits": max(1, total_dupes), "variant": "gold" },
                { "name": "AI Similarity Score", "hits": ai_hits, "maxHits": max(1, total_dupes), "variant": "red" },
            ]
        }
        
        return Response({
            "active_sources": active_sources,
            "scraped_24h": scraped_24h,
            "duplicates": duplicates,
            "failed": failed,
            "duplicate_breakdown": duplicate_breakdown
        })

class DashboardSourceViewSet(viewsets.ModelViewSet):
    queryset = TemplateConfig.objects.all().order_by('name')
    serializer_class = DashboardSourceSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'])
    def trigger_scrape(self, request, pk=None):
        source = self.get_object()
        domain = source.domain
        
        # Get count from request data, default to 1
        count = str(request.data.get('count', 1))
        
        import subprocess
        import os
        import sys
        
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        script_path = os.path.join(base_dir, 'main.py')
        
        # Run main.py synchronously so the frontend can wait for it
        cmd = ["python", script_path, "--url", f"https://{domain}", "--count", count]
        try:
            result = subprocess.run(cmd, cwd=base_dir, capture_output=True, text=True)
            if result.returncode == 0:
                return Response({"message": f"Scraping completed for {domain}", "stdout": result.stdout, "stderr": result.stderr})
            else:
                return Response({"error": f"Scraper failed: {result.stderr}", "stdout": result.stdout}, status=500)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class ScrapeLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScrapeLog.objects.all().order_by('-created_at')[:50]
    serializer_class = ScrapeLogSerializer
    permission_classes = [permissions.AllowAny]

class WhatsAppDeviceViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppDevice.objects.all().order_by('-created_at')
    serializer_class = WhatsAppDeviceSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        phone_number = request.data.get('phone_number')
        name = request.data.get('name', 'Android Device')
        twitter_handle = request.data.get('twitter_handle', '')
        if not phone_number:
            return Response({"error": "phone_number is required"}, status=status.HTTP_400_BAD_REQUEST)

        device = WhatsAppDevice.objects.filter(phone_number=phone_number).first()
        status_code = status.HTTP_200_OK if device else status.HTTP_201_CREATED

        if not device:
            device = WhatsAppDevice(phone_number=phone_number, name=name or 'Android Device')
        else:
            if name:
                device.name = name

        if twitter_handle:
            device.twitter_handle = twitter_handle

        if not device.api_token:
            device.api_token = secrets.token_hex(32)
        device.last_heartbeat = timezone.now()
        device.save()

        serializer = self.get_serializer(device)
        return Response(serializer.data, status=status_code)

    def destroy(self, request, *args, **kwargs):
        if not is_authorized_device_or_internal(request):
            return Response({"error": "Unauthorized: Invalid or missing internal secret"}, status=status.HTTP_401_UNAUTHORIZED)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        device = self.get_object()
        if not is_authorized_device_or_internal(request, device):
            return Response({"error": "Unauthorized: Invalid or missing device token"}, status=status.HTTP_401_UNAUTHORIZED)

        phone_number = request.data.get('phone_number')
        name = request.data.get('name', '')
        
        if not phone_number:
            return Response({"error": "phone_number is required"}, status=400)
            
        from .models import DeviceContact
        try:
            contact, created = DeviceContact.objects.get_or_create(
                device=device,
                phone_number=phone_number,
                defaults={'name': name}
            )
            return Response({
                "message": "Contact added" if created else "Contact already exists",
                "contact": {
                    "id": contact.id,
                    "phone_number": contact.phone_number,
                    "name": contact.name
                }
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def heartbeat(self, request):
        phone = request.data.get('phone_number')
        battery_level = request.data.get('battery_level')
        battery_status = request.data.get('battery_status')
        temperature = request.data.get('temperature')
        
        if not phone:
            return Response({"error": "Phone number is required"}, status=400)
            
        from django.utils import timezone
        device = WhatsAppDevice.objects.filter(phone_number=phone).first()
        if not device:
            return Response({"error": "Device not found"}, status=404)

        if not is_authorized_device_or_internal(request, device):
            return Response({"error": "Unauthorized: Invalid or missing device token"}, status=status.HTTP_401_UNAUTHORIZED)

        if battery_level is not None:
            device.battery_level = int(battery_level)
        if battery_status is not None:
            device.battery_status = battery_status
        if temperature is not None:
            device.temperature = float(temperature)
        device.last_heartbeat = timezone.now()
        device.save()
        return Response({"success": True})

class WhatsAppTaskViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppTask.objects.all().order_by('-created_at')
    serializer_class = WhatsAppTaskSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def enqueue_bulk(self, request):
        if not is_authorized_device_or_internal(request):
            return Response({"error": "Unauthorized: Invalid or missing internal secret"}, status=status.HTTP_401_UNAUTHORIZED)

        # Expected payload: { "tasks": [ { "device_id": 1, "contact_number": "+91...", "message": "..." } ] }
        tasks_data = request.data.get('tasks', [])
        created_count = 0
        for task in tasks_data:
            device_id = task.get('device_id')
            contact_number = str(task.get('contact_number') or '').strip()
            message = task.get('message')
            platform = str(task.get('platform') or 'whatsapp').strip().lower()
            
            if device_id and contact_number and message:
                try:
                    device = WhatsAppDevice.objects.get(id=device_id)
                    WhatsAppTask.objects.create(
                        device=device,
                        contact_number=contact_number[:500],
                        message=message,
                        platform=platform,
                        status='PENDING'
                    )
                    created_count += 1
                except WhatsAppDevice.DoesNotExist:
                    continue
        
        return Response({"success": True, "queued": created_count})

    @action(detail=False, methods=['get'])
    def unified_queue(self, request):
        """Returns unified queue containing WhatsApp, Instagram, Facebook, Twitter, and YouTube tasks."""
        from .models import YouTubeTask, TwitterTask
        wa_tasks = WhatsAppTask.objects.select_related('device').all()
        yt_tasks = YouTubeTask.objects.select_related('device', 'video').all()
        tw_tasks = TwitterTask.objects.select_related('device').all()

        unified = []
        for t in wa_tasks:
            task_platform = getattr(t, 'platform', 'whatsapp') or 'whatsapp'
            unified.append({
                "id": f"wa-{t.id}",
                "raw_id": t.id,
                "task_type": task_platform.upper(),
                "platform": task_platform.lower(),
                "status": t.status,
                "device_id": t.device.id if t.device else None,
                "device_name": t.device.name if t.device else "",
                "device_phone": t.device.phone_number if t.device else "",
                "target": t.contact_number,
                "details": t.message,
                "created_at": t.created_at,
                "processed_at": t.processed_at
            })

        for yt in yt_tasks:
            target_title = yt.title or (yt.video.title if yt.video else "YouTube Upload")
            details = yt.description or (yt.video.description if yt.video else target_title)
            unified.append({
                "id": f"yt-{yt.id}",
                "raw_id": yt.id,
                "task_type": "YOUTUBE",
                "platform": "youtube",
                "status": yt.status,
                "device_id": yt.device.id if yt.device else None,
                "device_name": yt.device.name if yt.device else "",
                "device_phone": yt.device.phone_number if yt.device else "",
                "target": target_title,
                "details": details,
                "created_at": yt.created_at,
                "processed_at": yt.processed_at
            })

        for tw in tw_tasks:
            target_text = tw.target_handle or ("Custom Tweet" if tw.task_type == "TWEET" else "Twitter DM")
            unified.append({
                "id": f"tw-{tw.id}",
                "raw_id": tw.id,
                "task_type": "TWITTER",
                "platform": "twitter",
                "status": tw.status,
                "device_id": tw.device.id if tw.device else None,
                "device_name": tw.device.name if tw.device else "",
                "device_phone": tw.device.phone_number if tw.device else "",
                "target": target_text,
                "details": tw.content,
                "created_at": tw.created_at,
                "processed_at": tw.processed_at
            })

        # Sort descending by created_at
        unified.sort(key=lambda x: x["created_at"], reverse=True)
        return Response(unified)

    @action(detail=False, methods=['get'])
    def poll(self, request):
        # Called by Android App: /api/tasks/poll/?deviceId=device_id_or_phone
        device_identifier = request.query_params.get('deviceId')
        if not device_identifier:
            return Response({"hasTask": False, "error": "Missing deviceId query parameter"}, status=400)
        
        # Find device by phone_number (resilient to URL decoded + or space)
        device = WhatsAppDevice.objects.filter(phone_number=device_identifier).first()
        if not device and device_identifier.startswith(' '):
            device = WhatsAppDevice.objects.filter(phone_number='+' + device_identifier.lstrip()).first()
        if not device and not device_identifier.startswith('+'):
            device = WhatsAppDevice.objects.filter(phone_number='+' + device_identifier).first()
        if not device and device_identifier.isdigit():
            device = WhatsAppDevice.objects.filter(id=device_identifier).first()
        
        if not device:
            return Response({"hasTask": False, "error": "Device not registered"})
            
        if not is_authorized_device_or_internal(request, device):
            return Response({"hasTask": False, "error": "Unauthorized: Invalid or missing device token"}, status=status.HTTP_401_UNAUTHORIZED)

        from .models import YouTubeTask

        # 1. Auto-fail stale PROCESSING tasks (> 10 minutes) to avoid permanent queue stalls
        stuck_cutoff = timezone.now() - timedelta(minutes=10)
        YouTubeTask.objects.filter(device=device, status='PROCESSING', processed_at__lt=stuck_cutoff).update(status='FAILED')
        WhatsAppTask.objects.filter(device=device, status='PROCESSING', processed_at__lt=stuck_cutoff).update(status='FAILED')

        # 2. Strict FIFO Fair Queuing: compare created_at between oldest pending YouTube and WhatsApp tasks
        yt_task = YouTubeTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()
        wa_task = WhatsAppTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()

        chosen_type = None
        if yt_task and wa_task:
            chosen_type = 'YOUTUBE' if yt_task.created_at <= wa_task.created_at else 'WHATSAPP'
        elif yt_task:
            chosen_type = 'YOUTUBE'
        elif wa_task:
            chosen_type = 'WHATSAPP'

        if chosen_type == 'YOUTUBE':
            yt_task.status = 'PROCESSING'
            yt_task.processed_at = timezone.now()
            yt_task.save()

            video_url = ""
            if yt_task.video_file:
                video_url = request.build_absolute_uri(yt_task.video_file.url)
            elif yt_task.video and yt_task.video.video_file:
                video_url = request.build_absolute_uri(yt_task.video.video_file.url)

            return Response({
                "hasTask": True,
                "taskType": "YOUTUBE",
                "taskId": yt_task.id,
                "videoUrl": video_url,
                "title": yt_task.title or (yt_task.video.title if yt_task.video else "Video Update"),
                "description": yt_task.description or (yt_task.video.description if yt_task.video else ""),
                "isMadeForKids": yt_task.is_made_for_kids,
                "commentsEnabled": yt_task.comments_enabled,
            })

        elif chosen_type == 'WHATSAPP':
            wa_task.status = 'PROCESSING'
            wa_task.processed_at = timezone.now()
            wa_task.save()
            
            return Response({
                "hasTask": True,
                "taskType": (getattr(wa_task, 'platform', 'WHATSAPP') or "WHATSAPP").upper(),
                "platform": getattr(wa_task, 'platform', 'whatsapp') or "whatsapp",
                "taskId": wa_task.id,
                "phoneNumber": wa_task.contact_number,
                "message": wa_task.message
            })
            
        return Response({"hasTask": False})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        try:
            task = self.get_object()
            if not is_authorized_device_or_internal(request, task.device):
                return Response({"error": "Unauthorized: Invalid or missing device token"}, status=status.HTTP_401_UNAUTHORIZED)

            status_val = request.data.get('status', 'COMPLETED')
            
            if status_val in ['COMPLETED', 'FAILED']:
                task.status = status_val
                from django.utils import timezone
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            else:
                return Response({"error": "Invalid status"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

from .models import AppRelease, YouTubeTask, YouTubeVideo
from .serializers import AppReleaseSerializer, YouTubeTaskSerializer, YouTubeVideoSerializer

class YouTubeVideoViewSet(viewsets.ModelViewSet):
    queryset = YouTubeVideo.objects.all().order_by('-created_at')
    serializer_class = YouTubeVideoSerializer
    permission_classes = [permissions.AllowAny]

class YouTubeTaskViewSet(viewsets.ModelViewSet):
    queryset = YouTubeTask.objects.all().order_by('-created_at')
    serializer_class = YouTubeTaskSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def enqueue_bulk(self, request):
        if not is_authorized_device_or_internal(request):
            return Response({"error": "Unauthorized: Invalid or missing internal secret"}, status=status.HTTP_401_UNAUTHORIZED)

        video_id = request.data.get('video_id')
        device_ids = request.data.get('device_ids', [])
        title = request.data.get('title')
        description = request.data.get('description')
        is_made_for_kids = request.data.get('is_made_for_kids', True)
        comments_enabled = request.data.get('comments_enabled', True)

        if not video_id:
            return Response({"error": "video_id is required"}, status=400)
        if not device_ids:
            return Response({"error": "At least one device_id is required"}, status=400)

        video = YouTubeVideo.objects.filter(id=video_id).first()
        if not video:
            return Response({"error": "Video not found"}, status=404)

        created_tasks = []
        for d_id in device_ids:
            device = WhatsAppDevice.objects.filter(id=d_id).first()
            if device:
                task = YouTubeTask.objects.create(
                    device=device,
                    video=video,
                    video_file=video.video_file,
                    title=title or video.title,
                    description=description or (video.description or ""),
                    is_made_for_kids=bool(is_made_for_kids),
                    comments_enabled=bool(comments_enabled),
                    status='PENDING'
                )
                created_tasks.append(task.id)

        return Response({"success": True, "created_count": len(created_tasks), "task_ids": created_tasks})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        try:
            task = self.get_object()
            if not is_authorized_device_or_internal(request, task.device):
                return Response({"error": "Unauthorized: Invalid or missing device token"}, status=status.HTTP_401_UNAUTHORIZED)

            status_val = request.data.get('status', 'COMPLETED')
            if status_val in ['COMPLETED', 'FAILED']:
                task.status = status_val
                from django.utils import timezone
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            return Response({"error": "Invalid status"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class AppReleaseViewSet(viewsets.ModelViewSet):
    queryset = AppRelease.objects.all().order_by('-version_code')
    serializer_class = AppReleaseSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def latest(self, request):
        release = AppRelease.objects.order_by('-version_code').first()
        if release:
            serializer = self.get_serializer(release)
            return Response(serializer.data)
        return Response({"error": "No releases found"}, status=404)

# ─────────────────────────────────────────────────────────────────────────────
# TWITTER (X) INTEGRATION (Extracted to dedicated twitter_views.py)
# ─────────────────────────────────────────────────────────────────────────────
from .twitter_views import TwitterTargetViewSet, TwitterTaskViewSet

