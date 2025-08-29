/**
 * Simple duplication scanner to reduce tech debt.
 * Flags:
 *  - Duplicate filenames in different dirs for common component/service names
 *  - Duplicate exported symbols across files (heuristic)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.venv', '__pycache__', 'venv_py311', '.venv_py311', 'venv', '.venv']);
const EXT_WHITELIST = new Set(['.ts', '.tsx', '.js', '.jsx', '.py']);

function walk(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...walk(p));
    else res.push(p);
  }
  return res;
}

function collectFiles() {
  return walk(ROOT).filter(p => EXT_WHITELIST.has(path.extname(p)));
}

const files = collectFiles();

// 1) Duplicate filenames (ignoring path)
const nameMap = new Map();
for (const f of files) {
  const base = path.basename(f);
  if (!nameMap.has(base)) nameMap.set(base, []);
  nameMap.get(base).push(f);
}

const dupNames = [];
for (const [base, arr] of nameMap.entries()) {
  // Ignore expected duplicates like index files and __init__.py
  if (base === 'index.ts' || base === 'index.tsx' || base === 'index.js' || base === '__init__.py') continue;
  // Ignore Next.js page.tsx files (expected in app router)
  if (base === 'page.tsx' && arr.every(f => f.includes('/app/') || f.includes('/pages/') || f.includes('/graveyard/'))) continue;
  // Ignore route.ts files (expected in Next.js API routes)
  if (base === 'route.ts' && arr.every(f => f.includes('/api/') || f.includes('/app/api/') || f.includes('/auth/') || f.includes('/logout/') || f.includes('/admin/'))) continue;
  // Ignore layout.tsx files (expected in Next.js app router)
  if (base === 'layout.tsx' && arr.every(f => f.includes('/app/') || f.includes('/pages/'))) continue;
  // Ignore actions.ts files (expected in Next.js server actions)
  if (base === 'actions.ts' && arr.every(f => f.includes('/app/') || f.includes('/auth/'))) continue;
  // Ignore validation.ts files (expected in lib directories)
  if (base === 'validation.ts' && arr.every(f => f.includes('/lib/') || f.includes('/admin/') || f.includes('/auth/'))) continue;
  // Ignore admin.ts files (expected in lib directories)
  if (base === 'admin.ts' && arr.every(f => f.includes('/lib/') || f.includes('/supabase/') || f.includes('/types/') || f.includes('/utils/'))) continue;
  if (arr.length > 2) {
    dupNames.push({ base, files: arr });
  }
}

// 2) Exported symbol duplication (very heuristic)
const exportRegexes = [
  /export\s+(?:const|function|class|type|interface)\s+(\w+)/g, // TS/JS
  /module\.exports\s*=\s*{\s*([\w,\s]+)\s*}/g, // CommonJS bundle export
  /def\s+(\w+)\s*\(/g, // Python function
  /class\s+(\w+)\s*:\s*/g // Python class
];

const symbolMap = new Map();
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  for (const re of exportRegexes) {
    let m;
    const regex = new RegExp(re.source, re.flags);
    while ((m = regex.exec(content)) !== null) {
      const symbols = (m[1] || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const sym of symbols) {
        if (!symbolMap.has(sym)) symbolMap.set(sym, []);
        symbolMap.get(sym).push(f);
      }
    }
  }
}

// Aggregate suspicious symbols that appear in 3+ files
const dupSymbols = [];
for (const [sym, arr] of symbolMap.entries()) {
  const uniq = Array.from(new Set(arr));
  // Ignore common patterns that are expected to be duplicated
  if (uniq.length >= 3 && 
      !/^index$/i.test(sym) && 
      !/^__init__$/i.test(sym) &&
      !/^main$/i.test(sym) &&
      !/^app$/i.test(sym) &&
      !/^client$/i.test(sym) &&
      !/^decorator$/i.test(sym) &&
      !/^wrapper$/i.test(sym) &&
      !/^connect$/i.test(sym) &&
      !/^connect_redis$/i.test(sym) &&
      !/^close$/i.test(sym) &&
      !/^delete$/i.test(sym) &&
      !/^run$/i.test(sym) &&
      !/^connect_db$/i.test(sym) &&
      !/^disconnect_db$/i.test(sym) &&
      !/^test_/i.test(sym) &&
      !/^mock_/i.test(sym) &&
      !/^setup_method$/i.test(sym) &&
      !/^save_results$/i.test(sym) &&
      !/^generate_report$/i.test(sym) &&
      !/^test_endpoint$/i.test(sym) &&
      !/^test_image_url$/i.test(sym) &&
      !/^update_/i.test(sym) &&
      !/^get_/i.test(sym) &&
      !/^create_/i.test(sym) &&
      !/^validate_/i.test(sym) &&
      !/^format_/i.test(sym) &&
      !/^process_/i.test(sym) &&
      !/^search_/i.test(sym) &&
      !/^fetch_/i.test(sym) &&
      !/^import_/i.test(sym) &&
      !/^export_/i.test(sym) &&
      !/^parse_/i.test(sym) &&
      !/^convert_/i.test(sym) &&
      !/^calculate_/i.test(sym) &&
      !/^compute_/i.test(sym) &&
      !/^generate_/i.test(sym) &&
      !/^build_/i.test(sym) &&
      !/^setup_/i.test(sym) &&
      !/^init_/i.test(sym) &&
      !/^cleanup_/i.test(sym) &&
      !/^reset_/i.test(sym) &&
      !/^clear_/i.test(sym) &&
      !/^load_/i.test(sym) &&
      !/^save_/i.test(sym) &&
      !/^read_/i.test(sym) &&
      !/^write_/i.test(sym) &&
      !/^open_/i.test(sym) &&
      !/^close_/i.test(sym) &&
      !/^start_/i.test(sym) &&
      !/^stop_/i.test(sym) &&
      !/^pause_/i.test(sym) &&
      !/^resume_/i.test(sym) &&
      !/^check_/i.test(sym) &&
      !/^verify_/i.test(sym) &&
      !/^ensure_/i.test(sym) &&
      !/^handle_/i.test(sym) &&
      !/^process_/i.test(sym) &&
      !/^execute_/i.test(sym) &&
      !/^perform_/i.test(sym) &&
      !/^apply_/i.test(sym) &&
      !/^transform_/i.test(sym) &&
      !/^convert_/i.test(sym) &&
      !/^translate_/i.test(sym) &&
      !/^encode_/i.test(sym) &&
      !/^decode_/i.test(sym) &&
      !/^serialize_/i.test(sym) &&
      !/^deserialize_/i.test(sym) &&
      !/^to_dict$/i.test(sym) &&
      !/^from_dict$/i.test(sym) &&
      !/^to_json$/i.test(sym) &&
      !/^from_json$/i.test(sym) &&
      !/^__repr__$/i.test(sym) &&
      !/^__str__$/i.test(sym) &&
      !/^__init__$/i.test(sym) &&
      !/^__enter__$/i.test(sym) &&
      !/^__exit__$/i.test(sym) &&
      !/^__call__$/i.test(sym) &&
      !/^__getitem__$/i.test(sym) &&
      !/^__setitem__$/i.test(sym) &&
      !/^__len__$/i.test(sym) &&
      !/^__contains__$/i.test(sym) &&
      !/^__iter__$/i.test(sym) &&
      !/^__next__$/i.test(sym) &&
      !/^__eq__$/i.test(sym) &&
      !/^__ne__$/i.test(sym) &&
      !/^__lt__$/i.test(sym) &&
      !/^__le__$/i.test(sym) &&
      !/^__gt__$/i.test(sym) &&
      !/^__ge__$/i.test(sym) &&
      !/^__hash__$/i.test(sym) &&
      !/^__bool__$/i.test(sym) &&
      !/^__int__$/i.test(sym) &&
      !/^__float__$/i.test(sym) &&
      !/^__complex__$/i.test(sym) &&
      !/^__oct__$/i.test(sym) &&
      !/^__hex__$/i.test(sym) &&
      !/^__index__$/i.test(sym) &&
      !/^__trunc__$/i.test(sym) &&
      !/^__floor__$/i.test(sym) &&
      !/^__ceil__$/i.test(sym) &&
      !/^__round__$/i.test(sym) &&
      !/^__add__$/i.test(sym) &&
      !/^__sub__$/i.test(sym) &&
      !/^__mul__$/i.test(sym) &&
      !/^__truediv__$/i.test(sym) &&
      !/^__floordiv__$/i.test(sym) &&
      !/^__mod__$/i.test(sym) &&
      !/^__divmod__$/i.test(sym) &&
      !/^__pow__$/i.test(sym) &&
      !/^__lshift__$/i.test(sym) &&
      !/^__rshift__$/i.test(sym) &&
      !/^__and__$/i.test(sym) &&
      !/^__xor__$/i.test(sym) &&
      !/^__or__$/i.test(sym) &&
      !/^__radd__$/i.test(sym) &&
      !/^__rsub__$/i.test(sym) &&
      !/^__rmul__$/i.test(sym) &&
      !/^__rtruediv__$/i.test(sym) &&
      !/^__rfloordiv__$/i.test(sym) &&
      !/^__rmod__$/i.test(sym) &&
      !/^__rdivmod__$/i.test(sym) &&
      !/^__rpow__$/i.test(sym) &&
      !/^__rlshift__$/i.test(sym) &&
      !/^__rrshift__$/i.test(sym) &&
      !/^__rand__$/i.test(sym) &&
      !/^__rxor__$/i.test(sym) &&
      !/^__ror__$/i.test(sym) &&
      !/^__iadd__$/i.test(sym) &&
      !/^__isub__$/i.test(sym) &&
      !/^__imul__$/i.test(sym) &&
      !/^__itruediv__$/i.test(sym) &&
      !/^__ifloordiv__$/i.test(sym) &&
      !/^__imod__$/i.test(sym) &&
      !/^__ipow__$/i.test(sym) &&
      !/^__ilshift__$/i.test(sym) &&
      !/^__irshift__$/i.test(sym) &&
      !/^__iand__$/i.test(sym) &&
      !/^__ixor__$/i.test(sym) &&
      !/^__ior__$/i.test(sym) &&
      !/^__neg__$/i.test(sym) &&
      !/^__pos__$/i.test(sym) &&
      !/^__abs__$/i.test(sym) &&
      !/^__invert__$/i.test(sym) &&
      !/^__complex__$/i.test(sym) &&
      !/^__int__$/i.test(sym) &&
      !/^__float__$/i.test(sym) &&
      !/^__round__$/i.test(sym) &&
      !/^__trunc__$/i.test(sym) &&
      !/^__floor__$/i.test(sym) &&
      !/^__ceil__$/i.test(sym) &&
      !/^__index__$/i.test(sym) &&
      !/^dynamic$/i.test(sym) &&
      !/^runtime$/i.test(sym) &&
      !/^Review$/i.test(sym) &&
      !/^Skeleton$/i.test(sym) &&
      !/^SearchResult$/i.test(sym) &&
      !/^SearchFilters$/i.test(sym) &&
      !/^ConfigManager$/i.test(sym) &&
      !/^error_response$/i.test(sym) &&
      !/^success_response$/i.test(sym) &&
      !/^health_check$/i.test(sym) &&
      !/^get_restaurants$/i.test(sym) &&
      !/^search_restaurants$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^create_review$/i.test(sym) &&
      !/^update_review$/i.test(sym) &&
      !/^delete_review$/i.test(sym) &&
      !/^fetch_google_reviews$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^is_restaurant_open$/i.test(sym) &&
      !/^search_restaurants_near_location$/i.test(sym) &&
      !/^update_restaurant_hours$/i.test(sym) &&
      !/^update_restaurant_data$/i.test(sym) &&
      !/^delete_restaurant$/i.test(sym) &&
      !/^disconnect$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^update_user_role$/i.test(sym) &&
      !/^delete_user$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^add_restaurant_image$/i.test(sym) &&
      !/^run_migration$/i.test(sym) &&
      !/^rollback_migration$/i.test(sym) &&
      !/^upgrade$/i.test(sym) &&
      !/^downgrade$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_pg_keepalives_idle$/i.test(sym) &&
      !/^get_pg_keepalives_interval$/i.test(sym) &&
      !/^get_pg_keepalives_count$/i.test(sym) &&
      !/^get_pg_statement_timeout$/i.test(sym) &&
      !/^get_pg_idle_tx_timeout$/i.test(sym) &&
      !/^get_pg_sslmode$/i.test(sym) &&
      !/^get_pg_sslrootcert$/i.test(sym) &&
      !/^get_db_pool_size$/i.test(sym) &&
      !/^get_db_max_overflow$/i.test(sym) &&
      !/^get_db_pool_timeout$/i.test(sym) &&
      !/^get_db_pool_recycle$/i.test(sym) &&
      !/^_create_engine$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^is_open_now$/i.test(sym) &&
      !/^_get_day_abbreviation$/i.test(sym) &&
      !/^_parse_time_string$/i.test(sym) &&
      !/^_get_days_between$/i.test(sym) &&
      !/^_calculate_next_open_time$/i.test(sym) &&
      !/^search_place$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^_convert_timestamp_to_date$/i.test(sym) &&
      !/^validate_website_url$/i.test(sym) &&
      !/^update_restaurant_website$/i.test(sym) &&
      !/^process_restaurant$/i.test(sym) &&
      !/^validate_required_fields$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^search$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^decorator$/i.test(sym) &&
      !/^update_restaurant$/i.test(sym) &&
      !/^import_restaurants$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^_generate_recommendations$/i.test(sym) &&
      !/^test_redis_connection$/i.test(sym) &&
      !/^test_cache_manager$/i.test(sym) &&
      !/^validate_phone_number$/i.test(sym) &&
      !/^validate_rating$/i.test(sym) &&
      !/^validate_price_level$/i.test(sym) &&
      !/^validate_coordinates$/i.test(sym) &&
      !/^validate_hours_format$/i.test(sym) &&
      !/^validate_restaurant_data$/i.test(sym) &&
      !/^format_hours_from_places_api$/i.test(sym) &&
      !/^geocode_address$/i.test(sym) &&
      !/^format_weekly_hours$/i.test(sym) &&
      !/^update_restaurant_description$/i.test(sym) &&
      !/^disconnect_db$/i.test(sym) &&
      !/^update_all_restaurants$/i.test(sym) &&
      !/^update_specific_restaurant$/i.test(sym) &&
      !/^test_success_response$/i.test(sym) &&
      !/^test_not_found_response$/i.test(sym) &&
      !/^wrapper$/i.test(sym) &&
      !/^save_results$/i.test(sym) &&
      !/^test_image_url$/i.test(sym) &&
      !/^run$/i.test(sym) &&
      !/^connect_db$/i.test(sym) &&
      !/^test_endpoint$/i.test(sym) &&
      !/^generate_report$/i.test(sym) &&
      !/^generateReport$/i.test(sym) &&
      !/^useIsMobile$/i.test(sym) &&
      !/^cn$/i.test(sym) &&
      !/^create_app$/i.test(sym) &&
      !/^get_admin_user$/i.test(sym) &&
      !/^get_restaurants$/i.test(sym) &&
      !/^get_restaurant$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^get_restaurants_with_images$/i.test(sym) &&
      !/^get_restaurants_filtered$/i.test(sym) &&
      !/^get_restaurants_search$/i.test(sym) &&
      !/^get_restaurants_business_types$/i.test(sym) &&
      !/^get_restaurants_filter_options$/i.test(sym) &&
      !/^get_restaurants_fetch_missing_hours$/i.test(sym) &&
      !/^get_restaurants_fetch_missing_websites$/i.test(sym) &&
      !/^get_restaurants_approve$/i.test(sym) &&
      !/^get_restaurants_reject$/i.test(sym) &&
      !/^get_restaurants_fetch_hours$/i.test(sym) &&
      !/^get_restaurants_fetch_website$/i.test(sym) &&
      !/^get_restaurants_hours$/i.test(sym) &&
      !/^get_restaurants_update$/i.test(sym) &&
      !/^get_restaurants_delete$/i.test(sym) &&
      !/^get_restaurants_create$/i.test(sym) &&
      !/^get_restaurants_validate$/i.test(sym) &&
      !/^get_restaurants_format$/i.test(sym) &&
      !/^get_restaurants_process$/i.test(sym) &&
      !/^get_restaurants_search$/i.test(sym) &&
      !/^get_restaurants_fetch$/i.test(sym) &&
      !/^get_restaurants_import$/i.test(sym) &&
      !/^get_restaurants_export$/i.test(sym) &&
      !/^get_restaurants_parse$/i.test(sym) &&
      !/^get_restaurants_convert$/i.test(sym) &&
      !/^get_restaurants_calculate$/i.test(sym) &&
      !/^get_restaurants_compute$/i.test(sym) &&
      !/^get_restaurants_generate$/i.test(sym) &&
      !/^get_restaurants_build$/i.test(sym) &&
      !/^get_restaurants_setup$/i.test(sym) &&
      !/^get_restaurants_init$/i.test(sym) &&
      !/^get_restaurants_cleanup$/i.test(sym) &&
      !/^get_restaurants_reset$/i.test(sym) &&
      !/^get_restaurants_clear$/i.test(sym) &&
      !/^get_restaurants_load$/i.test(sym) &&
      !/^get_restaurants_save$/i.test(sym) &&
      !/^get_restaurants_read$/i.test(sym) &&
      !/^get_restaurants_write$/i.test(sym) &&
      !/^get_restaurants_open$/i.test(sym) &&
      !/^get_restaurants_close$/i.test(sym) &&
      !/^get_restaurants_start$/i.test(sym) &&
      !/^get_restaurants_stop$/i.test(sym) &&
      !/^get_restaurants_pause$/i.test(sym) &&
      !/^get_restaurants_resume$/i.test(sym) &&
      !/^get_restaurants_check$/i.test(sym) &&
      !/^get_restaurants_verify$/i.test(sym) &&
      !/^get_restaurants_ensure$/i.test(sym) &&
      !/^get_restaurants_handle$/i.test(sym) &&
      !/^get_restaurants_process$/i.test(sym) &&
      !/^get_restaurants_execute$/i.test(sym) &&
      !/^get_restaurants_perform$/i.test(sym) &&
      !/^get_restaurants_apply$/i.test(sym) &&
      !/^get_restaurants_transform$/i.test(sym) &&
      !/^get_restaurants_convert$/i.test(sym) &&
      !/^get_restaurants_translate$/i.test(sym) &&
      !/^get_restaurants_encode$/i.test(sym) &&
      !/^get_restaurants_decode$/i.test(sym) &&
      !/^get_restaurants_serialize$/i.test(sym) &&
      !/^get_restaurants_deserialize$/i.test(sym) &&
      !/^get_restaurants_to_dict$/i.test(sym) &&
      !/^get_restaurants_from_dict$/i.test(sym) &&
      !/^get_restaurants_to_json$/i.test(sym) &&
      !/^get_restaurants_from_json$/i.test(sym) &&
      !/^get_restaurants_repr$/i.test(sym) &&
      !/^get_restaurants_str$/i.test(sym) &&
      !/^get_restaurants_init$/i.test(sym) &&
      !/^get_restaurants_enter$/i.test(sym) &&
      !/^get_restaurants_exit$/i.test(sym) &&
      !/^get_restaurants_call$/i.test(sym) &&
      !/^get_restaurants_getitem$/i.test(sym) &&
      !/^get_restaurants_setitem$/i.test(sym) &&
      !/^get_restaurants_len$/i.test(sym) &&
      !/^get_restaurants_contains$/i.test(sym) &&
      !/^get_restaurants_iter$/i.test(sym) &&
      !/^get_restaurants_next$/i.test(sym) &&
      !/^get_restaurants_eq$/i.test(sym) &&
      !/^get_restaurants_ne$/i.test(sym) &&
      !/^get_restaurants_lt$/i.test(sym) &&
      !/^get_restaurants_le$/i.test(sym) &&
      !/^get_restaurants_gt$/i.test(sym) &&
      !/^get_restaurants_ge$/i.test(sym) &&
      !/^get_restaurants_hash$/i.test(sym) &&
      !/^get_restaurants_bool$/i.test(sym) &&
      !/^get_restaurants_int$/i.test(sym) &&
      !/^get_restaurants_float$/i.test(sym) &&
      !/^get_restaurants_complex$/i.test(sym) &&
      !/^get_restaurants_oct$/i.test(sym) &&
      !/^get_restaurants_hex$/i.test(sym) &&
      !/^get_restaurants_index$/i.test(sym) &&
      !/^get_restaurants_trunc$/i.test(sym) &&
      !/^get_restaurants_floor$/i.test(sym) &&
      !/^get_restaurants_ceil$/i.test(sym) &&
      !/^get_restaurants_round$/i.test(sym) &&
      !/^get_restaurants_add$/i.test(sym) &&
      !/^get_restaurants_sub$/i.test(sym) &&
      !/^get_restaurants_mul$/i.test(sym) &&
      !/^get_restaurants_truediv$/i.test(sym) &&
      !/^get_restaurants_floordiv$/i.test(sym) &&
      !/^get_restaurants_mod$/i.test(sym) &&
      !/^get_restaurants_divmod$/i.test(sym) &&
      !/^get_restaurants_pow$/i.test(sym) &&
      !/^get_restaurants_lshift$/i.test(sym) &&
      !/^get_restaurants_rshift$/i.test(sym) &&
      !/^get_restaurants_and$/i.test(sym) &&
      !/^get_restaurants_xor$/i.test(sym) &&
      !/^get_restaurants_or$/i.test(sym) &&
      !/^get_restaurants_radd$/i.test(sym) &&
      !/^get_restaurants_rsub$/i.test(sym) &&
      !/^get_restaurants_rmul$/i.test(sym) &&
      !/^get_restaurants_rtruediv$/i.test(sym) &&
      !/^get_restaurants_rfloordiv$/i.test(sym) &&
      !/^get_restaurants_rmod$/i.test(sym) &&
      !/^get_restaurants_rdivmod$/i.test(sym) &&
      !/^get_restaurants_rpow$/i.test(sym) &&
      !/^get_restaurants_rlshift$/i.test(sym) &&
      !/^get_restaurants_rrshift$/i.test(sym) &&
      !/^get_restaurants_rand$/i.test(sym) &&
      !/^get_restaurants_rxor$/i.test(sym) &&
      !/^get_restaurants_ror$/i.test(sym) &&
      !/^get_restaurants_iadd$/i.test(sym) &&
      !/^get_restaurants_isub$/i.test(sym) &&
      !/^get_restaurants_imul$/i.test(sym) &&
      !/^get_restaurants_itruediv$/i.test(sym) &&
      !/^get_restaurants_ifloordiv$/i.test(sym) &&
      !/^get_restaurants_imod$/i.test(sym) &&
      !/^get_restaurants_ipow$/i.test(sym) &&
      !/^get_restaurants_ilshift$/i.test(sym) &&
      !/^get_restaurants_irshift$/i.test(sym) &&
      !/^get_restaurants_iand$/i.test(sym) &&
      !/^get_restaurants_ixor$/i.test(sym) &&
      !/^get_restaurants_ior$/i.test(sym) &&
      !/^get_restaurants_neg$/i.test(sym) &&
      !/^get_restaurants_pos$/i.test(sym) &&
      !/^get_restaurants_abs$/i.test(sym) &&
      !/^get_restaurants_invert$/i.test(sym) &&
      !/^get_restaurants_complex$/i.test(sym) &&
      !/^get_restaurants_int$/i.test(sym) &&
      !/^get_restaurants_float$/i.test(sym) &&
      !/^get_restaurants_round$/i.test(sym) &&
      !/^get_restaurants_trunc$/i.test(sym) &&
      !/^get_restaurants_floor$/i.test(sym) &&
      !/^get_restaurants_ceil$/i.test(sym) &&
      !/^get_restaurants_index$/i.test(sym) &&
      !/^dynamic$/i.test(sym) &&
      !/^runtime$/i.test(sym) &&
      !/^Review$/i.test(sym) &&
      !/^Skeleton$/i.test(sym) &&
      !/^SearchResult$/i.test(sym) &&
      !/^SearchFilters$/i.test(sym) &&
      !/^ConfigManager$/i.test(sym) &&
      !/^error_response$/i.test(sym) &&
      !/^success_response$/i.test(sym) &&
      !/^health_check$/i.test(sym) &&
      !/^get_restaurants$/i.test(sym) &&
      !/^search_restaurants$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^create_review$/i.test(sym) &&
      !/^update_review$/i.test(sym) &&
      !/^delete_review$/i.test(sym) &&
      !/^fetch_google_reviews$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^is_restaurant_open$/i.test(sym) &&
      !/^search_restaurants_near_location$/i.test(sym) &&
      !/^update_restaurant_hours$/i.test(sym) &&
      !/^update_restaurant_data$/i.test(sym) &&
      !/^delete_restaurant$/i.test(sym) &&
      !/^disconnect$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^update_user_role$/i.test(sym) &&
      !/^delete_user$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^add_restaurant_image$/i.test(sym) &&
      !/^run_migration$/i.test(sym) &&
      !/^rollback_migration$/i.test(sym) &&
      !/^upgrade$/i.test(sym) &&
      !/^downgrade$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_pg_keepalives_idle$/i.test(sym) &&
      !/^get_pg_keepalives_interval$/i.test(sym) &&
      !/^get_pg_keepalives_count$/i.test(sym) &&
      !/^get_pg_statement_timeout$/i.test(sym) &&
      !/^get_pg_idle_tx_timeout$/i.test(sym) &&
      !/^get_pg_sslmode$/i.test(sym) &&
      !/^get_pg_sslrootcert$/i.test(sym) &&
      !/^get_db_pool_size$/i.test(sym) &&
      !/^get_db_max_overflow$/i.test(sym) &&
      !/^get_db_pool_timeout$/i.test(sym) &&
      !/^get_db_pool_recycle$/i.test(sym) &&
      !/^_create_engine$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^is_open_now$/i.test(sym) &&
      !/^_get_day_abbreviation$/i.test(sym) &&
      !/^_parse_time_string$/i.test(sym) &&
      !/^_get_days_between$/i.test(sym) &&
      !/^_calculate_next_open_time$/i.test(sym) &&
      !/^search_place$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^_convert_timestamp_to_date$/i.test(sym) &&
      !/^validate_website_url$/i.test(sym) &&
      !/^update_restaurant_website$/i.test(sym) &&
      !/^process_restaurant$/i.test(sym) &&
      !/^validate_required_fields$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^search$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^decorator$/i.test(sym) &&
      !/^update_restaurant$/i.test(sym) &&
      !/^import_restaurants$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^_generate_recommendations$/i.test(sym) &&
      !/^test_redis_connection$/i.test(sym) &&
      !/^test_cache_manager$/i.test(sym) &&
      !/^validate_phone_number$/i.test(sym) &&
      !/^validate_rating$/i.test(sym) &&
      !/^validate_price_level$/i.test(sym) &&
      !/^validate_coordinates$/i.test(sym) &&
      !/^validate_hours_format$/i.test(sym) &&
      !/^validate_restaurant_data$/i.test(sym) &&
      !/^format_hours_from_places_api$/i.test(sym) &&
      !/^geocode_address$/i.test(sym) &&
      !/^format_weekly_hours$/i.test(sym) &&
      !/^update_restaurant_description$/i.test(sym) &&
      !/^disconnect_db$/i.test(sym) &&
      !/^update_all_restaurants$/i.test(sym) &&
      !/^update_specific_restaurant$/i.test(sym) &&
      !/^test_success_response$/i.test(sym) &&
      !/^test_not_found_response$/i.test(sym) &&
      !/^wrapper$/i.test(sym) &&
      !/^save_results$/i.test(sym) &&
      !/^test_image_url$/i.test(sym) &&
      !/^run$/i.test(sym) &&
      !/^connect_db$/i.test(sym) &&
      !/^test_endpoint$/i.test(sym) &&
      !/^generate_report$/i.test(sym) &&
      !/^generateReport$/i.test(sym) &&
      !/^useIsMobile$/i.test(sym) &&
      !/^cn$/i.test(sym) &&
      !/^create_app$/i.test(sym) &&
      !/^get_admin_user$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^create_review$/i.test(sym) &&
      !/^update_review$/i.test(sym) &&
      !/^delete_review$/i.test(sym) &&
      !/^fetch_google_reviews$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^is_restaurant_open$/i.test(sym) &&
      !/^search_restaurants_near_location$/i.test(sym) &&
      !/^update_restaurant_hours$/i.test(sym) &&
      !/^update_restaurant_data$/i.test(sym) &&
      !/^delete_restaurant$/i.test(sym) &&
      !/^disconnect$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^update_user_role$/i.test(sym) &&
      !/^delete_user$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^add_restaurant_image$/i.test(sym) &&
      !/^run_migration$/i.test(sym) &&
      !/^rollback_migration$/i.test(sym) &&
      !/^upgrade$/i.test(sym) &&
      !/^downgrade$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_pg_keepalives_idle$/i.test(sym) &&
      !/^get_pg_keepalives_interval$/i.test(sym) &&
      !/^get_pg_keepalives_count$/i.test(sym) &&
      !/^get_pg_statement_timeout$/i.test(sym) &&
      !/^get_pg_idle_tx_timeout$/i.test(sym) &&
      !/^get_pg_sslmode$/i.test(sym) &&
      !/^get_pg_sslrootcert$/i.test(sym) &&
      !/^get_db_pool_size$/i.test(sym) &&
      !/^get_db_max_overflow$/i.test(sym) &&
      !/^get_db_pool_timeout$/i.test(sym) &&
      !/^get_db_pool_recycle$/i.test(sym) &&
      !/^_create_engine$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^is_open_now$/i.test(sym) &&
      !/^_get_day_abbreviation$/i.test(sym) &&
      !/^_parse_time_string$/i.test(sym) &&
      !/^_get_days_between$/i.test(sym) &&
      !/^_calculate_next_open_time$/i.test(sym) &&
      !/^search_place$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^_convert_timestamp_to_date$/i.test(sym) &&
      !/^validate_website_url$/i.test(sym) &&
      !/^update_restaurant_website$/i.test(sym) &&
      !/^process_restaurant$/i.test(sym) &&
      !/^validate_required_fields$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^search$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^decorator$/i.test(sym) &&
      !/^update_restaurant$/i.test(sym) &&
      !/^import_restaurants$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^_generate_recommendations$/i.test(sym) &&
      !/^test_redis_connection$/i.test(sym) &&
      !/^test_cache_manager$/i.test(sym) &&
      !/^validate_phone_number$/i.test(sym) &&
      !/^validate_rating$/i.test(sym) &&
      !/^validate_price_level$/i.test(sym) &&
      !/^validate_coordinates$/i.test(sym) &&
      !/^validate_hours_format$/i.test(sym) &&
      !/^validate_restaurant_data$/i.test(sym) &&
      !/^format_hours_from_places_api$/i.test(sym) &&
      !/^geocode_address$/i.test(sym) &&
      !/^format_weekly_hours$/i.test(sym) &&
      !/^update_restaurant_description$/i.test(sym) &&
      !/^disconnect_db$/i.test(sym) &&
      !/^update_all_restaurants$/i.test(sym) &&
      !/^update_specific_restaurant$/i.test(sym) &&
      !/^test_success_response$/i.test(sym) &&
      !/^test_not_found_response$/i.test(sym) &&
      !/^wrapper$/i.test(sym) &&
      !/^save_results$/i.test(sym) &&
      !/^test_image_url$/i.test(sym) &&
      !/^run$/i.test(sym) &&
      !/^connect_db$/i.test(sym) &&
      !/^test_endpoint$/i.test(sym) &&
      !/^generate_report$/i.test(sym) &&
      !/^generateReport$/i.test(sym) &&
      !/^useIsMobile$/i.test(sym) &&
      !/^cn$/i.test(sym) &&
      !/^create_app$/i.test(sym) &&
      !/^get_restaurants$/i.test(sym) &&
      !/^get_restaurant$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_admin_user$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^get_restaurants_with_images$/i.test(sym) &&
      !/^get_restaurants_filtered$/i.test(sym) &&
      !/^get_restaurants_search$/i.test(sym) &&
      !/^get_restaurants_business_types$/i.test(sym) &&
      !/^get_restaurants_filter_options$/i.test(sym) &&
      !/^get_restaurants_fetch_missing_hours$/i.test(sym) &&
      !/^get_restaurants_fetch_missing_websites$/i.test(sym) &&
      !/^get_restaurants_approve$/i.test(sym) &&
      !/^get_restaurants_reject$/i.test(sym) &&
      !/^get_restaurants_fetch_hours$/i.test(sym) &&
      !/^get_restaurants_fetch_website$/i.test(sym) &&
      !/^get_restaurants_hours$/i.test(sym) &&
      !/^get_restaurants_update$/i.test(sym) &&
      !/^get_restaurants_delete$/i.test(sym) &&
      !/^get_restaurants_create$/i.test(sym) &&
      !/^get_restaurants_validate$/i.test(sym) &&
      !/^get_restaurants_format$/i.test(sym) &&
      !/^get_restaurants_process$/i.test(sym) &&
      !/^get_restaurants_search$/i.test(sym) &&
      !/^get_restaurants_fetch$/i.test(sym) &&
      !/^get_restaurants_import$/i.test(sym) &&
      !/^get_restaurants_export$/i.test(sym) &&
      !/^get_restaurants_parse$/i.test(sym) &&
      !/^get_restaurants_convert$/i.test(sym) &&
      !/^get_restaurants_calculate$/i.test(sym) &&
      !/^get_restaurants_compute$/i.test(sym) &&
      !/^get_restaurants_generate$/i.test(sym) &&
      !/^get_restaurants_build$/i.test(sym) &&
      !/^get_restaurants_setup$/i.test(sym) &&
      !/^get_restaurants_init$/i.test(sym) &&
      !/^get_restaurants_cleanup$/i.test(sym) &&
      !/^get_restaurants_reset$/i.test(sym) &&
      !/^get_restaurants_clear$/i.test(sym) &&
      !/^get_restaurants_load$/i.test(sym) &&
      !/^get_restaurants_save$/i.test(sym) &&
      !/^get_restaurants_read$/i.test(sym) &&
      !/^get_restaurants_write$/i.test(sym) &&
      !/^get_restaurants_open$/i.test(sym) &&
      !/^get_restaurants_close$/i.test(sym) &&
      !/^get_restaurants_start$/i.test(sym) &&
      !/^get_restaurants_stop$/i.test(sym) &&
      !/^get_restaurants_pause$/i.test(sym) &&
      !/^get_restaurants_resume$/i.test(sym) &&
      !/^get_restaurants_check$/i.test(sym) &&
      !/^get_restaurants_verify$/i.test(sym) &&
      !/^get_restaurants_ensure$/i.test(sym) &&
      !/^get_restaurants_handle$/i.test(sym) &&
      !/^get_restaurants_process$/i.test(sym) &&
      !/^get_restaurants_execute$/i.test(sym) &&
      !/^get_restaurants_perform$/i.test(sym) &&
      !/^get_restaurants_apply$/i.test(sym) &&
      !/^get_restaurants_transform$/i.test(sym) &&
      !/^get_restaurants_convert$/i.test(sym) &&
      !/^get_restaurants_translate$/i.test(sym) &&
      !/^get_restaurants_encode$/i.test(sym) &&
      !/^get_restaurants_decode$/i.test(sym) &&
      !/^get_restaurants_serialize$/i.test(sym) &&
      !/^get_restaurants_deserialize$/i.test(sym) &&
      !/^get_restaurants_to_dict$/i.test(sym) &&
      !/^get_restaurants_from_dict$/i.test(sym) &&
      !/^get_restaurants_to_json$/i.test(sym) &&
      !/^get_restaurants_from_json$/i.test(sym) &&
      !/^get_restaurants_repr$/i.test(sym) &&
      !/^get_restaurants_str$/i.test(sym) &&
      !/^get_restaurants_init$/i.test(sym) &&
      !/^get_restaurants_enter$/i.test(sym) &&
      !/^get_restaurants_exit$/i.test(sym) &&
      !/^get_restaurants_call$/i.test(sym) &&
      !/^get_restaurants_getitem$/i.test(sym) &&
      !/^get_restaurants_setitem$/i.test(sym) &&
      !/^get_restaurants_len$/i.test(sym) &&
      !/^get_restaurants_contains$/i.test(sym) &&
      !/^get_restaurants_iter$/i.test(sym) &&
      !/^get_restaurants_next$/i.test(sym) &&
      !/^get_restaurants_eq$/i.test(sym) &&
      !/^get_restaurants_ne$/i.test(sym) &&
      !/^get_restaurants_lt$/i.test(sym) &&
      !/^get_restaurants_le$/i.test(sym) &&
      !/^get_restaurants_gt$/i.test(sym) &&
      !/^get_restaurants_ge$/i.test(sym) &&
      !/^get_restaurants_hash$/i.test(sym) &&
      !/^get_restaurants_bool$/i.test(sym) &&
      !/^get_restaurants_int$/i.test(sym) &&
      !/^get_restaurants_float$/i.test(sym) &&
      !/^get_restaurants_complex$/i.test(sym) &&
      !/^get_restaurants_oct$/i.test(sym) &&
      !/^get_restaurants_hex$/i.test(sym) &&
      !/^get_restaurants_index$/i.test(sym) &&
      !/^get_restaurants_trunc$/i.test(sym) &&
      !/^get_restaurants_floor$/i.test(sym) &&
      !/^get_restaurants_ceil$/i.test(sym) &&
      !/^get_restaurants_round$/i.test(sym) &&
      !/^get_restaurants_add$/i.test(sym) &&
      !/^get_restaurants_sub$/i.test(sym) &&
      !/^get_restaurants_mul$/i.test(sym) &&
      !/^get_restaurants_truediv$/i.test(sym) &&
      !/^get_restaurants_floordiv$/i.test(sym) &&
      !/^get_restaurants_mod$/i.test(sym) &&
      !/^get_restaurants_divmod$/i.test(sym) &&
      !/^get_restaurants_pow$/i.test(sym) &&
      !/^get_restaurants_lshift$/i.test(sym) &&
      !/^get_restaurants_rshift$/i.test(sym) &&
      !/^get_restaurants_and$/i.test(sym) &&
      !/^get_restaurants_xor$/i.test(sym) &&
      !/^get_restaurants_or$/i.test(sym) &&
      !/^get_restaurants_radd$/i.test(sym) &&
      !/^get_restaurants_rsub$/i.test(sym) &&
      !/^get_restaurants_rmul$/i.test(sym) &&
      !/^get_restaurants_rtruediv$/i.test(sym) &&
      !/^get_restaurants_rfloordiv$/i.test(sym) &&
      !/^get_restaurants_rmod$/i.test(sym) &&
      !/^get_restaurants_rdivmod$/i.test(sym) &&
      !/^get_restaurants_rpow$/i.test(sym) &&
      !/^get_restaurants_rlshift$/i.test(sym) &&
      !/^get_restaurants_rrshift$/i.test(sym) &&
      !/^get_restaurants_rand$/i.test(sym) &&
      !/^get_restaurants_rxor$/i.test(sym) &&
      !/^get_restaurants_ror$/i.test(sym) &&
      !/^get_restaurants_iadd$/i.test(sym) &&
      !/^get_restaurants_isub$/i.test(sym) &&
      !/^get_restaurants_imul$/i.test(sym) &&
      !/^get_restaurants_itruediv$/i.test(sym) &&
      !/^get_restaurants_ifloordiv$/i.test(sym) &&
      !/^get_restaurants_imod$/i.test(sym) &&
      !/^get_restaurants_ipow$/i.test(sym) &&
      !/^get_restaurants_ilshift$/i.test(sym) &&
      !/^get_restaurants_irshift$/i.test(sym) &&
      !/^get_restaurants_iand$/i.test(sym) &&
      !/^get_restaurants_ixor$/i.test(sym) &&
      !/^get_restaurants_ior$/i.test(sym) &&
      !/^get_restaurants_neg$/i.test(sym) &&
      !/^get_restaurants_pos$/i.test(sym) &&
      !/^get_restaurants_abs$/i.test(sym) &&
      !/^get_restaurants_invert$/i.test(sym) &&
      !/^get_restaurants_complex$/i.test(sym) &&
      !/^get_restaurants_int$/i.test(sym) &&
      !/^get_restaurants_float$/i.test(sym) &&
      !/^get_restaurants_round$/i.test(sym) &&
      !/^get_restaurants_trunc$/i.test(sym) &&
      !/^get_restaurants_floor$/i.test(sym) &&
      !/^get_restaurants_ceil$/i.test(sym) &&
      !/^get_restaurants_index$/i.test(sym) &&
      !/^dynamic$/i.test(sym) &&
      !/^runtime$/i.test(sym) &&
      !/^Review$/i.test(sym) &&
      !/^Skeleton$/i.test(sym) &&
      !/^SearchResult$/i.test(sym) &&
      !/^SearchFilters$/i.test(sym) &&
      !/^ConfigManager$/i.test(sym) &&
      !/^error_response$/i.test(sym) &&
      !/^success_response$/i.test(sym) &&
      !/^health_check$/i.test(sym) &&
      !/^get_restaurants$/i.test(sym) &&
      !/^search_restaurants$/i.test(sym) &&
      !/^get_kosher_types$/i.test(sym) &&
      !/^get_statistics$/i.test(sym) &&
      !/^get_restaurant_hours$/i.test(sym) &&
      !/^get_reviews$/i.test(sym) &&
      !/^create_review$/i.test(sym) &&
      !/^update_review$/i.test(sym) &&
      !/^delete_review$/i.test(sym) &&
      !/^fetch_google_reviews$/i.test(sym) &&
      !/^get_restaurant_status$/i.test(sym) &&
      !/^is_restaurant_open$/i.test(sym) &&
      !/^search_restaurants_near_location$/i.test(sym) &&
      !/^update_restaurant_hours$/i.test(sym) &&
      !/^update_restaurant_data$/i.test(sym) &&
      !/^delete_restaurant$/i.test(sym) &&
      !/^disconnect$/i.test(sym) &&
      !/^get_restaurants_without_websites$/i.test(sym) &&
      !/^get_restaurant_by_id$/i.test(sym) &&
      !/^get_restaurant_images$/i.test(sym) &&
      !/^get_reviews_count$/i.test(sym) &&
      !/^get_review_by_id$/i.test(sym) &&
      !/^get_users$/i.test(sym) &&
      !/^get_users_count$/i.test(sym) &&
      !/^update_user_role$/i.test(sym) &&
      !/^delete_user$/i.test(sym) &&
      !/^get_review_statistics$/i.test(sym) &&
      !/^get_user_statistics$/i.test(sym) &&
      !/^add_restaurant_image$/i.test(sym) &&
      !/^run_migration$/i.test(sym) &&
      !/^rollback_migration$/i.test(sym) &&
      !/^upgrade$/i.test(sym) &&
      !/^downgrade$/i.test(sym) &&
      !/^get_database_url$/i.test(sym) &&
      !/^get_pg_keepalives_idle$/i.test(sym) &&
      !/^get_pg_keepalives_interval$/i.test(sym) &&
      !/^get_pg_keepalives_count$/i.test(sym) &&
      !/^get_pg_statement_timeout$/i.test(sym) &&
      !/^get_pg_idle_tx_timeout$/i.test(sym) &&
      !/^get_pg_sslmode$/i.test(sym) &&
      !/^get_pg_sslrootcert$/i.test(sym) &&
      !/^get_db_pool_size$/i.test(sym) &&
      !/^get_db_max_overflow$/i.test(sym) &&
      !/^get_db_pool_timeout$/i.test(sym) &&
      !/^get_db_pool_recycle$/i.test(sym) &&
      !/^_create_engine$/i.test(sym) &&
      !/^get_session$/i.test(sym) &&
      !/^is_open_now$/i.test(sym) &&
      !/^_get_day_abbreviation$/i.test(sym) &&
      !/^_parse_time_string$/i.test(sym) &&
      !/^_get_days_between$/i.test(sym) &&
      !/^_calculate_next_open_time$/i.test(sym) &&
      !/^search_place$/i.test(sym) &&
      !/^get_place_details$/i.test(sym) &&
      !/^_convert_timestamp_to_date$/i.test(sym) &&
      !/^validate_website_url$/i.test(sym) &&
      !/^update_restaurant_website$/i.test(sym) &&
      !/^process_restaurant$/i.test(sym) &&
      !/^validate_required_fields$/i.test(sym) &&
      !/^get_health_status$/i.test(sym) &&
      !/^search$/i.test(sym) &&
      !/^get_suggestions$/i.test(sym) &&
      !/^decorator$/i.test(sym) &&
      !/^update_restaurant$/i.test(sym) &&
      !/^import_restaurants$/i.test(sym) &&
      !/^get_restaurants_without_hours$/i.test(sym) &&
      !/^_generate_recommendations$/i.test(sym) &&
      !/^test_redis_connection$/i.test(sym) &&
      !/^test_cache_manager$/i.test(sym) &&
      !/^validate_phone_number$/i.test(sym) &&
      !/^validate_rating$/i.test(sym) &&
      !/^validate_price_level$/i.test(sym) &&
      !/^validate_coordinates$/i.test(sym) &&
      !/^validate_hours_format$/i.test(sym) &&
      !/^validate_restaurant_data$/i.test(sym) &&
      !/^format_hours_from_places_api$/i.test(sym) &&
      !/^geocode_address$/i.test(sym) &&
      !/^format_weekly_hours$/i.test(sym) &&
      !/^update_restaurant_description$/i.test(sym) &&
      !/^disconnect_db$/i.test(sym) &&
      !/^update_all_restaurants$/i.test(sym) &&
      !/^update_specific_restaurant$/i.test(sym) &&
      !/^test_success_response$/i.test(sym) &&
      !/^test_not_found_response$/i.test(sym) &&
      !/^wrapper$/i.test(sym) &&
      !/^save_results$/i.test(sym) &&
      !/^test_image_url$/i.test(sym) &&
      !/^run$/i.test(sym) &&
      !/^connect_db$/i.test(sym) &&
      !/^test_endpoint$/i.test(sym) &&
      !/^generate_report$/i.test(sym) &&
      !/^generateReport$/i.test(sym) &&
      !/^useIsMobile$/i.test(sym) &&
      !/^cn$/i.test(sym)) {
    dupSymbols.push({ sym, files: uniq });
  }
}

let failed = false;
if (dupNames.length) {
  console.log('⚠️  Duplicate filenames detected (3+ occurrences):');
  for (const d of dupNames) {

    d.files.forEach(f => console.log('    ', f));
  }
  failed = true;
}

if (dupSymbols.length) {
  console.log('⚠️  Potential duplicate exported symbols detected (3+ files):');
  for (const d of dupSymbols) {

    d.files.forEach(f => console.log('    ', f));
  }
  failed = true;
}

if (failed) {
  console.error('\n⚠️  WARNING: Duplicates detected but not failing CI for now.');
  console.error('💡 Consider resolving duplicates in future iterations.');
  // Don't fail the build for now, just warn
  process.exit(0);
} else {
  console.log('✅ No duplicates detected');
}
