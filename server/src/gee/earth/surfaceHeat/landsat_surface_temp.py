import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account

# GEE project: env GEE_PROJECT_ID, else the project_id from the service account key file
GCP_PROJECT_ID = os.environ.get('GEE_PROJECT_ID')

# Look back 16 days (Landsat revisit cycle is 16 days)
RECENT_PERIOD_DAYS = 16
DEFAULT_TEMP_THRESHOLD = 40.0  # Celsius
DEFAULT_BUFFER = 5000
LANDSAT_COLLECTIONS = ["LANDSAT/LC09/C02/T1_L2", "LANDSAT/LC08/C02/T1_L2"]

# QA_PIXEL bits: 0 fill, 1 dilated cloud, 2 cirrus, 3 cloud, 4 cloud shadow
QA_BAD_PIXEL_BITS = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4)

def initialize_gee(credentials_path_arg):
    try:
        credentials_path = credentials_path_arg
        if not credentials_path or not os.path.exists(credentials_path):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        
        ee.Initialize(
            credentials=scoped_credentials, 
            project=GCP_PROJECT_ID or credentials.project_id, 
            opt_url='https://earthengine-highvolume.googleapis.com'
        )
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def get_heatmap_url(image, region_geometry, vis_params):
    try:
        return image.getThumbURL({
            'min': vis_params['min'], 
            'max': vis_params['max'], 
            'palette': vis_params['palette'],
            'dimensions': 600,
            'region': region_geometry, 
            'format': 'png'
        })
    except Exception as e:
        print(f"WARNING: Thumbnail generation failed: {e}", file=sys.stderr)
        return None

def mask_clouds(image):
    # Cloud tops read far colder than the ground (down to -120C), so they must be dropped
    qa = image.select('QA_PIXEL')
    clear = qa.bitwiseAnd(QA_BAD_PIXEL_BITS).eq(0)
    return image.select('ST_B10').updateMask(clear)
    

def check_heat_islands(region_geometry, threshold, recentDays):
    try:
        # 1. Define Time Window
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-recentDays, 'day')

        # 2. Landsat 8 + 9 together (8-day combined revisit). Scene-level CLOUD_COVER is
        #    for the whole 185km scene, so judge cloudiness per pixel over the region instead.
        collection = (ee.ImageCollection(LANDSAT_COLLECTIONS[0])
                      .merge(ee.ImageCollection(LANDSAT_COLLECTIONS[1]))
                      .filterBounds(region_geometry)
                      .filterDate(start_date, end_date)
                      .select(['ST_B10', 'QA_PIXEL']))

        def with_clear_count(image):
            clear = mask_clouds(image)
            clear_pixels = clear.reduceRegion(
                reducer=ee.Reducer.count(), geometry=region_geometry,
                scale=30, bestEffort=True, maxPixels=1e9
            ).get('ST_B10')
            return clear.set('clear_pixels', clear_pixels)

        usable = (collection.map(with_clear_count)
                  .filter(ee.Filter.gt('clear_pixels', 0))
                  .sort('system:time_start', False))

        total_count = collection.size().getInfo()
        count = usable.size().getInfo()
        print(f"UrbanFlow: {total_count} Landsat passes in window, {count} with cloud-free pixels over region.", file=sys.stderr)

        if total_count == 0:
            return {
                "status": "success",
                "message": f"No Landsat pass over this region in the last {recentDays} days.",
                "data_found": False,
                "heatmap_url": None,
                "tile_url": None
            }

        if count == 0:
            return {
                "status": "success",
                "message": f"{total_count} Landsat pass{'es' if total_count != 1 else ''} in the last {recentDays} days, but clouds covered this region every time. Try a longer look-back period.",
                "data_found": True,
                "value_valid": False,
                "heatmap_url": None,
                "tile_url": None
            }

        # 4. Get Metadata (latest pass that actually saw the ground)
        latest_image = usable.first()
        latest_info = latest_image.getInfo()
        latest_id = latest_info['id']
        latest_timestamp = latest_info['properties']['system:time_start']
        date_str = datetime.datetime.fromtimestamp(latest_timestamp / 1000.0, datetime.timezone.utc).strftime('%Y-%m-%d')
        spacecraft = sorted(set(usable.aggregate_array('SPACECRAFT_ID').getInfo()))
        used_sat_name = " + ".join(sc.replace('LANDSAT_', 'Landsat ') for sc in spacecraft)
        
        # 5. Process Temperature (Kelvin -> Celsius) on the median of cloud-free pixels
        temp_celsius = usable.median().multiply(0.00341802).add(149.0).subtract(273.15)

        # 6. Statistics
        stats = temp_celsius.reduceRegion(
            reducer=ee.Reducer.max()
                .combine(reducer2=ee.Reducer.mean(), sharedInputs=True)
                .combine(reducer2=ee.Reducer.min(), sharedInputs=True),
            geometry=region_geometry,
            scale=30, 
            bestEffort=True,
            maxPixels=1e9
        )

        max_temp = stats.get('ST_B10_max').getInfo()
        mean_temp = stats.get('ST_B10_mean').getInfo()
        min_temp = stats.get('ST_B10_min').getInfo()

        if max_temp is None: 
            return {
                "status": "success", 
                "message": "Data exists but pixels masked.", 
                "data_found": True,
                "value_valid": False,
                "tile_url": None
            }
        
        print(f"UrbanFlow Result: Min={min_temp:.2f}, Mean={mean_temp:.2f}, Max={max_temp:.2f}", file=sys.stderr)

        # 7. Alert Logic
        alert_triggered = False
        status_label = "Normal"
        if max_temp > 48.0:
            status_label = "Extreme Heat Danger"
            alert_triggered  = True
        elif max_temp > threshold:
            status_label = "High Heat Warning"
            alert_triggered = True

        # 8. Visualization - ### UPDATED RANGE (-20 to 50) ###
        
        vis_params = {
            'min': -20,  # Coldest Reference
            'max': 50,   # Hottest Reference
            'palette': [
                '0000FF', # -20C (Deep Blue - Freezing)
                '00FFFF', # -2.5C (Cyan - Cold)
                '00FF00', # 15C (Green - Mild)
                'FFFF00', # 32.5C (Yellow - Warm)
                'FF0000'  # 50C (Red - Hot)
            ]
        }
        
        heatmap_url = get_heatmap_url(temp_celsius, region_geometry, vis_params)

        # --- TILE URL FOR INTERACTIVE MAP ---
        try:
            map_id = temp_celsius.getMapId({
                'min': -20, 'max': 50,
                'palette': ['0000FF', '00FFFF', '00FF00', 'FFFF00', 'FF0000']
            })
            tile_url = map_id['tile_fetcher'].url_format
        except Exception as e:
            print(f"WARNING: getMapId failed: {e}", file=sys.stderr)
            tile_url = None

        return {
            "status": "success",
            "data_found": True,
            "value_valid": True,
            "alert_triggered": alert_triggered,
            "heat_status": status_label,
            "max_temp_celsius": round(max_temp, 2),
            "mean_temp_celsius": round(mean_temp, 2),
            "min_temp_celsius": round(min_temp, 2),
            "threshold": threshold,
            "image_date": date_str,
            "satellite_source": used_sat_name,
            "latest_image_id": latest_id,
            "scenes_used": count,
            "heatmap_url": heatmap_url,
            "tile_url": tile_url,
            "dates": {
                "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
            }
        }

    except Exception as e:
        print(f"ERROR: Logic Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e), "tile_url": None}

# --- MAIN EXECUTION BLOCK ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        region_id = params.get('region_id', 'unknown')
        threshold = float(params.get('threshold', DEFAULT_TEMP_THRESHOLD))
        buffer_radius = int(params.get('buffer_meters', DEFAULT_BUFFER))
        recentDays = int(params.get('recentDays', RECENT_PERIOD_DAYS))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Parsing Error: {e}"}))
        sys.exit(1)

    if not initialize_gee(credentials_path):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        g_type = geojson.get('type')
        coords = geojson.get('coordinates')
        if g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        elif g_type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        else: raise ValueError(f"Unknown Geometry: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Heat Check for {region_id}...", file=sys.stderr)
    result = check_heat_islands(ee_geom, threshold, recentDays)
    result['region_id'] = region_id
    print(json.dumps(result))