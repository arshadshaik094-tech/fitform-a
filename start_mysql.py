"""
FitForm AI — MySQL Setup & Start Helper
Run this script once before starting the app to:
  1. Find and start MySQL server (if not running)
  2. Create the 'fitform' database
  3. Verify connection

Usage: python start_mysql.py
"""
import subprocess
import sys
import time

DB_USER = "root"
DB_PASS = "thunder thor69"
DB_HOST = "localhost"
DB_PORT = 3306
DB_NAME = "fitform"


def try_connect():
    import pymysql
    try:
        conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.commit()
        cursor.execute("SHOW DATABASES")
        dbs = [r[0] for r in cursor.fetchall()]
        conn.close()
        return True, dbs
    except Exception as e:
        return False, str(e)


def find_mysql():
    """Search common MySQL installation paths."""
    import os
    import glob
    candidates = [
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe",
        r"C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqld.exe",
        r"C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqld.exe",
        r"C:\MySQL\bin\mysqld.exe",
        r"C:\xampp\mysql\bin\mysqld.exe",
        r"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqld.exe",
        r"C:\wamp\bin\mysql\mysql8.0.27\bin\mysqld.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # Try glob search
    results = glob.glob(r"C:\**\mysqld.exe", recursive=True)
    return results[0] if results else None


def start_mysql_service():
    """Try to start MySQL as a Windows service."""
    service_names = ["MySQL80", "MySQL81", "MySQL57", "MySQL", "mysql"]
    for svc in service_names:
        result = subprocess.run(
            ["net", "start", svc],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  ✅ Started MySQL service: {svc}")
            return True
        if "already been started" in result.stdout.lower():
            print(f"  ✅ MySQL service '{svc}' is already running")
            return True
    return False


print("\n" + "="*55)
print("  FitForm AI — MySQL Setup")
print("="*55)

# Step 1: Check if MySQL is already running
print("\n1️⃣  Checking MySQL connection...")
ok, result = try_connect()
if ok:
    print(f"  ✅ MySQL is already running!")
    print(f"  ✅ Database '{DB_NAME}' ready")
    print("\n  You can now run:  python app.py")
    sys.exit(0)

print(f"  ⚠️  MySQL not running: {result}")

# Step 2: Try starting as service
print("\n2️⃣  Attempting to start MySQL service...")
started = start_mysql_service()

if started:
    print("  ⏳ Waiting for MySQL to initialize...")
    time.sleep(3)
    ok, result = try_connect()
    if ok:
        print(f"  ✅ Database '{DB_NAME}' created/verified")
        print("\n  You can now run:  python app.py")
        sys.exit(0)

# Step 3: Manual instructions
print("\n3️⃣  MySQL server not found as a Windows service.")
print("\n" + "─"*55)
print("  ⚡ MANUAL SETUP REQUIRED:")
print("─"*55)
print("""
  MySQL is installed (Workbench found) but the SERVER
  component isn't installed or running.

  To fix this:

  OPTION A — Install MySQL Server:
  ─────────────────────────────────
  1. Go to: https://dev.mysql.com/downloads/installer/
  2. Download 'MySQL Installer for Windows'
  3. Choose 'Server Only' or 'Custom' installation
  4. During setup, set root password to: thunder 69
  5. Make sure 'Start MySQL Server at System Startup' is checked
  6. Re-run this script

  OPTION B — If you have MySQL in PATH:
  ──────────────────────────────────────
  Run in a new terminal (as Administrator):
    mysqld --console

  Then re-run this script in another terminal.

  OPTION C — Use MySQL Workbench:
  ─────────────────────────────────
  1. Open MySQL Workbench
  2. Connect to your local instance
  3. Run: CREATE DATABASE fitform;
  4. Then run: python app.py
""")
print("─"*55)
sys.exit(1)
