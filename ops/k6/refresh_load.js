import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 20,
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.BACKEND_URL || 'http://localhost:5000';

export default function () {
  // Assumes a valid refresh_token cookie is already present if run via browser/har; otherwise post a dummy body
  const res = http.post(`${BASE}/api/auth/refresh`, JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  sleep(1);
}

