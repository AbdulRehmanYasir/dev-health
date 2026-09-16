import os
import subprocess
import sqlite3

def run_backup(folder):
    # CRITICAL: shell injection
    subprocess.Popen("tar -czf backup.tar.gz " + folder, shell=True)

def find_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # CRITICAL: SQL concatenation
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()

def execute_debug(code):
    # CRITICAL: unsafe eval
    return eval(code)
