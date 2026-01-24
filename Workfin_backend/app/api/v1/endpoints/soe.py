"""
SOE Data API Endpoints
"""
from typing import List, Optional
import math
from fastapi import APIRouter, HTTPException, Query
from app.services.azure_blob_service import azure_blob_service

router = APIRouter()


def clean_nan_values(data: list) -> list:
    """Replace NaN and Inf values with None for JSON serialization"""
    cleaned = []
    for record in data:
        cleaned_record = {}
        for key, value in record.items():
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                cleaned_record[key] = None
            else:
                cleaned_record[key] = value
        cleaned.append(cleaned_record)
    return cleaned


@router.get("/tables")
async def get_soe_tables():
    """Get list of available SOE tables"""
    try:
        tables = azure_blob_service.get_available_soe_tables()
        return {"tables": tables, "count": len(tables)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list SOE tables: {str(e)}")


@router.get("/data/{table_name}")
async def get_soe_table_data(
    table_name: str,
    limit: Optional[int] = Query(100, description="Limit number of records"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get data from a specific SOE table"""
    try:
        # Read data from blob storage
        df = azure_blob_service.get_soe_data(table_name, limit=5)  # Limit files to read
        
        if df.empty:
            return {"data": [], "total": 0, "table": table_name}
        
        # Apply pagination
        total = len(df)
        df = df.iloc[offset:offset + limit]
        
        # Convert to dict and clean NaN values
        data = df.to_dict(orient="records")
        data = clean_nan_values(data)
        
        return {
            "data": data,
            "total": total,
            "table": table_name,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get SOE data: {str(e)}")


@router.get("/patients")
async def get_patients(
    limit: Optional[int] = Query(100, description="Limit"),
    offset: Optional[int] = Query(0, description="Offset")
):
    """Get patients data from vw_DimPatients"""
    return await get_soe_table_data("vw_DimPatients", limit, offset)


@router.get("/appointments")
async def get_appointments(
    limit: Optional[int] = Query(100, description="Limit"),
    offset: Optional[int] = Query(0, description="Offset")
):
    """Get appointments data"""
    return await get_soe_table_data("vw_Appointments", limit, offset)