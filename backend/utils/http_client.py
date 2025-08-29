"""
Shared HTTP client utility with default timeouts and retry logic.
This module provides a standardized way to make HTTP requests with proper
timeouts, retries, and error handling across the application.
"""

import logging
import time
from typing import Any, Dict, Optional, Union
from urllib3.util.retry import Retry
import requests
from requests.adapters import HTTPAdapter
from requests.exceptions import (
    ConnectionError,
    HTTPError,
    RequestException,
    Timeout,
    TooManyRedirects,
)
from .monitoring_v2 import record_timeout, record_error, record_api_call

logger = logging.getLogger(__name__)
# Default timeout configuration
DEFAULT_TIMEOUT = (3.05, 10)  # (connect_timeout, read_timeout)
DEFAULT_RETRY_STRATEGY = Retry(
    total=3,
    backoff_factor=0.3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
)


class HTTPClient:
    """Standardized HTTP client with timeouts and retry logic."""

    def __init__(
        self,
        timeout: tuple = DEFAULT_TIMEOUT,
        retry_strategy: Optional[Retry] = DEFAULT_RETRY_STRATEGY,
        session: Optional[requests.Session] = None,
    ):
        """
        Initialize HTTP client.
        Args:
            timeout: Tuple of (connect_timeout, read_timeout) in seconds
            retry_strategy: urllib3 Retry strategy
            session: Optional existing requests.Session
        """
        self.timeout = timeout
        self.session = session or requests.Session()
        if retry_strategy:
            adapter = HTTPAdapter(max_retries=retry_strategy)
            self.session.mount("http://", adapter)
            self.session.mount("https://", adapter)

    def get(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[tuple] = None,
        operation_name: Optional[str] = None,
        **kwargs,
    ) -> requests.Response:
        """
        Make a GET request with standardized error handling and monitoring.
        Args:
            url: Request URL
            params: Query parameters
            headers: Request headers
            timeout: Override default timeout
            operation_name: Name for monitoring (defaults to URL)
            **kwargs: Additional arguments for requests.get
        Returns:
            requests.Response object
        Raises:
            RequestException: For network or HTTP errors
        """
        timeout = timeout or self.timeout
        operation = operation_name or url
        start_time = time.time()
        try:
            logger.debug(f"Making GET request to {url}")
            response = self.session.get(
                url, params=params, headers=headers, timeout=timeout, **kwargs
            )
            response.raise_for_status()
            # Record successful API call
            duration = time.time() - start_time
            record_api_call(operation, duration, response.status_code, {"url": url})
            return response
        except Timeout as e:
            duration = time.time() - start_time
            record_timeout(operation, duration, {"url": url, "timeout": timeout})
            logger.error(f"Timeout error for GET {url}: {e}")
            raise RequestException(f"Request timeout: {e}")
        except ConnectionError as e:
            duration = time.time() - start_time
            record_error(operation, "ConnectionError", str(e), {"url": url})
            logger.error(f"Connection error for GET {url}: {e}")
            raise RequestException(f"Connection failed: {e}")
        except HTTPError as e:
            duration = time.time() - start_time
            record_error(
                operation,
                "HTTPError",
                str(e),
                {"url": url, "status_code": e.response.status_code},
            )
            logger.error(f"HTTP error for GET {url}: {e}")
            raise RequestException(f"HTTP error: {e}")
        except TooManyRedirects as e:
            duration = time.time() - start_time
            record_error(operation, "TooManyRedirects", str(e), {"url": url})
            logger.error(f"Too many redirects for GET {url}: {e}")
            raise RequestException(f"Too many redirects: {e}")
        except Exception as e:
            duration = time.time() - start_time
            record_error(operation, "UnexpectedError", str(e), {"url": url})
            logger.error(f"Unexpected error for GET {url}: {e}")
            raise RequestException(f"Request failed: {e}")

    def post(
        self,
        url: str,
        data: Optional[Union[Dict, str]] = None,
        json: Optional[Dict] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[tuple] = None,
        **kwargs,
    ) -> requests.Response:
        """
        Make a POST request with standardized error handling.
        Args:
            url: Request URL
            data: Form data
            json: JSON data
            headers: Request headers
            timeout: Override default timeout
            **kwargs: Additional arguments for requests.post
        Returns:
            requests.Response object
        Raises:
            RequestException: For network or HTTP errors
        """
        timeout = timeout or self.timeout
        try:
            logger.debug(f"Making POST request to {url}")
            response = self.session.post(
                url, data=data, json=json, headers=headers, timeout=timeout, **kwargs
            )
            response.raise_for_status()
            return response
        except Timeout as e:
            logger.error(f"Timeout error for POST {url}: {e}")
            raise RequestException(f"Request timeout: {e}")
        except ConnectionError as e:
            logger.error(f"Connection error for POST {url}: {e}")
            raise RequestException(f"Connection failed: {e}")
        except HTTPError as e:
            logger.error(f"HTTP error for POST {url}: {e}")
            raise RequestException(f"HTTP error: {e}")
        except TooManyRedirects as e:
            logger.error(f"Too many redirects for POST {url}: {e}")
            raise RequestException(f"Too many redirects: {e}")
        except Exception as e:
            logger.error(f"Unexpected error for POST {url}: {e}")
            raise RequestException(f"Request failed: {e}")


# Global instance for easy import
http_client = HTTPClient()


def get_http_client() -> HTTPClient:
    """Get the global HTTP client instance."""
    return http_client
