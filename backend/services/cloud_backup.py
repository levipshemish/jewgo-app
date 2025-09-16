import boto3
import os
import gzip
import tarfile
from datetime import datetime
import logging

class CloudBackupManager:
    def __init__(self):
        # AWS credentials (should be set as environment variables)
        self.aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
        self.bucket_name = os.environ.get("S3_BACKUP_BUCKET", "jewgo-backups")
        
        # Initialize S3 client if credentials are available
        self.s3_available = False
        if self.aws_access_key_id and self.aws_secret_access_key:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                    region_name=self.aws_region
                )
                # Test connection
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                self.s3_available = True
                print("✅ S3 connection established")
            except Exception as e:
                print(f"⚠️  S3 connection failed: {str(e)}")
        else:
            print("⚠️  AWS credentials not configured. S3 backup disabled.")
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def create_database_backup(self, db_config):
        """Create and upload database backup to S3"""
        if not self.s3_available:
            print("❌ S3 not available. Cannot create cloud backup.")
            return None
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"jewgo_db_{timestamp}.sql"
            compressed_filename = f"{backup_filename}.gz"
            
            # Create database backup
            self.logger.info("Creating database backup...")
            os.system(f"pg_dump -h {db_config['host']} -U {db_config['user']} -d {db_config['database']} > /tmp/{backup_filename}")
            
            # Compress backup
            with open(f"/tmp/{backup_filename}", "rb") as f_in:
                with gzip.open(f"/tmp/{compressed_filename}", "wb") as f_out:
                    f_out.writelines(f_in)
            
            # Upload to S3
            s3_key = f"database/{compressed_filename}"
            self.s3_client.upload_file(f"/tmp/{compressed_filename}", self.bucket_name, s3_key)
            
            # Cleanup local files
            os.remove(f"/tmp/{backup_filename}")
            os.remove(f"/tmp/{compressed_filename}")
            
            self.logger.info(f"Database backup uploaded to S3: s3://{self.bucket_name}/{s3_key}")
            return s3_key
            
        except Exception as e:
            self.logger.error(f"Database backup failed: {str(e)}")
            return None
    
    def create_application_backup(self, app_path):
        """Create and upload application backup to S3"""
        if not self.s3_available:
            print("❌ S3 not available. Cannot create cloud backup.")
            return None
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"jewgo_app_{timestamp}.tar.gz"
            
            # Create application backup
            self.logger.info("Creating application backup...")
            with tarfile.open(f"/tmp/{backup_filename}", "w:gz") as tar:
                tar.add(app_path, arcname="jewgo_app", exclude=lambda x: x.endswith((".pyc", "__pycache__", ".git", "node_modules")))
            
            # Upload to S3
            s3_key = f"application/{backup_filename}"
            self.s3_client.upload_file(f"/tmp/{backup_filename}", self.bucket_name, s3_key)
            
            # Cleanup local file
            os.remove(f"/tmp/{backup_filename}")
            
            self.logger.info(f"Application backup uploaded to S3: s3://{self.bucket_name}/{s3_key}")
            return s3_key
            
        except Exception as e:
            self.logger.error(f"Application backup failed: {str(e)}")
            return None
    
    def list_backups(self, backup_type="all"):
        """List available backups in S3"""
        if not self.s3_available:
            return []
        
        try:
            if backup_type == "database":
                prefix = "database/"
            elif backup_type == "application":
                prefix = "application/"
            else:
                prefix = ""
            
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            
            backups = []
            if "Contents" in response:
                for obj in response["Contents"]:
                    backups.append({
                        "key": obj["Key"],
                        "size": obj["Size"],
                        "last_modified": obj["LastModified"],
                        "type": "database" if obj["Key"].startswith("database/") else "application"
                    })
            
            return sorted(backups, key=lambda x: x["last_modified"], reverse=True)
            
        except Exception as e:
            self.logger.error(f"Failed to list backups: {str(e)}")
            return []
    
    def get_backup_stats(self):
        """Get backup statistics"""
        if not self.s3_available:
            return {"error": "S3 not available"}
        
        try:
            backups = self.list_backups()
            
            stats = {
                "total_backups": len(backups),
                "database_backups": len([b for b in backups if b["type"] == "database"]),
                "application_backups": len([b for b in backups if b["type"] == "application"]),
                "total_size": sum(b["size"] for b in backups),
                "latest_backup": max(backups, key=lambda x: x["last_modified"])["last_modified"] if backups else None
            }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Failed to get backup stats: {str(e)}")
            return {"error": str(e)}

# Global cloud backup manager instance
cloud_backup_manager = CloudBackupManager()
