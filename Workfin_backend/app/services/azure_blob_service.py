"""
Azure Blob Storage Service for reading Gold Layer data
"""
import io
import pandas as pd
from typing import List, Optional
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
from app.core.config import settings


class AzureBlobService:
    def __init__(self):
        self.account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
        self.container_name = settings.AZURE_STORAGE_CONTAINER_NAME
        self.credential = DefaultAzureCredential()
        self.blob_service_client = None
        self.container_client = None

    def _get_blob_service_client(self):
        """Get or create blob service client"""
        if not self.blob_service_client:
            account_url = f"https://{self.account_name}.blob.core.windows.net"
            self.blob_service_client = BlobServiceClient(
                account_url=account_url,
                credential=self.credential
            )
        return self.blob_service_client

    def _get_container_client(self):
        """Get or create container client"""
        if not self.container_client:
            self.container_client = self._get_blob_service_client().get_container_client(
                self.container_name
            )
        return self.container_client

    def list_folders(self, prefix: str = "gold/") -> List[str]:
        """List folders in a path"""
        container_client = self._get_container_client()
        folders = set()

        blobs = container_client.list_blobs(name_starts_with=prefix)
        for blob in blobs:
            # Extract folder name
            relative_path = blob.name[len(prefix):]
            if "/" in relative_path:
                folder = relative_path.split("/")[0]
                folders.add(folder)

        return sorted(list(folders))

    def list_files(self, prefix: str) -> List[str]:
        """List files in a path, excluding Delta Lake metadata"""
        container_client = self._get_container_client()
        files = []

        blobs = container_client.list_blobs(name_starts_with=prefix)
        for blob in blobs:
            # Exclude Delta Lake transaction log and metadata files
            if '_delta_log' in blob.name:
                continue
            if blob.name.endswith('.parquet'):
                files.append(blob.name)

        return files

    def read_parquet_file(self, blob_path: str) -> pd.DataFrame:
        """Read a single parquet file"""
        container_client = self._get_container_client()
        blob_client = container_client.get_blob_client(blob_path)

        # Download blob to memory
        stream = io.BytesIO()
        blob_data = blob_client.download_blob()
        blob_data.readinto(stream)
        stream.seek(0)

        # Read parquet
        df = pd.read_parquet(stream)
        return df

    def read_parquet_folder(self, folder_path: str, limit: Optional[int] = None) -> pd.DataFrame:
        """Read all parquet files in a folder and combine into single DataFrame"""
        files = self.list_files(folder_path)

        if not files:
            return pd.DataFrame()

        # Limit number of files if specified
        if limit:
            files = files[:limit]

        dfs = []
        for file_path in files:
            try:
                df = self.read_parquet_file(file_path)
                dfs.append(df)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                continue

        if not dfs:
            return pd.DataFrame()

        return pd.concat(dfs, ignore_index=True)

    def get_soe_data(
        self,
        table_name: str,
        limit: Optional[int] = None,
        integration_id: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Get SOE data by table name, with optional filtering by integration_id

        Args:
            table_name: Name of the SOE table (e.g., 'vw_DimPatients')
            limit: Limit number of files to read (not records)
            integration_id: Filter records by integration_id column

        Returns:
            DataFrame with the requested data
        """
        folder_path = f"gold/soe/{table_name}/"
        df = self.read_parquet_folder(folder_path, limit)

        # Filter by integration_id if provided and column exists
        if not df.empty and integration_id and 'integration_id' in df.columns:
            df = df[df['integration_id'].astype(str) == str(integration_id)]

        return df

    def read_parquet_columns(self, blob_path: str, columns: List[str]) -> pd.DataFrame:
        """Read only specific columns from a parquet file (much faster for large files)"""
        container_client = self._get_container_client()
        blob_client = container_client.get_blob_client(blob_path)

        stream = io.BytesIO()
        blob_data = blob_client.download_blob()
        blob_data.readinto(stream)
        stream.seek(0)

        df = pd.read_parquet(stream, columns=columns)
        return df

    def _get_parquet_columns(self, blob_path: str) -> List[str]:
        """Read only the column names from a parquet file (very fast, no data read)"""
        import pyarrow.parquet as pq
        container_client = self._get_container_client()
        blob_client = container_client.get_blob_client(blob_path)

        stream = io.BytesIO()
        blob_data = blob_client.download_blob()
        blob_data.readinto(stream)
        stream.seek(0)

        schema = pq.read_schema(stream)
        return schema.names

    def get_soe_distinct_integrations(self) -> List[dict]:
        """
        Get distinct integration_id + IntegrationName pairs from SOE tables.
        Optimized: tries vw_DimPatients first (known to have both columns),
        then falls back to other tables only if needed. Reads only the 2
        needed columns from each parquet file.
        """
        all_tables = self.get_available_soe_tables()
        if not all_tables:
            return []

        # Try vw_DimPatients first since it's known to have both columns
        priority_tables = ["vw_DimPatients"]
        other_tables = [t for t in all_tables if t != "vw_DimPatients"]
        ordered_tables = priority_tables + other_tables

        all_pairs = set()

        for table_name in ordered_tables:
            folder_path = f"gold/soe/{table_name}/"
            files = self.list_files(folder_path)
            if not files:
                continue

            # Discover column names from schema only (no data read)
            try:
                columns = self._get_parquet_columns(files[0])
                id_col = None
                name_col = None
                for col in columns:
                    if col.lower() == 'integration_id':
                        id_col = col
                    if col.lower() == 'integrationname':
                        name_col = col

                if not id_col:
                    continue
            except Exception as e:
                print(f"Error reading schema of {table_name}: {e}")
                continue

            # Read only the needed columns from all files in this table
            cols_to_read = [id_col] + ([name_col] if name_col else [])

            for file_path in files:
                try:
                    df = self.read_parquet_columns(file_path, cols_to_read)
                    for _, row in df.drop_duplicates().iterrows():
                        iid = str(row[id_col]) if pd.notna(row[id_col]) else None
                        if not iid:
                            continue
                        iname = str(row[name_col]) if name_col and pd.notna(row[name_col]) else iid
                        all_pairs.add((iid, iname))
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
                    continue

            # If we found integrations from this table, no need to scan more
            if all_pairs:
                break

        return [
            {"integration_id": iid, "integration_name": iname}
            for iid, iname in sorted(all_pairs, key=lambda x: x[1])
        ]

    def get_available_soe_tables(self) -> List[str]:
        """Get list of available SOE tables"""
        return self.list_folders("gold/soe/")


# Global instance
azure_blob_service = AzureBlobService()