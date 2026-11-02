import os
import json
import shutil
import subprocess
import sys
from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from .models import TemplateConfig, PortalState, PortalCity, ScrapedArticle


def scraper_panel(request):
    templates = TemplateConfig.objects.all()

    templates_data = {}
    for t in templates:
        state_mappings = []
        for ps in t.portal_states.all():
            state_mappings.append({
                'id': ps.id,
                'name': ps.state.name,
                'url_slug': ps.url_slug,
                'state_id': ps.state_id,
            })

        city_mappings = []
        for pc in t.portal_cities.all():
            city_mappings.append({
                'id': pc.id,
                'name': pc.city.name,
                'url_slug': pc.url_slug,
                'state_id': pc.city.state_id,
            })

        templates_data[t.id] = {
            'portal_type': t.portal_type,
            'states': state_mappings,
            'cities': city_mappings,
        }

    context = {
        "templates": templates,
        "templates_json": json.dumps(templates_data),
        "result": None,
        "error": None,
    }

    if request.method == "POST":
        template_id = request.POST.get("template_id")
        target_state_mapping_id = request.POST.get("target_state")
        target_city_mapping_id = request.POST.get("target_city")

        context["selected_template_id"] = int(template_id) if template_id else None
        context["selected_target_state"] = target_state_mapping_id or ''
        context["selected_target_city"] = target_city_mapping_id or ''

        try:
            template = TemplateConfig.objects.get(id=template_id)
            article_count = request.POST.get("article_count", "3")

            # ── Validate required fields based on portal_type ──
            needs_state = template.portal_type in ('state_only', 'state_and_city')
            needs_city = template.portal_type in ('city_only', 'state_and_city')

            if needs_state and not target_state_mapping_id:
                context["error"] = "Please select a State before running the scraper."
                return render(request, "masters/scraper_panel.html", context)

            if needs_city and not target_city_mapping_id:
                context["error"] = "Please select a City before running the scraper."
                return render(request, "masters/scraper_panel.html", context)

            project_dir = str(settings.BASE_DIR.parent)
            main_py_path = os.path.join(project_dir, "main.py")

            # Use the venv Python explicitly (sys.executable may not be the venv one)
            venv_python = os.path.join(project_dir, "venv", "bin", "python")
            if not os.path.exists(venv_python):
                venv_python = sys.executable  # fallback

            # ── Build the target URL ──
            core_keyword = None

            if template.url_pattern:
                target_url = template.url_pattern
                state_slug = ""
                city_slug = ""

                if target_state_mapping_id:
                    # Verify mapping belongs to this portal
                    ps = PortalState.objects.filter(
                        id=target_state_mapping_id, portal=template
                    ).select_related('state').first()
                    if not ps:
                        context["error"] = "Invalid state selection for this portal."
                        return render(request, "masters/scraper_panel.html", context)
                    state_slug = ps.url_slug
                    core_keyword = state_slug.split('-')[0] if '-' in state_slug else state_slug

                if target_city_mapping_id:
                    # Verify mapping belongs to this portal
                    pc = PortalCity.objects.filter(
                        id=target_city_mapping_id, portal=template
                    ).select_related('city').first()
                    if not pc:
                        context["error"] = "Invalid city selection for this portal."
                        return render(request, "masters/scraper_panel.html", context)
                    city_slug = pc.url_slug
                    core_keyword = city_slug.split('-')[0] if '-' in city_slug else city_slug

                target_url = target_url.replace("{state}", state_slug)
                target_url = target_url.replace("{city}", city_slug)
            else:
                # Fallback: basic domain + slug concatenation
                target_url = f"https://{template.domain}"
                path_parts = []

                if target_state_mapping_id:
                    ps = PortalState.objects.filter(
                        id=target_state_mapping_id, portal=template
                    ).select_related('state').first()
                    if not ps:
                        context["error"] = "Invalid state selection for this portal."
                        return render(request, "masters/scraper_panel.html", context)
                    path_parts.append(ps.url_slug)
                    core_keyword = ps.url_slug.split('-')[0] if '-' in ps.url_slug else ps.url_slug

                if target_city_mapping_id:
                    pc = PortalCity.objects.filter(
                        id=target_city_mapping_id, portal=template
                    ).select_related('city').first()
                    if not pc:
                        context["error"] = "Invalid city selection for this portal."
                        return render(request, "masters/scraper_panel.html", context)
                    path_parts.append(pc.url_slug)
                    core_keyword = pc.url_slug.split('-')[0] if '-' in pc.url_slug else pc.url_slug

                if path_parts:
                    target_url += "/" + "/".join(path_parts) + "/"

            # ── Clear old output before running a fresh scrape ──
            clean_domain = template.domain.replace("www.", "")
            site_name = clean_domain.split('.')[0]
            output_site_dir = os.path.join(project_dir, "output", site_name)
            if os.path.exists(output_site_dir):
                shutil.rmtree(output_site_dir)

            cmd = [venv_python, main_py_path, "--url", target_url, "--count", str(article_count)]
            if core_keyword:
                cmd.extend(["--keyword", core_keyword])

            process = subprocess.run(cmd, cwd=project_dir, capture_output=True, text=True, timeout=120)

            if process.returncode != 0:
                context["error"] = (
                    f"Scraper failed (exit code {process.returncode}).\n"
                    f"URL: {target_url}\n"
                    f"Command: {' '.join(cmd)}\n"
                    f"STDERR: {process.stderr}\n"
                    f"STDOUT: {process.stdout}"
                )
                return render(request, "masters/scraper_panel.html", context)

            # ── Locate output JSON ──
            json_dir = os.path.join(project_dir, "output", site_name, "json")

            result_json = None
            if os.path.exists(json_dir):
                all_results = []
                for filename in sorted(os.listdir(json_dir)):
                    if filename.endswith(".json"):
                        json_path = os.path.join(json_dir, filename)
                        with open(json_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if data.get("title"):
                                all_results.append(data)
                
                if all_results:
                    # If only 1 article, show it as an object. If multiple, show as a list.
                    if len(all_results) == 1:
                        result_json = json.dumps(all_results[0], indent=4, ensure_ascii=False)
                    else:
                        result_json = json.dumps(all_results, indent=4, ensure_ascii=False)

            if result_json:
                context["result"] = result_json
            else:
                context["error"] = (
                    f"Scraper finished but no valid JSON output was found.\n"
                    f"URL: {target_url}\n"
                    f"Command: {' '.join(cmd)}\n"
                    f"JSON dir: {json_dir}\n"
                    f"STDOUT: {process.stdout}\n"
                    f"STDERR: {process.stderr}"
                )

        except subprocess.TimeoutExpired:
            context["error"] = "Scraper timed out after 120 seconds. The target website may be unresponsive."
        except Exception as e:
            context["error"] = str(e)

    return render(request, "masters/scraper_panel.html", context)

def api_articles(request):
    articles = ScrapedArticle.objects.order_by('-scraped_at')[:50]
    data = [a.content for a in articles]
    return JsonResponse(data, safe=False)
