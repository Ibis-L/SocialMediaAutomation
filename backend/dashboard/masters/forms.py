from django import forms
import json
from .models import TemplateConfig


class TemplateConfigAdminForm(forms.ModelForm):
    """Admin form that allows pasting a scraper template as JSON.
    The JSON must contain the keys: `domain`, `url_identifier`, and `selectors`.
    After validation the fields `domain`, `url_identifier` and `selectors` are
    populated automatically.
    """

    template_json = forms.CharField(
        label="Paste Template JSON",
        widget=forms.Textarea(attrs={
            "rows": 12,
            "cols": 80,
            "placeholder": '{\n  "domain": "bhaskar.com",\n  "url_identifier": "/news/",\n  "selectors": {\n    "homepage_links": "a",\n    "title": "article h1",\n    "article_body": "article p"\n  }\n}',
            "style": "font-family: 'JetBrains Mono', monospace; font-size: 13px;",
        }),
        help_text=(
            "Paste the whole scraper template dictionary (as JSON). "
            "Required keys: domain, url_identifier, selectors. "
            "On save, this will auto-fill the Domain, URL Identifier, and Selectors fields below."
        ),
        required=False,
    )

    class Meta:
        model = TemplateConfig
        fields = '__all__'

    def clean(self):
        cleaned = super().clean()
        tmpl_str = cleaned.get("template_json")
        if tmpl_str and tmpl_str.strip():
            try:
                tmpl = json.loads(tmpl_str)
            except json.JSONDecodeError as e:
                raise forms.ValidationError(f"Invalid JSON: {e}")

            # Ensure required keys are present
            for key in ("domain", "url_identifier", "selectors"):
                if key not in tmpl:
                    raise forms.ValidationError(
                        f"Missing required key '{key}' in the JSON."
                    )

            # Validate selectors is a dict
            if not isinstance(tmpl["selectors"], dict):
                raise forms.ValidationError("The 'selectors' value must be a JSON object (dict).")

            # Validate url_identifier to prevent domain reuse
            domain_name = tmpl["domain"].replace("www.", "").split(".")[0].lower()
            url_id = tmpl["url_identifier"].lower()
            if url_id == domain_name or url_id == tmpl["domain"].lower():
                raise forms.ValidationError(
                    f"Do not use the domain name '{tmpl['url_identifier']}' as the url_identifier. "
                    f"It will match all navigation links. Please use a specific article path pattern like '-news-'."
                )

            # Set default homepage_links if not provided
            if "homepage_links" not in tmpl["selectors"] or not tmpl["selectors"]["homepage_links"]:
                tmpl["selectors"]["homepage_links"] = "a"

            # Check for duplicate domain (another portal with the same domain)
            new_domain = tmpl["domain"]
            existing = TemplateConfig.objects.filter(domain=new_domain)
            if self.instance and self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise forms.ValidationError(
                    f"Another portal already uses the domain '{new_domain}'. "
                    f"Please edit that portal instead of creating a duplicate."
                )

            # Populate model fields from the pasted JSON
            cleaned["domain"] = tmpl["domain"]
            cleaned["url_identifier"] = tmpl["url_identifier"]
            cleaned["selectors"] = tmpl["selectors"]

        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)

        # If template JSON was pasted, override the model fields
        tmpl_str = self.cleaned_data.get("template_json")
        if tmpl_str and tmpl_str.strip():
            tmpl = json.loads(tmpl_str)
            instance.domain = tmpl["domain"]
            instance.url_identifier = tmpl["url_identifier"]
            instance.selectors = tmpl["selectors"]

        if commit:
            instance.save()
            self.save_m2m()
        return instance
