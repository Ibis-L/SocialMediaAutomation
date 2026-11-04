"""
Django settings for dashboard project.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ---- Core (env se override hota hai, defaults local dev ke liye) ----
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-q7m80l3nrm=$uz5&_bxc3r38cxv%8dxpxul_=)^9rahi^#7w9q',
)

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get('ALLOWED_HOSTS', '*').split(',') if h.strip()
]
# Ensure production domain is always permitted
for prod_host in ['sslocal.mediatechtemple.com', '.mediatechtemple.com', 'localhost', '127.0.0.1']:
    if prod_host not in ALLOWED_HOSTS and '*' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(prod_host)

# Default trusted origins for CSRF (prevents 403 Forbidden in production over HTTPS)
DEFAULT_CSRF_ORIGINS = [
    'https://sslocal.mediatechtemple.com',
    'http://sslocal.mediatechtemple.com',
    'https://*.mediatechtemple.com',
    'http://*.mediatechtemple.com',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(
    DEFAULT_CSRF_ORIGINS + [
        o.strip() for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
    ]
))

# Internal Service-to-Service Secret for Dashboard proxy requests
INTERNAL_API_SECRET = os.environ.get('INTERNAL_API_SECRET', 'mediatech-automation-secret-token-2026')

# Ingress / Reverse Proxy (Nginx, Traefik, Cloudflare, Kube Ingress) settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True


# Application definition

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'masters',
]

JAZZMIN_SETTINGS = {
    "site_title": "News Scraper",
    "site_header": "News Scraper",
    "site_brand": "⚡ News Scraper",
    "welcome_sign": "Welcome to the News Scraper Dashboard",
    "search_model": ["masters.TemplateConfig", "auth.User"],
    "show_ui_builder": False,

    # Icons for models
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "masters.TemplateConfig": "fas fa-newspaper",
        "masters.State": "fas fa-map-marked-alt",
        "masters.City": "fas fa-city",
    },

    # Custom links in the top menu
    "topmenu_links": [
        {"name": "Scraper Panel", "url": "/masters/panel/", "icon": "fas fa-play-circle"},
    ],

    # Order of apps in sidebar
    "order_with_respect_to": ["masters", "auth"],

    # Custom CSS to refine the admin look
    "custom_css": "masters/css/admin_overrides.css",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "navbar": "navbar-dark",
    "sidebar": "sidebar-dark-primary",
    "body_small_text": False,
    "navbar_small_text": False,
    "sidebar_nav_small_text": False,
    "sidebar_nav_flat_style": True,
    "sidebar_nav_compact_style": False,
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'dashboard.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'dashboard.wsgi.application'


# Database (DATABASE_URL set ho to Postgres, warna SQLite fallback)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

db_from_env = dj_database_url.config(conn_max_age=600)
if db_from_env:
    DATABASES['default'].update(db_from_env)


# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static + Media

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# CORS

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# REST + JWT

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}


# ============================================================
# Email Configuration (Office 365 SMTP)
# ============================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('SMTP_HOST', 'smtp.office365.com')
EMAIL_PORT = int(os.environ.get('SMTP_PORT', 587))
EMAIL_USE_TLS = os.environ.get('SMTP_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('SMTP_USER', 'alert@mediatechtemple.com')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASS', 'mckrrwxrmbcfntsy')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

ADMIN_ALERT_EMAIL = os.environ.get('ADMIN_ALERT_EMAIL', 'dejoro7604@goldvester.com')
ADMIN_ALERT_EMAIL = os.environ.get('ADMIN_ALERT_EMAIL', 'dejoro7604@goldvester.com')

