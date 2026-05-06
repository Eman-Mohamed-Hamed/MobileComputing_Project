from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import math
import re
from urllib.parse import urlparse
import requests
import base64
import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps

try:
    import joblib
    model = joblib.load("qr_guard_rf_model.pkl")
    print("✅ ML Model loaded successfully!")
    MODEL_LOADED = True
except Exception as e:
    print(f"⚠️  ML Model not found ({e}). VirusTotal scanning will still work.")
    MODEL_LOADED = False
    model = None

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY", "qrguard-super-secret-key-change-in-prod-2024")
DATABASE   = os.environ.get("DATABASE", "qrguard.db")
VT_API_KEY = os.environ.get("VT_API_KEY", "")   # Put your VirusTotal API key here


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    UNIQUE NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login    TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            url         TEXT    NOT NULL,
            scan_method TEXT    NOT NULL,
            verdict     TEXT    NOT NULL,
            confidence  REAL,
            scanned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database initialised.")

init_db()


def generate_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return jsonify({"error": "Authorization token missing"}), 401
        token = auth_header[7:] if auth_header.startswith("Bearer ") else auth_header
        try:
            data    = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = data["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired – please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(user_id, *args, **kwargs)
    return decorated


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if not re.match(r"^[A-Za-z0-9_]+$", username):
        return jsonify({"error": "Username: letters, numbers and underscores only"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Please enter a valid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        conn = get_db()
        c    = conn.cursor()
        c.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash)
        )
        user_id = c.lastrowid
        conn.commit()
        conn.close()
    except sqlite3.IntegrityError as e:
        conn.close()
        if "username" in str(e):
            return jsonify({"error": "Username already taken"}), 409
        if "email" in str(e):
            return jsonify({"error": "Email already registered"}), 409
        return jsonify({"error": "Registration failed"}), 409

    token = generate_token(user_id)
    return jsonify({
        "message": "Account created successfully!",
        "token":   token,
        "user":    {"id": user_id, "username": username, "email": email}
    }), 201


@app.route("/auth/login", methods=["POST"])
def login():
    data       = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    password   = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Please enter your username/email and password"}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT * FROM users WHERE email = ? OR username = ?",
        (identifier.lower(), identifier)
    )
    user = c.fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        conn.close()
        return jsonify({"error": "Invalid credentials"}), 401

    c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    token = generate_token(user["id"])
    return jsonify({
        "message": "Welcome back!",
        "token":   token,
        "user":    {"id": user["id"], "username": user["username"], "email": user["email"]}
    })


@app.route("/auth/me", methods=["GET"])
@token_required
def get_me(user_id):
    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT id, username, email, created_at, last_login FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(dict(user))


def calculate_entropy(text):
    if not text:
        return 0
    entropy = 0
    for x in set(text):
        p_x = float(text.count(x)) / len(text)
        entropy += -p_x * math.log(p_x, 2)
    return entropy

def get_advanced_url_features(url):
    url = str(url).lower()
    url_to_parse = url if url.startswith("http") else "http://" + url
    try:
        parsed   = urlparse(url_to_parse)
        hostname = parsed.hostname or ""
        path     = parsed.path or ""
    except ValueError:
        try:
            parsed   = urlparse(url_to_parse.replace("[","").replace("]",""))
            hostname = parsed.hostname or ""
            path     = parsed.path or ""
        except:
            hostname = ""; path = url

    sus_words = ["login","verify","update","secure","account","banking","paypal",
                 "cmd","webscr","admin","free","bonus","claim","support","service","recover","wallet"]
    num_digits  = sum(c.isdigit() for c in url)
    num_letters = sum(c.isalpha() for c in url)

    return {
        "url_length": len(url), "hostname_length": len(hostname), "path_length": len(path),
        "num_dots": url.count("."), "num_hyphens": url.count("-"),
        "num_underscores": url.count("_"), "num_slashes": url.count("/"),
        "num_question_marks": url.count("?"), "num_equals": url.count("="),
        "num_at": url.count("@"), "num_ampersands": url.count("&"),
        "num_digits": num_digits, "num_letters": num_letters,
        "digit_letter_ratio": num_digits / num_letters if num_letters > 0 else 0,
        "url_entropy": calculate_entropy(url),
        "num_sus_words": sum(1 for w in sus_words if w in url),
        "has_ip_address": 1 if re.search(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", hostname) else 0,
        "has_https": 1 if url.startswith("https://") else 0,
        "has_shortener": 1 if any(s in hostname for s in ["bit.ly","goo.gl","t.co","tinyurl"]) else 0,
        "directory_depth": path.count("/")
    }

def check_virustotal(url):
    if not VT_API_KEY:
        return {"scanned": False, "error": "VirusTotal API key not configured on server"}
    try:
        url_id   = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        response = requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers={"accept": "application/json", "x-apikey": VT_API_KEY},
            timeout=15
        )
        if response.status_code == 200:
            stats = response.json()["data"]["attributes"]["last_analysis_stats"]
            mal = stats.get("malicious", 0); sus = stats.get("suspicious", 0)
            return {
                "scanned": True, "malicious_votes": mal, "suspicious_votes": sus,
                "harmless_votes": stats.get("harmless", 0),
                "undetected_votes": stats.get("undetected", 0),
                "timeout_votes": stats.get("timeout", 0),
                "total_engines": sum(stats.values()),
                "is_flagged": (mal + sus) > 0, "stats": stats
            }
        elif response.status_code == 404:
            return {"scanned": False, "error": "URL not found in VirusTotal database"}
        return {"scanned": False, "error": f"VirusTotal API error (status {response.status_code})"}
    except requests.exceptions.Timeout:
        return {"scanned": False, "error": "VirusTotal request timed out"}
    except Exception as e:
        return {"scanned": False, "error": str(e)}

def save_scan(user_id, url, method, verdict, confidence=None):
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("INSERT INTO scan_history (user_id, url, scan_method, verdict, confidence) VALUES (?,?,?,?,?)",
                  (user_id, url, method, verdict, confidence))
        conn.commit(); conn.close()
    except: pass


@app.route("/scan/virustotal", methods=["POST"])
@token_required
def scan_virustotal(user_id):
    data = request.get_json() or {}
    url  = data.get("url")
    if not url: return jsonify({"error": "No URL provided"}), 400
    result = check_virustotal(url)
    save_scan(user_id, url, "virustotal", "malicious" if result.get("is_flagged") else "safe")
    return jsonify({"url": url, "method": "virustotal", **result})


@app.route("/scan/ml", methods=["POST"])
@token_required
def scan_ml(user_id):
    if not MODEL_LOADED:
        return jsonify({"error": "ML model not loaded. Ensure qr_guard_rf_model.pkl exists."}), 503
    data = request.get_json() or {}
    url  = data.get("url")
    if not url: return jsonify({"error": "No URL provided"}), 400

    fd   = get_advanced_url_features(url)
    pred = model.predict(pd.DataFrame([fd]))[0]
    prob = model.predict_proba(pd.DataFrame([fd]))[0]
    is_mal = bool(pred == 1)
    conf   = float(prob[pred] * 100)

    save_scan(user_id, url, "ml", "malicious" if is_mal else "safe", conf)
    return jsonify({
        "url": url, "method": "ml", "is_malicious": is_mal,
        "confidence": round(conf, 2), "prediction": int(pred),
        "features": {
            "url_length": fd["url_length"], "hostname_length": fd["hostname_length"],
            "path_length": fd["path_length"], "url_entropy": round(fd["url_entropy"], 2),
            "num_sus_words": fd["num_sus_words"], "has_ip_address": bool(fd["has_ip_address"]),
            "has_https": bool(fd["has_https"]), "has_shortener": bool(fd["has_shortener"]),
            "directory_depth": fd["directory_depth"], "digit_letter_ratio": round(fd["digit_letter_ratio"], 4),
            "num_dots": fd["num_dots"], "num_hyphens": fd["num_hyphens"],
        }
    })


@app.route("/scan/both", methods=["POST"])
@token_required
def scan_both(user_id):
    data = request.get_json() or {}
    url  = data.get("url")
    if not url: return jsonify({"error": "No URL provided"}), 400

    ai_engine = {"available": False}
    if MODEL_LOADED:
        fd   = get_advanced_url_features(url)
        pred = model.predict(pd.DataFrame([fd]))[0]
        prob = model.predict_proba(pd.DataFrame([fd]))[0]
        ai_engine = {
            "available": True, "is_malicious": bool(pred == 1),
            "confidence": round(float(prob[pred] * 100), 2),
            "features": {"url_entropy": round(fd["url_entropy"], 2), "num_sus_words": fd["num_sus_words"],
                         "has_ip_address": bool(fd["has_ip_address"]), "has_https": bool(fd["has_https"]),
                         "has_shortener": bool(fd["has_shortener"])}
        }

    vt  = check_virustotal(url)
    verdict = "Danger" if (ai_engine.get("is_malicious") or vt.get("is_flagged")) else "Safe"
    save_scan(user_id, url, "both", verdict.lower())
    return jsonify({"url": url, "method": "both", "final_status": verdict,
                    "ai_engine": ai_engine, "virustotal_engine": vt})


@app.route("/scan/history", methods=["GET"])
@token_required
def get_scan_history(user_id):
    conn = get_db(); c = conn.cursor()
    c.execute("SELECT * FROM scan_history WHERE user_id=? ORDER BY scanned_at DESC LIMIT 50", (user_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify({"history": rows})


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "model_loaded": MODEL_LOADED,
                    "vt_key_set": bool(VT_API_KEY), "message": "QR Guard API is running!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
