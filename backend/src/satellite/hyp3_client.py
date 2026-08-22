import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from .config import SATELLITE_MODE, EARTHDATA_USERNAME, EARTHDATA_PASSWORD, HYP3_CACHE_DIR

logger = logging.getLogger(__name__)

# Import hyp3-sdk conditionally
HYP3_SDK_AVAILABLE = False
try:
    import hyp3_sdk as sdk
    HYP3_SDK_AVAILABLE = True
except ImportError:
    logger.warning("hyp3-sdk is not installed. Live mode will not be operational.")

class HyP3Client:
    """Thin wrapper around hyp3-sdk to interact with NASA's ASF HyP3 On Demand service"""
    
    def __init__(self):
        self.client = None
        if SATELLITE_MODE == "live":
            self.authenticate()
            
    def authenticate(self) -> bool:
        """Authenticate with Earthdata credentials"""
        if not HYP3_SDK_AVAILABLE:
            logger.error("hyp3-sdk is not installed. Cannot authenticate.")
            return False
            
        if not EARTHDATA_USERNAME or not EARTHDATA_PASSWORD:
            logger.warning("Earthdata credentials missing. HyP3 live API will not be authenticated.")
            return False
            
        try:
            self.client = sdk.HyP3(
                username=EARTHDATA_USERNAME,
                password=EARTHDATA_PASSWORD
            )
            logger.info("Successfully authenticated with ASF HyP3.")
            return True
        except Exception as e:
            logger.error(f"HyP3 authentication failed: {e}")
            return False

    def is_operational(self) -> bool:
        """Check if live mode can be used"""
        return SATELLITE_MODE == "live" and self.client is not None

    def submit_insar_job(self, reference_granule: str, secondary_granule: str, name: str = "mine_deformation") -> Optional[str]:
        """
        Submit an InSAR GAMMA job to HyP3
        
        Args:
            reference_granule: Name of the reference SLC scene
            secondary_granule: Name of the secondary SLC scene
            name: Label for the job group
            
        Returns:
            job_id: The ID of the submitted job or None if submission failed
        """
        if not self.is_operational():
            logger.warning("HyP3 client is offline or not authenticated. Cannot submit job.")
            return None
            
        try:
            # INSAR_GAMMA is the standard geocoded unwrapped phase + coherence output product
            job = self.client.submit_insar_job(
                reference=reference_granule,
                secondary=secondary_granule,
                name=name,
                include_dem=True,
                include_look_vectors=False,
                include_los_displacement=True, # Displacement in line-of-sight
                include_inc_map=True,
                apply_water_mask=True
            )
            logger.info(f"Submitted InSAR job: {job.job_id} ({reference_granule} / {secondary_granule})")
            return job.job_id
        except Exception as e:
            logger.error(f"Failed to submit InSAR job to HyP3: {e}")
            return None

    def check_job_status(self, job_id: str) -> Dict[str, Any]:
        """Check status of a submitted job"""
        if not self.is_operational():
            return {"status": "FAILED", "message": "Client not operational"}
            
        try:
            job = self.client.get_job_by_id(job_id)
            return {
                "job_id": job.job_id,
                "status": job.status_code, # e.g. 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'
                "reference": job.job_parameters.get("reference"),
                "secondary": job.job_parameters.get("secondary"),
                "download_url": job.files[0]["url"] if job.succeeded() else None
            }
        except Exception as e:
            logger.error(f"Failed to fetch job status for {job_id}: {e}")
            return {"status": "ERROR", "message": str(e)}

    def download_job_product(self, job_id: str, download_dir: Path) -> Optional[Path]:
        """Download and unzip the output file of a succeeded job"""
        if not self.is_operational():
            logger.warning("HyP3 client is offline. Cannot download.")
            return None
            
        try:
            job = self.client.get_job_by_id(job_id)
            if not job.succeeded():
                logger.warning(f"Job {job_id} has not succeeded yet (status: {job.status_code})")
                return None
                
            download_dir.mkdir(parents=True, exist_ok=True)
            downloaded_zip = job.download_files(download_dir)[0]
            logger.info(f"Downloaded product for job {job_id} to {downloaded_zip}")
            
            # Unzip contents
            import zipfile
            extract_dir = download_dir / Path(downloaded_zip).stem
            with zipfile.ZipFile(downloaded_zip, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            logger.info(f"Extracted InSAR product to {extract_dir}")
            
            # Delete temporary zip file
            Path(downloaded_zip).unlink()
            
            return extract_dir
        except Exception as e:
            logger.error(f"Failed to download product for job {job_id}: {e}")
            return None
