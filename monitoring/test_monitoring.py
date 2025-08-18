#!/usr/bin/env python3
"""
Test Monitoring Endpoints for JewGo API
Tests all monitoring endpoints to ensure they're working correctly
"""

import requests
import json
import time
from typing import Dict, Any, List


class MonitoringTester:
    def __init__(self):
        self.base_url = "https://jewgo.onrender.com"
        self.frontend_url = "https://jewgo.app"
        self.timeout = 30

    def test_endpoint(
        self, url: str, name: str, expected_status: int = 200
    ) -> Dict[str, Any]:
        """Test a single endpoint."""
        try:
            start_time = time.time()
            response = requests.get(url, timeout=self.timeout)
            response_time = (time.time() - start_time) * 1000

            success = response.status_code == expected_status

            result = {
                "name": name,
                "url": url,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "success": success,
                "response_time_ms": round(response_time, 2),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            }

            if success:
                print(f"✅ {name}: {response.status_code} ({response_time:.2f}ms)")
            else:
                print(f"❌ {name}: {response.status_code} (expected {expected_status})")

            return result

        except requests.exceptions.Timeout:
            print(f"⏰ {name}: Timeout after {self.timeout}s")
            return {
                "name": name,
                "url": url,
                "status_code": None,
                "expected_status": expected_status,
                "success": False,
                "error": "timeout",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except requests.exceptions.RequestException as e:
            print(f"❌ {name}: {str(e)}")
            return {
                "name": name,
                "url": url,
                "status_code": None,
                "expected_status": expected_status,
                "success": False,
                "error": str(e),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            }

    def test_all_endpoints(self) -> List[Dict[str, Any]]:
        """Test all monitoring endpoints."""
        print("🔍 Testing JewGo Monitoring Endpoints")
        print("=" * 50)

        endpoints = [
            {
                "url": f"{self.base_url}/health",
                "name": "API Health Check",
                "expected_status": 200,
            },
            {"url": f"{self.base_url}/", "name": "API Root", "expected_status": 200},
            {
                "url": f"{self.base_url}/api/restaurants?limit=1",
                "name": "API Restaurants",
                "expected_status": 200,
            },
            {
                "url": f"{self.base_url}/test-sentry",
                "name": "API Sentry Test",
                "expected_status": 200,
            },
            {
                "url": f"{self.frontend_url}",
                "name": "Frontend Home",
                "expected_status": 200,
            },
            {
                "url": f"{self.frontend_url}/auth/test",
                "name": "Frontend Auth Test",
                "expected_status": 200,
            },
        ]

        results = []
        for endpoint in endpoints:
            result = self.test_endpoint(
                endpoint["url"], endpoint["name"], endpoint["expected_status"]
            )
            results.append(result)
            time.sleep(1)  # Be nice to the servers

        return results

    def generate_report(self, results: List[Dict[str, Any]]) -> str:
        """Generate a monitoring report."""
        total = len(results)
        successful = sum(1 for r in results if r["success"])
        failed = total - successful

        report = f"""
📊 Monitoring Test Report
========================
Generated: {time.strftime("%Y-%m-%d %H:%M:%S")}

Summary:
- Total Endpoints: {total}
- Successful: {successful}
- Failed: {failed}
- Success Rate: {(successful/total)*100:.1f}%

Detailed Results:
"""

        for result in results:
            status_icon = "✅" if result["success"] else "❌"
            report += f"{status_icon} {result['name']}\n"
            report += f"   URL: {result['url']}\n"
            report += f"   Status: {result['status_code']} (expected {result['expected_status']})\n"
            if "response_time_ms" in result:
                report += f"   Response Time: {result['response_time_ms']}ms\n"
            if "error" in result:
                report += f"   Error: {result['error']}\n"
            report += "\n"

        return report

    def save_results(
        self, results: List[Dict[str, Any]], filename: str = "monitoring_results.json"
    ):
        """Save test results to a JSON file."""
        with open(filename, "w") as f:
            json.dump(
                {"timestamp": time.strftime("%Y-%m-%d %H:%M:%S"), "results": results},
                f,
                indent=2,
            )
        print(f"📄 Results saved to {filename}")


def main():
    tester = MonitoringTester()
    results = tester.test_all_endpoints()

    print("\n" + "=" * 50)
    report = tester.generate_report(results)
    print(report)

    # Save results
    tester.save_results(results)

    # Exit with error code if any tests failed
    failed_tests = sum(1 for r in results if not r["success"])
    if failed_tests > 0:
        print(f"⚠️  {failed_tests} test(s) failed!")
        exit(1)
    else:
        print("🎉 All tests passed!")


if __name__ == "__main__":
    main()
