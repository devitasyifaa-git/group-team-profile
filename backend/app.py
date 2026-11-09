
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import json
import os


# ==========================================
# KONFIGURASI PENYIMPANAN DATA
# ==========================================

DATA_FILE = Path(
    os.getenv(
        "DATA_FILE",
        "/var/lib/backend_data/team_members.json"
    )
)


# ==========================================
# FUNGSI MEMBACA DATA ANGGOTA
# ==========================================

def read_members():

    if not DATA_FILE.exists():
        return []

    try:
        data = json.loads(
            DATA_FILE.read_text(encoding="utf-8")
        )

        return data if isinstance(data, list) else []

    except (json.JSONDecodeError, OSError):
        return []


# ==========================================
# FUNGSI MENYIMPAN DATA ANGGOTA
# ==========================================

def write_members(members):

    DATA_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    DATA_FILE.write_text(
        json.dumps(
            members,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )


# ==========================================
# HANDLER REST API
# ==========================================

class APIHandler(BaseHTTPRequestHandler):

    def send_json(self, status, payload):

        body = json.dumps(
            payload,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, DELETE, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.end_headers()
        self.wfile.write(body)

    # ======================================
    # OPTIONS
    # ======================================

    def do_OPTIONS(self):

        self.send_json(
            200,
            {"status": "ok"}
        )

    # ======================================
    # GET: MENAMPILKAN DATA
    # ======================================

    def do_GET(self):

        parsed = urlparse(self.path)

        if parsed.path in ("/", "/health"):

            return self.send_json(
                200,
                {
                    "status": "active",
                    "service": "Group Team Profile API"
                }
            )

        if parsed.path == "/members":

            members = read_members()

            return self.send_json(
                200,
                {
                    "members": members,
                    "total": len(members)
                }
            )

        return self.send_json(
            404,
            {"error": "Endpoint not found"}
        )

    # ======================================
    # POST: MENAMBAHKAN ANGGOTA
    # ======================================

    def do_POST(self):

        parsed = urlparse(self.path)

        if parsed.path != "/members":

            return self.send_json(
                404,
                {"error": "Endpoint not found"}
            )

        try:

            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length <= 0:
                return self.send_json(
                    400,
                    {"error": "Request body is required"}
                )

            payload = json.loads(
                self.rfile.read(length).decode("utf-8")
            )

            if not isinstance(payload, dict):

                return self.send_json(
                    400,
                    {"error": "JSON body must be an object"}
                )

            name = str(
                payload.get("name", "")
            ).strip()

            nim = str(
                payload.get("nim", "")
            ).strip()

            role = str(
                payload.get("role", "")
            ).strip()

            bio = str(
                payload.get("bio", "")
            ).strip()

            skills = payload.get("skills", [])

            if not name or not nim or not role:

                return self.send_json(
                    400,
                    {
                        "error": "Name, NIM, and role are required"
                    }
                )

            if isinstance(skills, str):

                skills = [
                    skill.strip()
                    for skill in skills.split(",")
                    if skill.strip()
                ]

            if not isinstance(skills, list) or not all(
                isinstance(skill, str) and skill.strip()
                for skill in skills
            ):

                return self.send_json(
                    400,
                    {
                        "error": "Skills must be a list of non-empty strings"
                    }
                )

            member = {
                "name": name,
                "nim": nim,
                "role": role,
                "bio": bio,
                "skills": [
                    skill.strip() for skill in skills
                ],
                "created_at": datetime.now(
                    timezone.utc
                ).isoformat()
            }

            members = read_members()

            members.append(member)

            write_members(members)

            return self.send_json(
                201,
                {
                    "status": "created",
                    "member": member,
                    "total": len(members)
                }
            )

        except (ValueError, json.JSONDecodeError):

            return self.send_json(
                400,
                {"error": "Invalid JSON request body"}
            )

    # ======================================
    # DELETE: MENGHAPUS ANGGOTA
    # ======================================

    def do_DELETE(self):

        parsed = urlparse(self.path)

        if parsed.path != "/members":

            return self.send_json(
                404,
                {"error": "Endpoint not found"}
            )

        query = parse_qs(parsed.query)

        if "index" not in query:

            return self.send_json(
                400,
                {"error": "Missing index parameter"}
            )

        try:

            index = int(query["index"][0])

            members = read_members()

            if index < 0 or index >= len(members):

                return self.send_json(
                    404,
                    {"error": "Member not found"}
                )

            removed = members.pop(index)

            write_members(members)

            return self.send_json(
                200,
                {
                    "status": "deleted",
                    "removed": removed,
                    "total": len(members)
                }
            )

        except (ValueError, IndexError):

            return self.send_json(
                400,
                {"error": "Index must be an integer"}
            )

    # ======================================
    # LOG AKTIVITAS SERVER
    # ======================================

    def log_message(self, fmt, *args):

        print(
            f"[{self.log_date_time_string()}] {fmt % args}",
            flush=True
        )


# ==========================================
# MENJALANKAN SERVER
# ==========================================

if __name__ == "__main__":

    print(
        "Group Team Profile API listening on 0.0.0.0:5000",
        flush=True
    )

    server = ThreadingHTTPServer(
        ("0.0.0.0", 5000),
        APIHandler
    )

    server.serve_forever()
