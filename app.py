from flask import Flask, render_template, jsonify, request
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
import html
import re

app = Flask(__name__)

# Simple in-memory cache
news_cache = {
    "data": None,
    "last_fetched": None
}

def fetch_amd_releases():
    url = "https://gpuopen.com/feed.xml"
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    items = []
    
    # Namespaces
    ns = {
        'media': 'http://search.yahoo.com/mrss/',
        'content': 'http://purl.org/rss/1.0/modules/content/',
        'atom': 'http://www.w3.org/2005/Atom'
    }
    
    for item in root.findall('.//item'):
        title = item.find('title').text if item.find('title') is not None else "Untitled Update"
        link = item.find('link').text if item.find('link') is not None else "#"
        description = item.find('description').text if item.find('description') is not None else ""
        pub_date_str = item.find('pubDate').text if item.find('pubDate') is not None else ""
        guid = item.find('guid').text if item.find('guid') is not None else link
        
        # Categories
        categories = [cat.text for cat in item.findall('category') if cat.text]
        
        # Find image
        image_url = ""
        media_content = item.find('media:content', ns)
        if media_content is not None and 'url' in media_content.attrib:
            image_url = media_content.attrib['url']
        else:
            enclosure = item.find('enclosure')
            if enclosure is not None and 'url' in enclosure.attrib:
                image_url = enclosure.attrib['url']
        
        # Parse date to a nice display format
        formatted_date = pub_date_str
        try:
            # Typical format: Thu, 11 Jun 2026 16:26:00 GMT
            date_clean = pub_date_str.replace(" GMT", "").replace(" UTC", "")
            dt = datetime.strptime(date_clean, "%a, %d %b %Y %H:%M:%S")
            formatted_date = dt.strftime("%b %d, %Y")
        except Exception:
            pass
            
        items.append({
            'guid': guid,
            'title': title,
            'link': link,
            'description': description,
            'pubDate': formatted_date,
            'rawDate': pub_date_str,
            'image': image_url,
            'categories': categories
        })
        
    return items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/news')
def get_news():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Check cache
    if not force_refresh and news_cache["data"] is not None:
        # Check if cache is older than 10 minutes
        age = (datetime.now() - news_cache["last_fetched"]).total_seconds()
        if age < 600:
            return jsonify({
                "status": "success",
                "source": "cache",
                "data": news_cache["data"]
            })
            
    try:
        data = fetch_amd_releases()
        news_cache["data"] = data
        news_cache["last_fetched"] = datetime.now()
        return jsonify({
            "status": "success",
            "source": "live",
            "data": data
        })
    except Exception as e:
        # Fallback to cache if request fails
        if news_cache["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "error": str(e),
                "data": news_cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Running locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
