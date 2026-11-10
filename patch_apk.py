import zipfile, subprocess, os, shutil

# 1. Read existing main.js from APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    ui_main = zin.read('assets/UI/main.js').decode('utf-8', errors='ignore')

# Remove any previous role guard if present
if '// 2e. Safeguard Config.roleObject' in ui_main:
    start_idx = ui_main.find('    // 2e. Safeguard Config.roleObject')
    end_idx = ui_main.find('    // 2b. Neutralize TalkingData')
    ui_main = ui_main[:start_idx] + ui_main[end_idx:]

hook_marker = '// 2b. Neutralize TalkingData analytics & AppsFlyer native JNI bridges immediately'
assert hook_marker in ui_main, 'Hook marker not found in assets/UI/main.js!'

role_guard_code = '''    // 2e. Safeguard Config.roleObject, GameUserInfor, GameData, ArmatureTools against missing/custom ninjas
    try {
        var _polyFillAllRoles = function(ro) {
            if (!ro || typeof ro !== "object") return;
            var base = ro[17] || ro[9] || ro[1];
            if (!base) {
                for (var k in ro) {
                    if (ro.hasOwnProperty(k) && ro[k] && ro[k].xmlfile) {
                        base = ro[k];
                        break;
                    }
                }
            }
            if (!base) return;

            if (ro.__nhRolesGuarded && ro[193] && ro[108]) return;
            ro.__nhRolesGuarded = true;

            for (var nid = 0; nid <= 1000; nid++) {
                if (!ro[nid]) {
                    var clone = {};
                    for (var prop in base) {
                        if (base.hasOwnProperty(prop)) {
                            clone[prop] = base[prop];
                        }
                    }
                    clone.id = nid;
                    clone.alt = "Shinobi " + nid;
                    clone.name = "Shinobi " + nid;
                    clone.xmlfile = base.xmlfile || "mingren";
                    clone.quality = 5;
                    clone.chakra = [1];
                    clone.speed = 100;
                    clone.hp = 1000;
                    clone.attack = 100;
                    clone.def = 50;
                    ro[nid] = clone;
                } else if (!ro[nid].xmlfile) {
                    ro[nid].xmlfile = base.xmlfile || "mingren";
                }
            }

            ro[undefined] = ro[17] || base;
            ro["undefined"] = ro[17] || base;
            ro[null] = ro[17] || base;
            ro["null"] = ro[17] || base;
            ro[0] = ro[17] || base;
            ro["0"] = ro[17] || base;
            ro[""] = ro[17] || base;
            ro[NaN] = ro[17] || base;
            ro["NaN"] = ro[17] || base;

            if (typeof cc !== "undefined" && cc.log) {
                cc.log("[NH Safeguard] Successfully polyfilled roleObject (0..1000) with authentic armatures");
            }
        };

        if (typeof Config !== "undefined") {
            if (Config.getInstance) {
                var _origConfigGetInstance = Config.getInstance;
                var _inConfigCall = false;
                Config.getInstance = function () {
                    if (_inConfigCall) {
                        return _origConfigGetInstance.apply(this, arguments);
                    }
                    _inConfigCall = true;
                    try {
                        var inst = _origConfigGetInstance.apply(this, arguments);
                        if (inst && inst.roleObject) {
                            _polyFillAllRoles(inst.roleObject);
                        }
                        return inst;
                    } finally {
                        _inConfigCall = false;
                    }
                };
            }
            if (Config.prototype && Config.prototype.processRole) {
                var _origProcessRole = Config.prototype.processRole;
                Config.prototype.processRole = function () {
                    var res = _origProcessRole.apply(this, arguments);
                    try {
                        if (this.roleObject) {
                            _polyFillAllRoles(this.roleObject);
                        }
                    } catch(ePR) {}
                    return res;
                };
            }
        }

        if (typeof GameUserInfor !== "undefined" && GameUserInfor.prototype) {
            if (GameUserInfor.prototype.setImage) {
                var _origSetImage = GameUserInfor.prototype.setImage;
                GameUserInfor.prototype.setImage = function () {
                    try {
                        var cfg = typeof Config !== "undefined" && Config.getInstance ? Config.getInstance() : null;
                        if (cfg && cfg.roleObject) {
                            _polyFillAllRoles(cfg.roleObject);
                        }
                        if (this.roleList && Array.isArray(this.roleList)) {
                            for (var i = 0; i < this.roleList.length; i++) {
                                var f = this.roleList[i];
                                if (f && (!f.id || (cfg && cfg.roleObject && !cfg.roleObject[f.id]))) {
                                    f.id = 17;
                                }
                            }
                        }
                    } catch (ePreImg) {}
                    try {
                        return _origSetImage.apply(this, arguments);
                    } catch (errSetImage) {
                        if (typeof cc !== "undefined" && cc.log) {
                            cc.log("[NH Guard] Intercepted GameUserInfor.setImage: " + errSetImage);
                        }
                    }
                };
            }
            if (GameUserInfor.prototype.setImageRefresh) {
                var _origSetImageRefresh = GameUserInfor.prototype.setImageRefresh;
                GameUserInfor.prototype.setImageRefresh = function () {
                    try {
                        var cfg = typeof Config !== "undefined" && Config.getInstance ? Config.getInstance() : null;
                        if (cfg && cfg.roleObject) {
                            _polyFillAllRoles(cfg.roleObject);
                        }
                        if (this.roleList && Array.isArray(this.roleList)) {
                            for (var i = 0; i < this.roleList.length; i++) {
                                var f = this.roleList[i];
                                if (f && (!f.id || (cfg && cfg.roleObject && !cfg.roleObject[f.id]))) {
                                    f.id = 17;
                                }
                            }
                        }
                    } catch (ePreRef) {}
                    try {
                        return _origSetImageRefresh.apply(this, arguments);
                    } catch (errRef) {
                        if (typeof cc !== "undefined" && cc.log) {
                            cc.log("[NH Guard] Intercepted GameUserInfor.setImageRefresh: " + errRef);
                        }
                    }
                };
            }
        }

        if (typeof GameData !== "undefined" && GameData.prototype && GameData.prototype.getFighters) {
            var _origGetFighters = GameData.prototype.getFighters;
            GameData.prototype.getFighters = function () {
                var list = _origGetFighters.apply(this, arguments);
                try {
                    var cfg = typeof Config !== "undefined" && Config.getInstance ? Config.getInstance() : null;
                    if (cfg && cfg.roleObject) {
                        _polyFillAllRoles(cfg.roleObject);
                    }
                    if (Array.isArray(list)) {
                        for (var i = 0; i < list.length; i++) {
                            var f = list[i];
                            if (f && (!f.id || (cfg && cfg.roleObject && !cfg.roleObject[f.id]))) {
                                f.id = 17;
                            }
                        }
                    }
                } catch(eGF) {}
                return list;
            };
        }

        if (typeof ArmatureTools !== "undefined") {
            if (ArmatureTools.roleArmatureLoad) {
                var _origRoleArmatureLoad = ArmatureTools.roleArmatureLoad;
                var _inArmLoad = false;
                ArmatureTools.roleArmatureLoad = function (id) {
                    if (_inArmLoad) {
                        return _origRoleArmatureLoad.apply(this, arguments);
                    }
                    _inArmLoad = true;
                    try {
                        var res = _origRoleArmatureLoad.apply(this, arguments);
                        if (res) return res;
                    } catch(e) {}
                    finally {
                        _inArmLoad = false;
                    }
                    try {
                        _inArmLoad = true;
                        return _origRoleArmatureLoad.call(this, 17) || _origRoleArmatureLoad.call(this, 9);
                    } catch(e2) {
                        return null;
                    } finally {
                        _inArmLoad = false;
                    }
                };
            }
            if (ArmatureTools.roleArmature) {
                var _origRoleArmature = ArmatureTools.roleArmature;
                var _inArmRole = false;
                ArmatureTools.roleArmature = function (id, cos) {
                    if (_inArmRole) {
                        return _origRoleArmature.apply(this, arguments);
                    }
                    _inArmRole = true;
                    try {
                        var res = _origRoleArmature.apply(this, arguments);
                        if (res) return res;
                    } catch(e) {}
                    finally {
                        _inArmRole = false;
                    }
                    try {
                        _inArmRole = true;
                        return _origRoleArmature.call(this, 17, 0) || _origRoleArmature.call(this, 9, 0);
                    } catch(e2) {
                        return null;
                    } finally {
                        _inArmRole = false;
                    }
                };
            }
        }
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }

'''

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '    ' + hook_marker)

# Repack APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename == 'assets/UI/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            elif item.filename == 'assets/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            else:
                zout.writestr(item, zin.read(item.filename))

build_tools = r'C:\Users\Administrator\AppData\Local\Android\Sdk\build-tools\34.0.0'
apksigner = os.path.join(build_tools, 'apksigner.bat')
zipalign = os.path.join(build_tools, 'zipalign.exe')
keystore = os.path.expanduser('~/.android/debug.keystore')

if os.path.exists('aligned.apk'): os.remove('aligned.apk')
subprocess.run(f'"{zipalign}" -v -p 4 temp_repack.apk aligned.apk', shell=True, check=True, stdout=subprocess.DEVNULL)
subprocess.run(f'"{apksigner}" sign --ks "{keystore}" --ks-pass pass:android --key-pass pass:android --out OkkaNHNE-Private.apk aligned.apk', shell=True, check=True)

if os.path.exists('temp_repack.apk'): os.remove('temp_repack.apk')
if os.path.exists('aligned.apk'): os.remove('aligned.apk')

shutil.copy2('OkkaNHNE-Private.apk', 'OkkaNHNE-Private.zip')
os.makedirs('public/download', exist_ok=True)
shutil.copy2('OkkaNHNE-Private.apk', 'public/download/OkkaNHNE-Private.apk')
print('[+] Repacked, aligned, and signed OkkaNHNE-Private.apk and updated zip and public/download successfully!')
