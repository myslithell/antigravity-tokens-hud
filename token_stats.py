#!/usr/bin/env python3
"""
Antigravity Tokens & Quota Extractor
Extracts exact token statistics per conversation directly from local SQLite databases.
"""

import os
import sys
import glob
import time
import json
import sqlite3
import argparse
from datetime import datetime, timezone

CONVERSATIONS_DIR = os.path.expanduser("~/.gemini/antigravity/conversations")

def decode_varint(data, offset):
    res = 0
    shift = 0
    while True:
        if offset >= len(data):
            break
        b = data[offset]
        offset += 1
        res |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    return res, offset

def parse_proto(data, offset=0, end=None):
    if end is None:
        end = len(data)
    fields = []
    while offset < end:
        tag, offset = decode_varint(data, offset)
        field_num = tag >> 3
        wire_type = tag & 7
        if wire_type == 0:
            val, offset = decode_varint(data, offset)
            fields.append((field_num, "varint", val))
        elif wire_type == 2:
            length, offset = decode_varint(data, offset)
            val = data[offset:offset+length]
            offset += length
            fields.append((field_num, "bytes", val))
        elif wire_type == 1:
            val = data[offset:offset+8]
            offset += 8
            fields.append((field_num, "fixed64", val))
        elif wire_type == 5:
            val = data[offset:offset+4]
            offset += 4
            fields.append((field_num, "fixed32", val))
        else:
            break
    return fields

def collect_metrics(current_conv_id=None):
    now_ts = int(time.time())
    db_files = glob.glob(os.path.join(CONVERSATIONS_DIR, "*.db"))
    db_files.sort(key=os.path.getmtime, reverse=True)
    
    if not current_conv_id and db_files:
        current_conv_id = os.path.basename(db_files[0]).replace(".db", "")

    all_records = []
    current_session = None
    latest_ts = 0
    cutoff_ts = now_ts - (8 * 86400)

    for db_path in db_files:
        sess_id = os.path.basename(db_path).replace(".db", "")
        if sess_id != current_conv_id:
            try:
                if os.path.getmtime(db_path) < cutoff_ts:
                    continue
            except OSError:
                pass
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.0)
            c = conn.cursor()
            
            step_times = {}
            try:
                c.execute("SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL")
                for idx, meta in c.fetchall():
                    for fn, wt, val in parse_proto(meta):
                        if fn == 1:
                            for sfn, swt, sval in parse_proto(val):
                                if sfn == 1:
                                    step_times[idx] = sval
            except Exception:
                pass
            
            try:
                c.execute("SELECT idx, data FROM gen_metadata ORDER BY idx ASC")
                for idx, data in c.fetchall():
                    ts = step_times.get(idx, 0)
                    if ts > latest_ts:
                        latest_ts = ts
                    proto = parse_proto(data)
                    for fn, wt, val in proto:
                        if fn == 1:
                            for sfn, swt, sval in parse_proto(val):
                                if sfn == 17:
                                    for tfn, twt, tval in parse_proto(sval):
                                        if twt == "bytes":
                                            sub = parse_proto(tval)
                                            d = {k: v for k, t, v in sub if t == "varint"}
                                            if d and (d.get(2, 0) > 0 or d.get(5, 0) > 0 or d.get(3, 0) > 0):
                                                rec = {
                                                    "session_id": sess_id,
                                                    "idx": idx,
                                                    "timestamp": ts,
                                                    "prompt_tokens": d.get(2, 0),
                                                    "output_tokens": d.get(3, 0),
                                                    "cached_tokens": d.get(5, 0),
                                                    "thinking_tokens": d.get(9, 0),
                                                    "text_tokens": d.get(10, 0),
                                                    "context_size": d.get(5, 0) + d.get(2, 0)
                                                }
                                                all_records.append(rec)
                                                if sess_id == current_conv_id:
                                                    current_session = rec
            except Exception:
                pass
            conn.close()
        except Exception:
            pass

    ref_ts = latest_ts if latest_ts > 0 else now_ts
    h5_ts = ref_ts - (5 * 3600)
    w1_ts = ref_ts - (7 * 86400)

    h5_records = [r for r in all_records if r["timestamp"] >= h5_ts]
    w1_records = [r for r in all_records if r["timestamp"] >= w1_ts]

    max_context = 1000000
    sessions_map = {}
    for r in all_records:
        sid = r["session_id"]
        ctx = r["context_size"]
        sessions_map[sid] = {
            "session_id": sid,
            "context_size": ctx,
            "max_context": max_context,
            "context_percent": round((ctx / max_context) * 100, 2),
            "cached_tokens": r["cached_tokens"],
            "prompt_tokens": r["prompt_tokens"],
            "output_tokens": r["output_tokens"],
            "thinking_tokens": r["thinking_tokens"],
            "text_tokens": r["text_tokens"],
        }

    current_session = sessions_map.get(current_conv_id)
    current_context = current_session["context_size"] if current_session else 0
    current_cached = current_session["cached_tokens"] if current_session else 0
    current_prompt = current_session["prompt_tokens"] if current_session else 0
    current_output = current_session["output_tokens"] if current_session else 0
    current_thinking = current_session["thinking_tokens"] if current_session else 0
    current_text = current_session["text_tokens"] if current_session else 0

    return {
        "current_session": {
            "session_id": current_conv_id,
            "context_size": current_context,
            "max_context": max_context,
            "context_percent": round((current_context / max_context) * 100, 2),
            "cached_tokens": current_cached,
            "prompt_tokens": current_prompt,
            "output_tokens": current_output,
            "thinking_tokens": current_thinking,
            "text_tokens": current_text,
        },
        "sessions": sessions_map,
        "usage_5h": {
            "window_hours": 5,
            "total_requests": len(h5_records),
            "input_tokens": sum(r["prompt_tokens"] for r in h5_records),
            "output_tokens": sum(r["output_tokens"] for r in h5_records),
            "thinking_tokens": sum(r["thinking_tokens"] for r in h5_records),
            "total_tokens": sum(r["prompt_tokens"] + r["output_tokens"] for r in h5_records),
        },
        "usage_weekly": {
            "window_days": 7,
            "total_requests": len(w1_records),
            "input_tokens": sum(r["prompt_tokens"] for r in w1_records),
            "output_tokens": sum(r["output_tokens"] for r in w1_records),
            "thinking_tokens": sum(r["thinking_tokens"] for r in w1_records),
            "total_tokens": sum(r["prompt_tokens"] + r["output_tokens"] for r in w1_records),
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Antigravity Tokens Extractor")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--session", type=str, default=None, help="Specific session ID")
    args = parser.parse_args()

    metrics = collect_metrics(args.session)
    if args.json:
        print(json.dumps(metrics, indent=2))
    else:
        print(json.dumps(metrics))
