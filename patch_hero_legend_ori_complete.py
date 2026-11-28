#!/usr/bin/env python3
"""
Complete Endpoint Patcher & OTA Resource Synchronizer for HERO LEGEND ORI.apk
Target Domain: nh.digislams.my.id (HTTPS + WS Port 80 via LiteSpeed Reverse Proxy)
"""
import os
import re
import glob
import json
import shutil
import zipfile
import hashlib
import subprocess

PROJ_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_APK = os.path.join(PROJ_DIR, "HERO LEGEND ORI.apk")
OUT_PUBLIC_APK = os.path.join(PROJ_DIR, "public", "download", "OkkaNHNE-Private.apk")
OUT_ROOT_APK = os.path.join(PROJ_DIR, "OkkaNHNE-Private.apk")

EMU_OTA_DIR = os.path.join(PROJ_DIR, "public", "gamedata_emu", "nh-ota")
EMU_REL_DIR = os.path.join(EMU_OTA_DIR, "releases", "1.0.0")

TARGET_DOMAIN = "nh.digislams.my.id"
TARGET_HTTP = f"https://{TARGET_DOMAIN}"
TARGET_WS_PORT = 80
MANIFEST_VERSION = 207

SCRATCH_TOOLS = r"C:\Users\Administrator\.gemini\antigravity\brain\16458abb-41b1-4481-81c9-0bf769ffb882\scratch"
BAKSMALI_JAR = os.path.join(SCRATCH_TOOLS, "baksmali.jar")
SMALI_JAR = os.path.join(SCRATCH_TOOLS, "smali.jar")

WORK_DIR = r"C:\Users\Administrator\.gemini\antigravity\brain\b1957059-17ac-4ca4-ab6f-ddf9bc17a482\scratch\apk_build_work"


def patch_adapter_js_text(js_text: str, add_openurl_hook: bool = True) -> str:
    # 1. Replace __NH_BACKEND_CONFIG
    new_cfg = json.dumps({
        "http": TARGET_HTTP,
        "gameHost": TARGET_DOMAIN,
        "wsPort": TARGET_WS_PORT,
        "version": "1.1.3"
    })
    js_text, n_cfg = re.subn(
        r'var\s+__NH_BACKEND_CONFIG\s*=\s*\{[^;\n]+\};',
        f'var __NH_BACKEND_CONFIG={new_cfg};',
        js_text
    )
    assert n_cfg >= 1, "Failed to find __NH_BACKEND_CONFIG in adapter JS!"

    # 2. Replace REGISTER_URL, FORGOT_URL, DISCORD_URL
    js_text = re.sub(
        r"REGISTER_URL\s*=\s*'[^']*'",
        f"REGISTER_URL = '{TARGET_HTTP}/register'",
        js_text
    )
    js_text = re.sub(
        r"FORGOT_URL\s*=\s*'[^']*'",
        f"FORGOT_URL = '{TARGET_HTTP}/login'",
        js_text
    )
    js_text = re.sub(
        r"DISCORD_URL\s*=\s*'[^']*'",
        f"DISCORD_URL = '{TARGET_HTTP}/'",
        js_text
    )

    # 3. Replace any residual external domains
    replacements = [
        ("https://game1.heroeslegends.web.id", TARGET_HTTP),
        ("http://game1.heroeslegends.web.id", TARGET_HTTP),
        ("game1.heroeslegends.web.id", TARGET_DOMAIN),
        ("https://update.heroeslegends.web.id", TARGET_HTTP),
        ("update.heroeslegends.web.id", TARGET_DOMAIN),
        ("https://heroeslegends.web.id/", f"{TARGET_HTTP}/"),
        ("http://heroeslegends.web.id/", f"{TARGET_HTTP}/"),
        ("https://heroeslegends.web.id", TARGET_HTTP),
        ("http://heroeslegends.web.id", TARGET_HTTP),
        ("https://kageherostudio.com/forgetpass/", f"{TARGET_HTTP}/login"),
        ("https://kageherostudio.com/forgetpass", f"{TARGET_HTTP}/login"),
        ("ws://games999.kageherostudio.com:6998/nadsocket", f"ws://{TARGET_DOMAIN}:{TARGET_WS_PORT}/nadsocket"),
        ("http://198.11.180.180:9001/", f"{TARGET_HTTP}/"),
        ("http://central.kageherostudio.com:80/", f"{TARGET_HTTP}/"),
        ("http://central.redgamestudio.com:9001/", f"{TARGET_HTTP}/"),
        ("http://ninjaheroesmobile.com", TARGET_HTTP),
        ("http://static.dreamjelly.com:8082/", f"{TARGET_HTTP}/"),
        ("http://static.ninjawar.dreamjelly.com:9000/", f"{TARGET_HTTP}/"),
        ("http://static.rzhd.dreamjelly.com:8082/", f"{TARGET_HTTP}/"),
        ("https://kageherostudio.com/costume/server_.php?fbid=", f"{TARGET_HTTP}/game/costume?fbid="),
        ("https://kageherostudio.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://redgamestudio.com/ninjaheroespayment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://redgamestudio.com/transfer/", f"{TARGET_HTTP}/"),
        ("https://www.ninjaheroesnewera.com/redirectfb", f"{TARGET_HTTP}/"),
        ("https://www.redgamestudio.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://www.studioninjafighter.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://www.studioninjafighter.com/redirectfb", f"{TARGET_HTTP}/"),
    ]
    for old, new in replacements:
        js_text = js_text.replace(old, new)

    if add_openurl_hook and "__nhOpenUrlDigislams" not in js_text:
        hook = (
            '\n;(function(){try{if(typeof cc!=="undefined"&&cc.Application&&cc.Application.getInstance){'
            'var _a=cc.Application.getInstance();if(_a&&_a.openURL&&!_a.__nhOpenUrlDigislams){'
            '_a.__nhOpenUrlDigislams=true;var _o=_a.openURL;_a.openURL=function(u){'
            'if(typeof u==="string"){u=u.replace(/https?:\\/\\/([a-z0-9-]+\\.)*(?:heroeslegends\\.web\\.id|kageherostudio\\.com|redgamestudio\\.com|ninjaheroesnewera\\.com|studioninjafighter\\.com)(\\/[^\\s]*)?/gi,"'
            + TARGET_HTTP +
            '");}return _o.call(this,u);};}}}catch(e){}})();\n'
        )
        js_text += hook

    return js_text


def patch_recovered_runtime_text(js_text: str) -> str:
    replacements = [
        ("ws://games999.kageherostudio.com:6998/nadsocket", f"ws://{TARGET_DOMAIN}:{TARGET_WS_PORT}/nadsocket"),
        ("http://198.11.180.180:9001/", f"{TARGET_HTTP}/"),
        ("http://central.kageherostudio.com:80/", f"{TARGET_HTTP}/"),
        ("http://central.redgamestudio.com:9001/", f"{TARGET_HTTP}/"),
        ("http://ninjaheroesmobile.com", TARGET_HTTP),
        ("http://static.dreamjelly.com:8082/", f"{TARGET_HTTP}/"),
        ("http://static.ninjawar.dreamjelly.com:9000/", f"{TARGET_HTTP}/"),
        ("http://static.rzhd.dreamjelly.com:8082/", f"{TARGET_HTTP}/"),
        ("https://kageherostudio.com/costume/server_.php?fbid=", f"{TARGET_HTTP}/game/costume?fbid="),
        ("https://kageherostudio.com/forgetpass/", f"{TARGET_HTTP}/login"),
        ("https://kageherostudio.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://redgamestudio.com/ninjaheroespayment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://redgamestudio.com/transfer/", f"{TARGET_HTTP}/"),
        ("https://www.ninjaheroesnewera.com/redirectfb", f"{TARGET_HTTP}/"),
        ("https://www.redgamestudio.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://www.studioninjafighter.com/payment/server_.php?fbid=", f"{TARGET_HTTP}/game/payment?fbid="),
        ("https://www.studioninjafighter.com/redirectfb", f"{TARGET_HTTP}/"),
        ('"http://games1."', f'"{TARGET_HTTP}/"'),
        ('"http://games998."', f'"{TARGET_HTTP}/"'),
        ('"kageherostudio.com"', f'"{TARGET_DOMAIN}"'),
        ('"studioninjafighter.com"', f'"{TARGET_DOMAIN}"'),
    ]
    for old, new in replacements:
        js_text = js_text.replace(old, new)
    return js_text


def check_js_syntax(js_bytes: bytes, label: str):
    os.makedirs(WORK_DIR, exist_ok=True)
    tmp_js = os.path.join(WORK_DIR, "syntax_check.js")
    with open(tmp_js, "wb") as f:
        f.write(js_bytes)
    subprocess.run(["node", "--check", tmp_js], check=True)
    os.remove(tmp_js)
    print(f"  [OK] JS syntax verified: {label} ({len(js_bytes)} bytes)")


def patch_libcocos2djs_so(so_bytes: bytes) -> bytes:
    orig_len = len(so_bytes)
    buf = bytearray(so_bytes)

    def replace_c_string(old_bytes: bytes, new_bytes: bytes):
        assert len(new_bytes) <= len(old_bytes), f"Replacement longer than original: {new_bytes} > {old_bytes}"
        padded = new_bytes + (b"\x00" * (len(old_bytes) - len(new_bytes)))
        count = 0
        start = 0
        while True:
            idx = buf.find(old_bytes + b"\x00", start)
            if idx == -1:
                break
            # Verify preceding byte is \x00 so we never clobber a suffix of a longer string
            if idx == 0 or buf[idx - 1] == 0:
                buf[idx:idx + len(old_bytes)] = padded
                count += 1
            start = idx + len(old_bytes) + 1
        return count

    total_hits = 0
    total_hits += replace_c_string(b"https://heroeslegends.web.id/", f"{TARGET_HTTP}/".encode())
    total_hits += replace_c_string(b"https://heroeslegends.web.id/heroes/mobilegame.jpg", f"{TARGET_HTTP}/images/mobilegame.jpg".encode())
    total_hits += replace_c_string(
        b"central.redgamestudio.com:9001/game/isUpdateLytoByChannel?channelID=99104&sign=0",
        f"{TARGET_DOMAIN}/game/isUpdateLytoByChannel?channelID=99104&sign=0".encode()
    )
    total_hits += replace_c_string(
        b"central.redgamestudio.com:9001/game/isUpdateLytoByChannel?channelID=99066&sign=0",
        f"{TARGET_DOMAIN}/game/isUpdateLytoByChannel?channelID=99066&sign=0".encode()
    )
    total_hits += replace_c_string(b"https://redgamestudio.com/landing/", f"{TARGET_HTTP}/".encode())
    total_hits += replace_c_string(b"http://mobilegameupdate.net/landing/", f"{TARGET_HTTP}/".encode())

    # Replace all external banner JPG URLs in .rodata
    for m in list(re.finditer(rb"https?://(?:redgamestudio\.com|mobilegameupdate\.net)/images/[a-zA-Z0-9_/\-]+/[\w]+\.jpg\x00", bytes(buf))):
        old_s = m.group(0)[:-1]
        total_hits += replace_c_string(old_s, f"{TARGET_HTTP}/images/mobilegame.jpg".encode())

    assert len(buf) == orig_len, "libcocos2djs.so size changed!"
    assert b"heroeslegends.web.id" not in buf, "Residual heroeslegends.web.id in libcocos2djs.so!"
    assert b"redgamestudio.com" not in buf, "Residual redgamestudio.com in libcocos2djs.so!"
    assert b"mobilegameupdate.net" not in buf, "Residual mobilegameupdate.net in libcocos2djs.so!"
    print(f"  [OK] Patched {total_hits} native C strings in libcocos2djs.so (size preserved: {len(buf)} bytes)")
    return bytes(buf)


def build_patched_classes_dex(orig_dex_bytes: bytes) -> bytes:
    out_dex = os.path.join(WORK_DIR, "classes_patched.dex")
    if os.path.exists(out_dex):
        dex_cached = open(out_dex, "rb").read()
        if b"heroeslegends.web.id" not in dex_cached and b"redgamestudio.com" not in dex_cached and b"nh.digislams.my.id" in dex_cached:
            print(f"  [OK] Reused verified classes_patched.dex ({len(dex_cached)} bytes)")
            return dex_cached
    smali_dir = os.path.join(WORK_DIR, "smali_clean")
    if os.path.exists(smali_dir):
        shutil.rmtree(smali_dir)
    os.makedirs(WORK_DIR, exist_ok=True)
    in_dex = os.path.join(WORK_DIR, "classes_orig.dex")
    out_dex = os.path.join(WORK_DIR, "classes_patched.dex")
    with open(in_dex, "wb") as f:
        f.write(orig_dex_bytes)

    subprocess.run(["java", "-jar", BAKSMALI_JAR, "d", in_dex, "-o", smali_dir], check=True)

    # 1. DataActivity.smali fallback manifest URL
    da_path = os.path.join(smali_dir, "com", "nh", "data", "DataActivity.smali")
    da_txt = open(da_path, encoding="utf-8").read()
    assert "https://game1.heroeslegends.web.id/gamedata/manifest.json" in da_txt
    da_txt = da_txt.replace(
        "https://game1.heroeslegends.web.id/gamedata/manifest.json",
        f"{TARGET_HTTP}/gamedata/manifest.json"
    )
    open(da_path, "w", encoding="utf-8").write(da_txt)

    # 2. MyWebView$1.smali
    mw_path = os.path.join(smali_dir, "com", "tips", "learning", "colors", "MyWebView$1.smali")
    mw_txt = open(mw_path, encoding="utf-8").read()
    mw_txt = mw_txt.replace("http://redgamestudio.com/apps?t=", f"{TARGET_HTTP}/?t=")
    open(mw_path, "w", encoding="utf-8").write(mw_txt)

    # 3. MyGame.smali & ChannelCall.smali Facebook share link -> nh.digislams.my.id
    for fn in ["MyGame.smali", "ChannelCall.smali"]:
        fp = os.path.join(smali_dir, "com", "tips", "learning", "colors", fn)
        txt = open(fp, encoding="utf-8").read()
        txt = txt.replace("https://www.facebook.com/NinjaHeroesMobile", f"{TARGET_HTTP}/")
        open(fp, "w", encoding="utf-8").write(txt)

    # 4. Redirect any external non-digislams URL inside ChannelCall.openURL(String) and NativeCall.toUpdateClient(String)
    url_rewrite_smali = (
        f'    const-string v0, "{TARGET_DOMAIN}"\n'
        '    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z\n'
        '    move-result v0\n'
        '    if-nez v0, :cond_nh_ok\n'
        f'    const-string p0, "{TARGET_HTTP}/"\n'
        '    :cond_nh_ok\n'
    )

    for fn, method_hdr in [
        ("ChannelCall.smali", ".method public static openURL(Ljava/lang/String;)V"),
        ("NativeCall.smali", ".method public static toUpdateClient(Ljava/lang/String;)V"),
    ]:
        fp = os.path.join(smali_dir, "com", "tips", "learning", "colors", fn)
        txt = open(fp, encoding="utf-8").read()
        assert method_hdr in txt, f"Missing {method_hdr} in {fn}"
        idx = txt.index(method_hdr)
        end_idx = txt.index(".end method", idx)
        method_body = txt[idx:end_idx]
        target_line = "    new-instance v0, Landroid/content/Intent;"
        assert target_line in method_body
        patched_body = method_body.replace(target_line, url_rewrite_smali + target_line, 1)
        txt = txt[:idx] + patched_body + txt[end_idx:]
        open(fp, "w", encoding="utf-8").write(txt)

    subprocess.run(["java", "-jar", SMALI_JAR, "a", smali_dir, "-o", out_dex], check=True)
    dex_out_bytes = open(out_dex, "rb").read()
    assert b"heroeslegends.web.id" not in dex_out_bytes, "Residual heroeslegends.web.id in classes.dex!"
    assert b"redgamestudio.com" not in dex_out_bytes, "Residual redgamestudio.com in classes.dex!"
    print(f"  [OK] Assembled patched classes.dex ({len(dex_out_bytes)} bytes)")
    return dex_out_bytes


def sync_ota_and_manifests():
    print("=== [1/4] Patching OTA UI/backend-adapter.js & Building 2,980-File Manifest ===")
    ota_ba_path = os.path.join(EMU_REL_DIR, "UI", "backend-adapter.js")
    assert os.path.exists(ota_ba_path), f"Missing {ota_ba_path}"

    ota_ba_txt = open(ota_ba_path, "r", encoding="utf-8").read()
    patched_ota_ba = patch_adapter_js_text(ota_ba_txt, add_openurl_hook=True)
    ota_ba_bytes = patched_ota_ba.encode("utf-8")
    check_js_syntax(ota_ba_bytes, "OTA UI/backend-adapter.js")
    with open(ota_ba_path, "wb") as f:
        f.write(ota_ba_bytes)

    # Also update gamedata/files/UI/backend-adapter.js if present
    gd_ba = os.path.join(PROJ_DIR, "gamedata", "files", "UI", "backend-adapter.js")
    if os.path.exists(gd_ba):
        gd_txt = open(gd_ba, "r", encoding="utf-8").read()
        gd_patched = patch_adapter_js_text(gd_txt, add_openurl_hook=True).encode("utf-8")
        check_js_syntax(gd_patched, "gamedata/files/UI/backend-adapter.js")
        open(gd_ba, "wb").write(gd_patched)

    # Reuse verified SHA-256 cache from installed.json for unmodified static binary assets, always rehashing .js/.json
    cached_hashes = {}
    inst_json = os.path.join(EMU_OTA_DIR, "installed.json")
    if os.path.exists(inst_json):
        try:
            for item in json.load(open(inst_json, encoding="utf-8")).get("files", []):
                cached_hashes[item["p"]] = (item["s"], item["h"])
        except Exception:
            pass

    manifest_files = []
    total_bytes = 0
    for root, dirs, files in os.walk(EMU_REL_DIR):
        dirs.sort()
        for fn in sorted(files):
            fp = os.path.join(root, fn)
            rel_p = os.path.relpath(fp, EMU_REL_DIR).replace("\\", "/")
            sz = os.path.getsize(fp)
            if not rel_p.endswith((".js", ".json")) and rel_p in cached_hashes and cached_hashes[rel_p][0] == sz:
                sha = cached_hashes[rel_p][1]
            else:
                sha = hashlib.sha256(open(fp, "rb").read()).hexdigest()
            manifest_files.append({"p": rel_p, "s": sz, "h": sha})
            total_bytes += sz

    manifest_files.sort(key=lambda x: x["p"])
    manifest_obj = {
        "version": MANIFEST_VERSION,
        "name": f"nh-{MANIFEST_VERSION}",
        "base": f"{TARGET_HTTP}/gamedata_emu/nh-ota/releases/1.0.0/",
        "files": manifest_files,
    }
    manifest_bytes = json.dumps(manifest_obj, separators=(",", ":")).encode("utf-8")

    for dst in [
        os.path.join(PROJ_DIR, "public", "gamedata", "manifest.json"),
        os.path.join(PROJ_DIR, "public", "ninja", "gamedata", "manifest.json"),
        os.path.join(EMU_OTA_DIR, "installed.json"),
        os.path.join(PROJ_DIR, "gamedata", "manifest.json"),
    ]:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as f:
            f.write(manifest_bytes)
        print(f"  [OK] Wrote manifest ({len(manifest_files)} files, {total_bytes / 1024 / 1024:.2f} MB) -> {os.path.relpath(dst, PROJ_DIR)}")


def build_fallback_table_stub(table_name: str, ota_table_path: str, orig_stub_text: str) -> bytes:
    ota_txt = open(ota_table_path, "r", encoding="utf-8").read()
    m = re.search(r'(__NH_GAME_DATA\["' + re.escape(table_name) + r'"\]\s*=\s*\[.*\])\s*;?', ota_txt, re.S)
    assert m, f"Could not parse OTA table array in {ota_table_path}"
    populated_assign = m.group(1) + ";"
    target_empty = f'__NH_GAME_DATA["{table_name}"] = [];'
    assert target_empty in orig_stub_text, f"Unexpected stub format in assets/UI/tables/{table_name}.js"
    combined = orig_stub_text.replace(target_empty, populated_assign, 1)
    return combined.encode("utf-8")


def patch_and_sign_apk():
    print("\n=== [2/4] Patching DEX, Native .so, Configs, Runtime JS & 43 Core Tables in HERO LEGEND ORI.apk ===")
    os.makedirs(WORK_DIR, exist_ok=True)
    unsigned_apk = os.path.join(WORK_DIR, "unsigned_patched.apk")
    aligned_apk = os.path.join(WORK_DIR, "aligned_patched.apk")

    with zipfile.ZipFile(SRC_APK, "r") as zin:
        patched_dex = build_patched_classes_dex(zin.read("classes.dex"))
        patched_so = patch_libcocos2djs_so(zin.read("lib/arm64-v8a/libcocos2djs.so"))

        # Patch JS files and verify syntax
        ba_apk_bytes = patch_adapter_js_text(
            zin.read("assets/UI/backend-adapter.apk.js").decode("utf-8"), add_openurl_hook=True
        ).encode("utf-8")
        check_js_syntax(ba_apk_bytes, "assets/UI/backend-adapter.apk.js")

        tba_apk_bytes = patch_adapter_js_text(
            zin.read("assets/UI/tables/backend-adapter.js").decode("utf-8"), add_openurl_hook=True
        ).encode("utf-8")
        check_js_syntax(tba_apk_bytes, "assets/UI/tables/backend-adapter.js")

        rr_bytes = patch_recovered_runtime_text(
            zin.read("assets/UI/recovered-runtime.js").decode("utf-8")
        ).encode("utf-8")
        check_js_syntax(rr_bytes, "assets/UI/recovered-runtime.js")

        version_bytes = json.dumps({
            "v": "1.1.3",
            "c": TARGET_DOMAIN,
            "s": TARGET_DOMAIN,
            "ch": "108",
            "d": "false"
        }).encode("utf-8")

        nh_data_cfg_bytes = json.dumps({
            "manifest": f"{TARGET_HTTP}/gamedata/manifest.json"
        }, indent=2).encode("utf-8") + b"\n"

        embedded_tables = 0
        with zipfile.ZipFile(unsigned_apk, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
            for item in zin.infolist():
                fn = item.filename
                if fn.startswith("META-INF/"):
                    continue

                raw = zin.read(fn)
                comp_type = zipfile.ZIP_STORED if fn == "resources.arsc" else zipfile.ZIP_DEFLATED

                if fn == "classes.dex":
                    raw = patched_dex
                elif fn == "lib/arm64-v8a/libcocos2djs.so":
                    raw = patched_so
                elif fn == "assets/VERSION":
                    raw = version_bytes
                elif fn == "assets/nh_data_config.json":
                    raw = nh_data_cfg_bytes
                elif fn == "assets/UI/backend-adapter.apk.js":
                    raw = ba_apk_bytes
                elif fn == "assets/UI/tables/backend-adapter.js":
                    raw = tba_apk_bytes
                elif fn == "assets/UI/recovered-runtime.js":
                    raw = rr_bytes
                elif fn.startswith("assets/UI/tables/") and fn.endswith(".js") and fn != "assets/UI/tables/backend-adapter.js":
                    t_name = os.path.splitext(os.path.basename(fn))[0]
                    ota_tbl = os.path.join(EMU_REL_DIR, "UI", "tables", f"{t_name}.js")
                    if os.path.exists(ota_tbl):
                        raw = build_fallback_table_stub(t_name, ota_tbl, raw.decode("utf-8"))
                        embedded_tables += 1

                new_info = zipfile.ZipInfo(filename=fn, date_time=item.date_time)
                new_info.compress_type = comp_type
                new_info.external_attr = item.external_attr
                new_info.create_system = item.create_system
                zout.writestr(new_info, raw)

        print(f"  [OK] Embedded {embedded_tables} populated fallback tables into APK assets/UI/tables/*.js")

    print("\n=== [3/4] Running 4-Byte ZipAlign & Dual Signing (v1 + v2) ===")
    cands_za = glob.glob(r"C:\Users\Administrator\AppData\Local\Android\Sdk\build-tools\*\zipalign.exe")
    cands_as = glob.glob(r"C:\Users\Administrator\AppData\Local\Android\Sdk\build-tools\*\apksigner.bat")
    assert cands_za and cands_as, "Android SDK build-tools (zipalign/apksigner) not found!"
    zipalign = sorted(cands_za)[-1]
    apksigner = sorted(cands_as)[-1]
    keystore = os.path.join(PROJ_DIR, "debug.keystore")
    if not os.path.exists(keystore):
        keystore = os.path.expanduser("~/.android/debug.keystore")

    if os.path.exists(aligned_apk):
        os.remove(aligned_apk)
    subprocess.run([zipalign, "-f", "-p", "4", unsigned_apk, aligned_apk], check=True)

    os.makedirs(os.path.dirname(OUT_PUBLIC_APK), exist_ok=True)
    subprocess.run([
        apksigner, "sign",
        "--ks", keystore,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        "--out", OUT_PUBLIC_APK,
        aligned_apk
    ], check=True)

    subprocess.run([apksigner, "verify", "--verbose", OUT_PUBLIC_APK], check=True)
    shutil.copy2(OUT_PUBLIC_APK, OUT_ROOT_APK)
    idsig_pub = OUT_PUBLIC_APK + ".idsig"
    if os.path.exists(idsig_pub):
        shutil.copy2(idsig_pub, OUT_ROOT_APK + ".idsig")

    os.remove(unsigned_apk)
    os.remove(aligned_apk)
    print(f"  [OK] Signed APK written to {OUT_PUBLIC_APK} & {OUT_ROOT_APK} ({os.path.getsize(OUT_ROOT_APK) / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    sync_ota_and_manifests()
    patch_and_sign_apk()
    print("\n=== [4/4] ALL PATCHING, MANIFEST GENERATION & SIGNING COMPLETED SUCCESSFULLY! ===")

