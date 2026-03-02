from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import math
import re
from urllib.parse import urlparse
import requests
import base64

app = Flask(__name__)
CORS(app)

# Load the trained Random Forest model
print("🔄 Loading QR Guard ML Model...")
model = joblib.load("qr_guard_rf_model.pkl")
print("✅ Model loaded successfully!")

# VirusTotal API key
VT_API_KEY = ""      #  حط ال API key هنا   


# ============================================
# FEATURE EXTRACTION FUNCTIONS
# ============================================

def calculate_entropy(text):
    """Calculates Shannon Entropy to detect randomly generated strings."""
    if not text:
        return 0
    entropy = 0
    for x in set(text):
        p_x = float(text.count(x)) / len(text)
        entropy += -p_x * math.log(p_x, 2)
    return entropy


def get_advanced_url_features(url):
    """Extracts 20 features from a URL for ML prediction."""
    url = str(url).lower()
    if not url.startswith('http'):
        url_to_parse = 'http://' + url
    else:
        url_to_parse = url

    # Bulletproof URL parsing
    try:
        parsed = urlparse(url_to_parse)
        hostname = parsed.hostname if parsed.hostname else ""
        path = parsed.path if parsed.path else ""
    except ValueError:
        url_to_parse_clean = url_to_parse.replace('[', '').replace(']', '')
        try:
            parsed = urlparse(url_to_parse_clean)
            hostname = parsed.hostname if parsed.hostname else ""
            path = parsed.path if parsed.path else ""
        except ValueError:
            hostname = ""
            path = url

    # Expanded suspicious keywords
    sus_words = [
        'login', 'verify', 'update', 'secure', 'account', 'banking',
        'paypal', 'cmd', 'webscr', 'admin', 'free', 'bonus', 'claim',
        'support', 'service', 'recover', 'wallet'
    ]

    # 1. Length Features
    url_len = len(url)
    host_len = len(hostname)
    path_len = len(path)

    # 2. Character Counts
    num_dots = url.count('.')
    num_hyphens = url.count('-')
    num_underscores = url.count('_')
    num_slashes = url.count('/')
    num_question_marks = url.count('?')
    num_equals = url.count('=')
    num_at = url.count('@')
    num_ampersands = url.count('&')

    # 3. Alphanumeric Properties
    num_digits = sum(c.isdigit() for c in url)
    num_letters = sum(c.isalpha() for c in url)

    # 4. Ratios & Math
    digit_letter_ratio = num_digits / num_letters if num_letters > 0 else 0
    url_entropy = calculate_entropy(url)

    # 5. Logical/Keyword Features
    num_sus_words = sum(1 for word in sus_words if word in url)
    has_ip_address = 1 if re.search(
        r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', hostname
    ) else 0
    has_https = 1 if url.startswith('https://') else 0
    has_shortener = 1 if any(
        short in hostname for short in ['bit.ly', 'goo.gl', 't.co', 'tinyurl']
    ) else 0
    directory_depth = path.count('/')

    return {
        'url_length': url_len,
        'hostname_length': host_len,
        'path_length': path_len,
        'num_dots': num_dots,
        'num_hyphens': num_hyphens,
        'num_underscores': num_underscores,
        'num_slashes': num_slashes,
        'num_question_marks': num_question_marks,
        'num_equals': num_equals,
        'num_at': num_at,
        'num_ampersands': num_ampersands,
        'num_digits': num_digits,
        'num_letters': num_letters,
        'digit_letter_ratio': digit_letter_ratio,
        'url_entropy': url_entropy,
        'num_sus_words': num_sus_words,
        'has_ip_address': has_ip_address,
        'has_https': has_https,
        'has_shortener': has_shortener,
        'directory_depth': directory_depth
    }


# ============================================
# VIRUSTOTAL API FUNCTION
# ============================================

def check_virustotal(url):
    """Checks the URL against VirusTotal's database using a single GET request."""
    try:
        # VirusTotal v3 requires the URL to be base64url encoded
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")

        headers = {
            "accept": "application/json",
            "x-apikey": VT_API_KEY
        }

        response = requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers=headers,
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            stats = data['data']['attributes']['last_analysis_stats']
            malicious_votes = stats.get('malicious', 0)
            suspicious_votes = stats.get('suspicious', 0)
            harmless_votes = stats.get('harmless', 0)
            undetected_votes = stats.get('undetected', 0)
            timeout_votes = stats.get('timeout', 0)
            total_votes = sum(stats.values())

            return {
                "scanned": True,
                "malicious_votes": malicious_votes,
                "suspicious_votes": suspicious_votes,
                "harmless_votes": harmless_votes,
                "undetected_votes": undetected_votes,
                "timeout_votes": timeout_votes,
                "total_engines": total_votes,
                "is_flagged": (malicious_votes + suspicious_votes) > 0,
                "stats": stats
            }
        elif response.status_code == 404:
            return {
                "scanned": False,
                "error": "URL not found in VirusTotal database. It may not have been scanned before."
            }
        else:
            return {
                "scanned": False,
                "error": f"VirusTotal API error (status {response.status_code})"
            }

    except requests.exceptions.Timeout:
        return {"scanned": False, "error": "VirusTotal API request timed out"}
    except Exception as e:
        return {"scanned": False, "error": str(e)}


# ============================================
# API ENDPOINTS
# ============================================

@app.route('/scan/virustotal', methods=['POST'])
def scan_virustotal():
    """Scan a URL using VirusTotal API only."""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'No URL provided'}), 400

    target_url = data['url']
    vt_results = check_virustotal(target_url)

    return jsonify({
        'url': target_url,
        'method': 'virustotal',
        **vt_results
    })


@app.route('/scan/ml', methods=['POST'])
def scan_ml():
    """Scan a URL using the ML model only."""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'No URL provided'}), 400

    target_url = data['url']

    # Extract features
    features_dict = get_advanced_url_features(target_url)
    features_df = pd.DataFrame([features_dict])

    # Predict
    prediction = model.predict(features_df)[0]
    probabilities = model.predict_proba(features_df)[0]

    is_malicious = bool(prediction == 1)
    confidence = float(probabilities[prediction] * 100)

    return jsonify({
        'url': target_url,
        'method': 'ml',
        'is_malicious': is_malicious,
        'confidence': round(confidence, 2),
        'prediction': int(prediction),
        'features': {
            'url_length': features_dict['url_length'],
            'hostname_length': features_dict['hostname_length'],
            'path_length': features_dict['path_length'],
            'url_entropy': round(features_dict['url_entropy'], 2),
            'num_sus_words': features_dict['num_sus_words'],
            'has_ip_address': bool(features_dict['has_ip_address']),
            'has_https': bool(features_dict['has_https']),
            'has_shortener': bool(features_dict['has_shortener']),
            'directory_depth': features_dict['directory_depth'],
            'digit_letter_ratio': round(features_dict['digit_letter_ratio'], 4),
            'num_dots': features_dict['num_dots'],
            'num_hyphens': features_dict['num_hyphens'],
        }
    })


@app.route('/scan/both', methods=['POST'])
def scan_both():
    """Scan a URL using both VirusTotal and ML model."""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'No URL provided'}), 400

    target_url = data['url']

    # Layer 1: ML Model
    features_dict = get_advanced_url_features(target_url)
    features_df = pd.DataFrame([features_dict])
    prediction = model.predict(features_df)[0]
    probabilities = model.predict_proba(features_df)[0]
    ai_is_malicious = bool(prediction == 1)
    ai_confidence = float(probabilities[prediction] * 100)

    # Layer 2: VirusTotal API
    vt_results = check_virustotal(target_url)

    # Combined verdict
    final_status = "Safe"
    if ai_is_malicious or vt_results.get('is_flagged', False):
        final_status = "Danger"

    return jsonify({
        'url': target_url,
        'method': 'both',
        'final_status': final_status,
        'ai_engine': {
            'is_malicious': ai_is_malicious,
            'confidence': round(ai_confidence, 2),
            'prediction': int(prediction),
            'features': {
                'url_length': features_dict['url_length'],
                'url_entropy': round(features_dict['url_entropy'], 2),
                'num_sus_words': features_dict['num_sus_words'],
                'has_ip_address': bool(features_dict['has_ip_address']),
                'has_https': bool(features_dict['has_https']),
                'has_shortener': bool(features_dict['has_shortener']),
            }
        },
        'virustotal_engine': vt_results
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'message': 'QR Guard API is running!'
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
