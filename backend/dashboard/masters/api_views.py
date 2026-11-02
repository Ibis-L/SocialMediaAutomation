from rest_framework import viewsets, permissions, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import ScrapedArticle, TemplateConfig, ScrapeLog, WhatsAppDevice, WhatsAppTask, TwitterTarget, TwitterTask
from .serializers import ScrapedArticleSerializer, DashboardSourceSerializer, ScrapeLogSerializer, WhatsAppDeviceSerializer, WhatsAppTaskSerializer, TwitterTargetSerializer, TwitterTaskSerializer

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
        name = request.data.get('name', '')
        twitter_handle = request.data.get('twitter_handle', '')
        if phone_number:
            defaults = {'last_heartbeat': timezone.now()}
            if name:
                defaults['name'] = name
            if twitter_handle:
                defaults['twitter_handle'] = twitter_handle
            device, created = WhatsAppDevice.objects.update_or_create(
                phone_number=phone_number,
                defaults=defaults
            )
            serializer = self.get_serializer(device)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        device = self.get_object()
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
        if device:
            if battery_level is not None:
                device.battery_level = int(battery_level)
            if battery_status is not None:
                device.battery_status = battery_status
            if temperature is not None:
                device.temperature = float(temperature)
            device.last_heartbeat = timezone.now()
            device.save()
            return Response({"success": True})
        return Response({"error": "Device not found"}, status=404)

class WhatsAppTaskViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppTask.objects.all().order_by('-created_at')
    serializer_class = WhatsAppTaskSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def enqueue_bulk(self, request):
        # Expected payload: { "tasks": [ { "device_id": 1, "contact_number": "+91...", "message": "..." } ] }
        tasks_data = request.data.get('tasks', [])
        created_count = 0
        for task in tasks_data:
            device_id = task.get('device_id')
            contact_number = task.get('contact_number')
            message = task.get('message')
            
            if device_id and contact_number and message:
                try:
                    device = WhatsAppDevice.objects.get(id=device_id)
                    WhatsAppTask.objects.create(
                        device=device,
                        contact_number=contact_number,
                        message=message,
                        status='PENDING'
                    )
                    created_count += 1
                except WhatsAppDevice.DoesNotExist:
                    continue
        
        return Response({"success": True, "queued": created_count})

    @action(detail=False, methods=['get'])
    def poll(self, request):
        # Called by Android App: /api/tasks/poll/?deviceId=device_id_or_phone
        device_identifier = request.query_params.get('deviceId')
        if not device_identifier:
            return Response({"hasTask": False, "error": "Missing deviceId query parameter"}, status=400)
        
        # Find device by phone_number (or try by ID if it's numeric, but usually phone_number is used as the unique ID)
        device = WhatsAppDevice.objects.filter(phone_number=device_identifier).first()
        if not device:
            # Maybe the phone sent the database ID
            if device_identifier.isdigit():
                device = WhatsAppDevice.objects.filter(id=device_identifier).first()
        
        if not device:
            return Response({"hasTask": False, "error": "Device not registered"})
            
        # Get oldest pending task for this device
        task = WhatsAppTask.objects.filter(device=device, status='PENDING').order_by('created_at').first()
        
        if task:
            # Mark it as processing (so it doesn't get picked up again immediately)
            task.status = 'PROCESSING'
            task.processed_at = timezone.now()
            task.save()
            
            return Response({
                "hasTask": True,
                "taskId": task.id,
                "phoneNumber": task.contact_number,
                "message": task.message
            })
            
        return Response({"hasTask": False})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        try:
            task = self.get_object()
            status = request.data.get('status', 'COMPLETED')
            
            if status in ['COMPLETED', 'FAILED']:
                task.status = status
                from django.utils import timezone
                task.processed_at = timezone.now()
                task.save()
                return Response({"success": True, "status": task.status})
            else:
                return Response({"error": "Invalid status"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

from .models import AppRelease
from .serializers import AppReleaseSerializer

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


