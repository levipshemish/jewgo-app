# AWS S3 Setup Guide for JewGo Cloud Backups

## Overview
This guide walks you through setting up AWS S3 for automated cloud backups of your JewGo application.

## Prerequisites
- AWS account (free tier available)
- Credit card for verification (no charges for free tier usage)

## Step 1: Create AWS Account & IAM User

### 1.1 Create AWS Account
1. Go to [AWS Sign-Up](https://portal.aws.amazon.com/billing/signup)
2. Follow the signup process
3. Verify your account with credit card
4. **Free Tier**: 5GB of S3 storage free for 12 months

### 1.2 Create IAM User (Recommended)
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click 'Users' → 'Create user'
3. Username: `jewgo-backup-user`
4. Select 'Programmatic access' (for API keys)
5. Attach policy: `AmazonS3FullAccess`
6. **⚠️ IMPORTANT**: Save the Access Key ID and Secret Access Key!

## Step 2: Create S3 Bucket

1. Go to [S3 Console](https://s3.console.aws.amazon.com/s3/home)
2. Click 'Create bucket'
3. **Bucket name**: `jewgo-backups-[your-unique-id]` (must be globally unique)
4. **Region**: Choose `us-east-1` (N. Virginia) for best performance
5. **Block Public Access**: Keep all settings enabled (recommended)
6. **Versioning**: Enable (optional but recommended)
7. **Encryption**: Enable server-side encryption
8. Click 'Create bucket'

## Step 3: Configure Server Environment

### 3.1 Update Environment Variables
```bash
# Edit the environment file
sudo nano /etc/environment

# Replace the placeholder values with your actual AWS credentials:
AWS_ACCESS_KEY_ID=your_actual_access_key_here
AWS_SECRET_ACCESS_KEY=your_actual_secret_key_here
AWS_REGION=us-east-1
S3_BACKUP_BUCKET=jewgo-backups-your-unique-id
```

### 3.2 Update Systemd Service
```bash
# Edit the systemd service file
sudo nano /etc/systemd/system/jewgo-backend.service.d/aws-env.conf

# Replace the placeholder values there too, then reload systemd
sudo systemctl daemon-reload
sudo systemctl restart jewgo-backend-new
```

## Step 4: Test the Setup

### 4.1 Test AWS CLI Connection
```bash
aws s3 ls
```

### 4.2 Test Cloud Backup System
```bash
docker exec jewgo-backend-new python3 /tmp/cloud_backup_script.py
```

### 4.3 Test Backup Script Manually
```bash
sudo /usr/local/bin/cloud-backup.sh
```

### 4.4 Check Backup Logs
```bash
sudo tail -f /var/log/cloud-backup.log
```

## Step 5: Automated Backup Schedule

The cloud backup is already scheduled to run daily at 5 AM:
```bash
# Check cron jobs
sudo crontab -l | grep cloud-backup

# Output: 0 5 * * * /usr/local/bin/cloud-backup.sh >> /var/log/cloud-backup.log 2>&1
```

## Backup Types

### Database Backup
- **Frequency**: Daily at 5 AM
- **Format**: Compressed SQL dump (.sql.gz)
- **Location**: `s3://your-bucket/database/`
- **Retention**: 30 days (configurable)

### Application Backup
- **Frequency**: Daily at 5 AM
- **Format**: Compressed tar archive (.tar.gz)
- **Location**: `s3://your-bucket/application/`
- **Retention**: 7 days (configurable)
- **Excludes**: node_modules, .git, *.log, __pycache__, *.pyc

## Monitoring & Logs

### Log Files
- **Cloud backup logs**: `/var/log/cloud-backup.log`
- **Database backup logs**: `/var/log/database-backup.log`
- **Application backup logs**: `/var/log/application-backup.log`

### Check Backup Status
```bash
# View recent backup logs
sudo tail -20 /var/log/cloud-backup.log

# List S3 backups (requires AWS CLI)
aws s3 ls s3://your-bucket-name/ --recursive
```

## Cost Estimation

### Free Tier (12 months)
- **Storage**: 5GB free
- **Requests**: 20,000 GET requests, 2,000 PUT requests free
- **Estimated cost**: $0/month for small applications

### After Free Tier
- **Storage**: ~$0.023 per GB per month
- **Requests**: ~$0.0004 per 1,000 requests
- **Estimated cost**: $1-5/month for typical backup usage

## Security Best Practices

1. **Use IAM users** instead of root account
2. **Enable MFA** on your AWS account
3. **Use least privilege** access (S3-only permissions)
4. **Enable encryption** on S3 bucket
5. **Enable versioning** for data protection
6. **Monitor access** with CloudTrail (optional)

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Check AWS credentials are correct
   - Verify IAM user has S3 permissions
   - Ensure bucket name is correct

2. **"Bucket not found" errors**
   - Verify bucket name and region
   - Check bucket exists in AWS console

3. **Backup script fails**
   - Check logs: `sudo tail -f /var/log/cloud-backup.log`
   - Verify database connection
   - Check disk space

### Manual Backup Commands
```bash
# Manual database backup
sudo /usr/local/bin/database-backup.sh

# Manual application backup
sudo /usr/local/bin/application-backup.sh

# Manual cloud backup
sudo /usr/local/bin/cloud-backup.sh
```

## Support

If you encounter issues:
1. Check the log files first
2. Verify AWS credentials and permissions
3. Test AWS CLI connection manually
4. Ensure sufficient disk space for temporary backups

## Next Steps

Once S3 backups are working:
1. Set up S3 lifecycle policies for cost optimization
2. Configure backup notifications (optional)
3. Test restore procedures
4. Document recovery procedures for your team
