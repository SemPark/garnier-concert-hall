-- GoogleSQL template for an existing billing-free GA4 daily export.
-- Replace the project and dataset and supply two STRING parameters (YYYYMMDD).
-- Both suffixes must name the same day. See bigquery-sandbox.md before use.
SELECT
  event_date AS date,
  event_name,
  COUNT(*) AS event_count
FROM `YOUR_PROJECT.analytics_YOUR_PROPERTY.events_*`
WHERE _TABLE_SUFFIX BETWEEN @start_suffix AND @end_suffix
  AND @start_suffix = @end_suffix
  AND REGEXP_CONTAINS(@start_suffix, r'^[0-9]{8}$')
  AND event_name IN (
    'playback_start', 'playback_180_seconds',
    'hall_program_click', 'hall_seat_map_open', 'hall_music_panel_open',
    'hall_playlist_open', 'hall_next_track_click', 'hall_space_click',
    'hall_stage_click', 'hall_rear_click', 'hall_overview_view_click',
    'hall_stage_view_click', 'hall_broadcast_view_click'
  )
GROUP BY date, event_name
ORDER BY date, event_name
