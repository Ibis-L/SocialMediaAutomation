from django.db import migrations
from django.contrib.auth.hashers import make_password

def reset_admin_password(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Group = apps.get_model('auth', 'Group')
    
    try:
        admin = User.objects.get(username='admin')
        admin.username = 'Admin'
    except User.DoesNotExist:
        try:
            admin = User.objects.get(username='Admin')
        except User.DoesNotExist:
            admin = User(username='Admin', is_staff=True, is_superuser=True, is_active=True)
            
    admin.password = make_password('Admin123')
    admin.save()
    
    try:
        super_admin_group = Group.objects.get(name='Super Admin')
        admin.groups.add(super_admin_group)
    except Group.DoesNotExist:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ('masters', '0017_merge_0013_merge_20260828_2340_0016_apprelease'),
    ]

    operations = [
        migrations.RunPython(reset_admin_password),
    ]
